import {
  ERP_PERMISSION_HIERARCHY,
  getModuleLeaves,
  getHierarchyModules,
  type ErpPermission,
  type ErpPermissionModule,
} from "@learningopk/shared";

import { logErpAudit } from "./permissions.js";

/**
 * Permission set membership is the sole authorization decision. TypeSafe
 * hierarchy traversal is advisory metadata for granted permissions only;
 * model output and availability cannot grant or revoke permission.
 */

const ROOT = "ERP_ACCESS";
const BEAM_WIDTH = 3;
const MIN_CONFIDENCE = 0.5;

const TYPESAFE_ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const TYPESAFE_MODEL = "jev-latest";

type ModuleName = ErpPermissionModule;

type HierarchyLeaf = {
  module: ModuleName;
  permission: ErpPermission;
};

type BeamPath = {
  /** Module keys traversed so far, starting below the root. */
  modules: ModuleName[];
  /** Geometric-mean score: product(edge_probs) ** (1 / decisions). */
  score: number;
  /** Product of the per-edge probabilities. */
  probabilityProduct: number;
  /** Number of model decisions taken so far (length-normalizes the score). */
  decisions: number;
};

type ChoiceAnswer = {
  type: string;
  choice?: string;
  probabilities?: Record<string, number>;
  confidence?: number;
};

type SystemOneResponse = {
  model?: string;
  answers?: Record<string, ChoiceAnswer>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

const leafIndex = new Map<ErpPermission, HierarchyLeaf>();
for (const module of getHierarchyModules()) {
  for (const leaf of getModuleLeaves(module)) {
    leafIndex.set(leaf, { module, permission: leaf });
  }
}

function apiKey(): string | null {
  const key = process.env.TYPESAFE_API_KEY;
  return key && key.trim().length > 0 ? key.trim() : null;
}

/**
 * One TypeSafe Choice over the children of the current node. The full
 * probability distribution is the edge set the beam search branches on.
 * Criteria use the module/leaf names themselves so answers map back to keys.
 */
async function childProbabilities(
  key: string,
  state: Record<string, unknown>,
  labels: readonly string[]
): Promise<Record<string, number> | null> {
  const token = apiKey();
  if (!token) return null;

  const criteria: Record<string, string | null> = {};
  for (const label of labels) criteria[label] = null;

  let response: Response;
  try {
    response = await fetch(TYPESAFE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        state,
        model: TYPESAFE_MODEL,
        questions: {
          [key]: {
            type: "choice",
            instructions:
              "Which option best matches the requested ERP permission? " +
              "Options are sibling modules (or sibling leaf permissions) of " +
              "the ERP permission hierarchy.",
            criteria,
          },
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    logErpAudit("hierarchy-guard.api-error", {
      question: key,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  if (!response.ok) {
    logErpAudit("hierarchy-guard.api-non-ok", {
      question: key,
      status: response.status,
    });
    return null;
  }

  let parsed: SystemOneResponse;
  try {
    parsed = (await response.json()) as SystemOneResponse;
  } catch (error) {
    logErpAudit("hierarchy-guard.api-invalid-json", {
      question: key,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  const answer = parsed.answers?.[key];
  if (!answer || answer.type !== "choice" || !answer.probabilities) {
    return null;
  }
  return answer.probabilities;
}

function answerConfidence(probabilities: Record<string, number>): number {
  const values = Object.values(probabilities);
  if (values.length === 0) return 0;
  return Math.max(...values);
}

function extendPath(path: BeamPath, module: ModuleName, probability: number | undefined): BeamPath {
  const p = probability ?? 0;
  const nextProduct = path.probabilityProduct * Math.max(p, 1e-9);
  const nextDecisions = path.decisions + 1;
  return {
    modules: [...path.modules, module],
    probabilityProduct: nextProduct,
    decisions: nextDecisions,
    score: nextProduct ** (1 / nextDecisions),
  };
}

/**
 * K=3 beam search from the ERP_ACCESS root to the target leaf. Every round
 * fires one Choice per surviving path (parallel questions in a single API
 * request) and keeps the best BEAM_WIDTH paths by geometric-mean score.
 */
async function beamSearch(
  target: HierarchyLeaf,
  state: Record<string, unknown>
): Promise<{ path: [...ModuleName[], ErpPermission]; score: number; confidence: number } | null> {
  let beam: BeamPath[] = [{ modules: [], probabilityProduct: 1, decisions: 0, score: 1 }];
  let minConfidence = 1;

  for (let depth = 0; depth < 4; depth++) {
    const expandable = beam.filter((path) => path.modules.length === depth);

    // All surviving paths expand in parallel as separate Choice questions.
    const distributions = await Promise.all(
      expandable.map((path, index) => {
        const children = getHierarchyModules().filter((module) => !path.modules.includes(module));
        if (children.length === 0) return Promise.resolve(null);
        return childProbabilities(`q${index}`, state, children);
      })
    );

    if (distributions.every((d) => d === null)) return null;

    const expanded: BeamPath[] = [];
    for (const [i, path] of expandable.entries()) {
      const probabilities = distributions[i];
      if (!probabilities) continue;
      minConfidence = Math.min(minConfidence, answerConfidence(probabilities));
      for (const module of getHierarchyModules()) {
        if (path.modules.includes(module)) continue;
        expanded.push(extendPath(path, module, probabilities[module]));
      }
    }

    // Terminal: every surviving path is now exactly one module deep, which is
    // the full depth of this hierarchy (root → module → leaf). Pick the leaf.
    if (depth === 1 || expanded.length === 0) break;
    beam = expanded.sort((a, b) => b.score - a.score).slice(0, BEAM_WIDTH);
  }

  const best = beam[0];
  const bestModule = best?.modules[0];
  if (!best || !bestModule) return null;

  const leafConfirmation = await childProbabilities("leaf", state, [
    ...getModuleLeaves(bestModule),
  ]);
  if (leafConfirmation) {
    minConfidence = Math.min(minConfidence, answerConfidence(leafConfirmation));
  }

  return {
    path: [...best.modules, target.permission],
    score: best.score,
    confidence: minConfidence,
  };
}

export type HierarchyGuardResult = {
  granted: boolean;
  /** Whether advisory traversal metadata accompanies the deterministic decision. */
  strategy: "hierarchical" | "deterministic";
  /** Traversal path when strategy is hierarchical (root → modules → leaf). */
  path?: string[];
  /** Geometric-mean score for the advisory traversal path. */
  score?: number;
  /** Minimum per-edge Choice confidence observed during traversal. */
  confidence?: number;
};

/**
 * Authorize solely by `permissions` membership, with optional advisory TypeSafe
 * traversal metadata for granted permissions.
 */
export async function checkPermissionWithHierarchy(
  userId: string,
  schoolId: number,
  permissions: ReadonlySet<string>,
  permission: ErpPermission
): Promise<HierarchyGuardResult> {
  const deterministic: HierarchyGuardResult = {
    granted: permissions.has(permission),
    strategy: "deterministic",
  };

  if (!deterministic.granted) return deterministic;

  const leaf = leafIndex.get(permission);
  if (!leaf) {
    // Root grant (ERP_ACCESS) or an unknown permission: nothing to traverse.
    return deterministic;
  }

  const token = apiKey();
  if (!token) {
    logErpAudit("hierarchy-guard.fallback", {
      userId,
      schoolId,
      permission,
      reason: "no-api-key",
    });
    return deterministic;
  }

  const state = {
    user_id: userId,
    school_id: schoolId,
    requested_permission: permission,
    permission_hierarchy:
      "ERP_ACCESS → modules (CORE, HRM, CRM, FINANCE, ACADEMICS, APPROVALS, DASHBOARD) → leaf permissions",
  };

  try {
    const result = await beamSearch(leaf, state);

    if (!result || result.confidence < MIN_CONFIDENCE) {
      logErpAudit("hierarchy-guard.fallback", {
        userId,
        schoolId,
        permission,
        reason: result ? "low-confidence" : "no-path",
        confidence: result?.confidence,
      });
      return deterministic;
    }

    const granted = deterministic.granted;
    logErpAudit("hierarchy-guard.decision", {
      userId,
      schoolId,
      permission,
      strategy: "hierarchical",
      path: ["ERP_ACCESS", ...result.path],
      score: Number(result.score.toFixed(4)),
      confidence: Number(result.confidence.toFixed(4)),
      granted,
    });

    return {
      granted,
      strategy: "hierarchical",
      path: ["ERP_ACCESS", ...result.path],
      score: result.score,
      confidence: result.confidence,
    };
  } catch (error) {
    logErpAudit("hierarchy-guard.fallback", {
      userId,
      schoolId,
      permission,
      reason: "guard-error",
      error: error instanceof Error ? error.message : String(error),
    });
    return deterministic;
  }
}

// Keep the hierarchy import referenced even if the guard is tree-walked
// differently in future; ensures this module fails to compile if the shared
// constant is removed.
void ERP_PERMISSION_HIERARCHY;
