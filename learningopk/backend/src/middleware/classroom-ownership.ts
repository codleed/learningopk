import type { Request, RequestHandler } from "express";

import { classroomRepository } from "../repositories/classroom.repository.js";
import { errorResponse } from "../lib/response.js";
import { requireTeacherRole, type AuthenticatedRequest } from "../lib/session.js";

type ClassroomRow = NonNullable<Awaited<ReturnType<typeof classroomRepository.getClassroomById>>>;
type AssignmentRow = NonNullable<Awaited<ReturnType<typeof classroomRepository.getAssignmentById>>>;

/** Request enriched by the ownership middleware once access is verified. */
export type ClassroomOwnedRequest = AuthenticatedRequest & {
  classroom: ClassroomRow;
};

export type AssignmentOwnedRequest = ClassroomOwnedRequest & {
  assignment: AssignmentRow;
};

/** Extracts the classroom id from the request (typically a route param). */
export type ClassroomIdResolver = (req: Request) => number;

type RequireClassroomOwnershipOptions = {
  /** Error message used when the resolved id is not a number (default "Invalid classroom ID"). */
  invalidIdMessage?: string;
};

const parseIdParam = (value: unknown): number =>
  typeof value === "string" ? parseInt(value, 10) : NaN;

/** Builds a resolver over a numeric route param (e.g. "id", "classroomId"). */
export const classroomIdParam =
  (param: string): ClassroomIdResolver =>
  (req) =>
    parseIdParam(req.params[param]);

/**
 * Loads the classroom and enforces teacher ownership, attaching it to the
 * request as `classroom`. Responds 403 and returns false when access is denied.
 */
const verifyClassroomOwnership = async (
  req: Request,
  res: Parameters<RequestHandler>[1],
  classroomId: number
): Promise<boolean> => {
  const authedReq = req as AuthenticatedRequest;
  const classroom = await classroomRepository.getClassroomById(classroomId);
  if (!classroom || classroom.teacherId !== authedReq.session.user.id) {
    res.status(403).json(errorResponse("Not your classroom", "FORBIDDEN"));
    return false;
  }
  (authedReq as ClassroomOwnedRequest).classroom = classroom;
  return true;
};

/**
 * Gate for routes addressed directly by a classroom id
 * (`/classrooms/:id/...`, `/ai/.../:classroomId`).
 *
 * Order of checks (preserved from the original inline blocks):
 * teacher role → parse id → load classroom → 403 when not the owner.
 */
export const requireClassroomOwnership =
  (
    resolveId: ClassroomIdResolver,
    options: RequireClassroomOwnershipOptions = {}
  ): RequestHandler =>
  async (req, res, next) => {
    const authedReq = req as AuthenticatedRequest;
    if (!(await requireTeacherRole(authedReq, res))) return;

    const classroomId = resolveId(req);
    if (isNaN(classroomId)) {
      res
        .status(400)
        .json(
          errorResponse(options.invalidIdMessage ?? "Invalid classroom ID", "VALIDATION_ERROR")
        );
      return;
    }

    if (!(await verifyClassroomOwnership(req, res, classroomId))) return;
    next();
  };

/**
 * Gate for `/assignments/:id/...` routes: resolves the owning classroom
 * through the assignment. Order of checks: teacher role → parse assignment
 * id → 404 unknown assignment → load classroom → 403 when not the owner.
 */
export const requireAssignmentClassroomOwnership =
  (assignmentIdParam = "id"): RequestHandler =>
  async (req, res, next) => {
    const authedReq = req as AuthenticatedRequest;
    if (!(await requireTeacherRole(authedReq, res))) return;

    const assignmentId = parseIdParam(req.params[assignmentIdParam]);
    if (isNaN(assignmentId)) {
      res.status(400).json(errorResponse("Invalid assignment ID", "VALIDATION_ERROR"));
      return;
    }

    const assignment = await classroomRepository.getAssignmentById(assignmentId);
    if (!assignment) {
      res.status(404).json(errorResponse("Assignment not found", "NOT_FOUND"));
      return;
    }

    if (!(await verifyClassroomOwnership(req, res, assignment.classroomId))) return;
    (authedReq as AssignmentOwnedRequest).assignment = assignment;
    next();
  };
