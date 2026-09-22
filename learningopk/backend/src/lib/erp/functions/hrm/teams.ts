/**
 * Team Functions
 */

import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../../db/index.js";
import { erpEmployees, erpTeams, erpTeamMembers } from "../../../db/schema/erp/hrm.js";
import {
  registerHrmFunction,
  type HrmFunctionContext,
  type PaginationParams,
  type PaginatedResult,
  HrmError,
  normalizePagination,
} from "./types.js";

// ============================================================================
// Schemas & Types
// ============================================================================

export const teamBodySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(600).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
});

export const teamMembersBodySchema = z.object({
  members: z
    .array(
      z.object({
        employeeId: z.number().int().positive(),
        isManager: z.boolean().optional(),
      })
    )
    .max(200),
});

export type TeamInput = z.infer<typeof teamBodySchema>;
export type TeamMemberInput = z.infer<typeof teamMembersBodySchema>["members"][0];

export interface Team {
  id: number;
  schoolId: number;
  name: string;
  description: string | null;
  color: string | null;
  createdAt: Date;
}

export interface TeamWithMembers extends Team {
  members: TeamMember[];
}

export interface TeamMember {
  employeeId: number;
  isManager: boolean;
  name: string;
  employeeCode: string;
}

// ============================================================================
// Helpers
// ============================================================================

function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}

// ============================================================================
// Functions
// ============================================================================

async function listTeams(
  context: HrmFunctionContext,
  params: PaginationParams
): Promise<{ teams: TeamWithMembers[] }> {
  const teamRows = await db
    .select()
    .from(erpTeams)
    .where(eq(erpTeams.schoolId, context.schoolId))
    .orderBy(asc(erpTeams.name));

  const memberRows =
    teamRows.length > 0
      ? await db
          .select({
            teamId: erpTeamMembers.teamId,
            employeeId: erpTeamMembers.employeeId,
            isManager: erpTeamMembers.isManager,
            firstName: erpEmployees.firstName,
            lastName: erpEmployees.lastName,
            employeeCode: erpEmployees.employeeCode,
          })
          .from(erpTeamMembers)
          .innerJoin(
            erpEmployees,
            and(
              eq(erpEmployees.id, erpTeamMembers.employeeId),
              eq(erpEmployees.schoolId, context.schoolId)
            )
          )
          .where(eq(erpTeamMembers.schoolId, context.schoolId))
      : [];

  const teams = teamRows.map((team) => ({
    ...team,
    members: memberRows
      .filter((member) => member.teamId === team.id)
      .map((member) => ({
        employeeId: member.employeeId,
        isManager: member.isManager,
        name: fullName(member.firstName, member.lastName),
        employeeCode: member.employeeCode,
      })),
  }));

  return { teams };
}

async function createTeam(context: HrmFunctionContext, input: TeamInput): Promise<Team> {
  const parsed = teamBodySchema.safeParse(input);
  if (!parsed.success) {
    throw HrmError.validation("Invalid team", parsed.error.flatten());
  }

  const existing = await db
    .select({ id: erpTeams.id })
    .from(erpTeams)
    .where(and(eq(erpTeams.schoolId, context.schoolId), eq(erpTeams.name, parsed.data.name)))
    .limit(1);
  if (existing[0]) {
    throw HrmError.conflict("Team", "name");
  }

  const inserted = await db
    .insert(erpTeams)
    .values({
      schoolId: context.schoolId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      color: parsed.data.color ?? null,
    })
    .returning();

  const team = inserted[0];
  if (!team) {
    throw HrmError.internal("Failed to create team");
  }

  return team as Team;
}

async function updateTeamMembers(
  context: HrmFunctionContext,
  input: { teamId: number; members: TeamMemberInput[] }
): Promise<{ members: number; updated: true }> {
  const { teamId, members } = input;

  const parsed = teamMembersBodySchema.safeParse({ members });
  if (!parsed.success) {
    throw HrmError.validation("Invalid team members", parsed.error.flatten());
  }

  const teamRows = await db
    .select({ id: erpTeams.id })
    .from(erpTeams)
    .where(and(eq(erpTeams.id, teamId), eq(erpTeams.schoolId, context.schoolId)))
    .limit(1);
  if (!teamRows[0]) {
    throw HrmError.notFound("Team", teamId);
  }

  const employeeIds = [...new Set(members.map((member) => member.employeeId))];
  if (employeeIds.length !== members.length) {
    throw HrmError.validation("Duplicate employee in members");
  }

  if (employeeIds.length > 0) {
    const validEmployees = await db
      .select({ id: erpEmployees.id })
      .from(erpEmployees)
      .where(
        and(eq(erpEmployees.schoolId, context.schoolId), inArray(erpEmployees.id, employeeIds))
      );
    if (validEmployees.length !== employeeIds.length) {
      throw HrmError.notFound("Employee", "Some employees do not exist in this school");
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(erpTeamMembers)
      .where(and(eq(erpTeamMembers.schoolId, context.schoolId), eq(erpTeamMembers.teamId, teamId)));
    if (members.length > 0) {
      await tx.insert(erpTeamMembers).values(
        members.map((member) => ({
          schoolId: context.schoolId,
          teamId,
          employeeId: member.employeeId,
          isManager: member.isManager ?? false,
        }))
      );
    }
  });

  return { members: employeeIds.length, updated: true };
}

async function deleteTeam(
  context: HrmFunctionContext,
  args: { id: number }
): Promise<{ deleted: true }> {
  const deleted = await db
    .delete(erpTeams)
    .where(and(eq(erpTeams.id, args.id), eq(erpTeams.schoolId, context.schoolId)))
    .returning({ id: erpTeams.id });

  if (deleted.length === 0) {
    throw HrmError.notFound("Team", args.id);
  }

  return { deleted: true };
}

// ============================================================================
// Registration
// ============================================================================

registerHrmFunction("listTeams", listTeams, "EMPLOYEES_VIEW", "List all teams with their members");

registerHrmFunction("createTeam", createTeam, "TEAMS_MANAGE", "Create a new team");

registerHrmFunction(
  "updateTeamMembers",
  updateTeamMembers,
  "TEAMS_MANAGE",
  "Update team members (replaces all members)"
);

registerHrmFunction("deleteTeam", deleteTeam, "TEAMS_MANAGE", "Delete a team");
