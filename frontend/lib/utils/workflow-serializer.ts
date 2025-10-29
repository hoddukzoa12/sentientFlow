import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";

export interface WorkflowExecutionPayload {
  workflowId: string;
  workflowDefinition: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
  inputVariables: Record<string, any>;
}

/**
 * Serialize workflow from Zustand store to backend API format
 */
export function serializeWorkflow(
  workflowId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  inputVariables: Record<string, any>
): WorkflowExecutionPayload {
  // Validate: must have at least a Start node
  const hasStartNode = nodes.some((node) => node.type === "start");
  if (!hasStartNode) {
    throw new Error("Workflow must have a Start node");
  }

  return {
    workflowId,
    workflowDefinition: {
      nodes,
      edges,
    },
    inputVariables,
  };
}

/**
 * Validate workflow before execution
 */
export function validateWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check: at least one Start node
  const startNodes = nodes.filter((node) => node.type === "start");
  if (startNodes.length === 0) {
    errors.push("Workflow must have at least one Start node");
  }
  if (startNodes.length > 1) {
    errors.push("Workflow cannot have multiple Start nodes");
  }

  // Check: all edges have valid source and target
  for (const edge of edges) {
    const sourceExists = nodes.some((node) => node.id === edge.source);
    const targetExists = nodes.some((node) => node.id === edge.target);

    if (!sourceExists) {
      errors.push(`Edge has invalid source: ${edge.source}`);
    }
    if (!targetExists) {
      errors.push(`Edge has invalid target: ${edge.target}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
