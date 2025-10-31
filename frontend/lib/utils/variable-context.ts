/**
 * Variable Context Utilities
 *
 * Calculate available variables for each node based on:
 * 1. Start node's input and state variables
 * 2. Previous nodes' output variables
 */

import type { Variable, WorkflowNode, WorkflowEdge, NodeType } from "@/types/workflow";

/**
 * Get all variables available to a specific node
 *
 * @param nodeId - The node ID to calculate variables for
 * @param nodes - All workflow nodes
 * @param edges - All workflow edges
 * @returns Array of available variables
 */
export function getAvailableVariables(
  nodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): Variable[] {
  const variables: Variable[] = [];

  // 1. Get Start node variables (always available to all nodes)
  const startNode = nodes.find((n) => n.type === "start");
  if (startNode && "inputVariables" in startNode.data && "stateVariables" in startNode.data) {
    // Input variables (workflow inputs)
    if (startNode.data.inputVariables) {
      variables.push(...startNode.data.inputVariables);
    }

    // State variables (user-defined state)
    if (startNode.data.stateVariables) {
      variables.push(...startNode.data.stateVariables);
    }
  }

  // 2. Get previous nodes' output variables
  const previousNodes = getPreviousNodes(nodeId, nodes, edges);
  previousNodes.forEach((node) => {
    const outputs = getNodeOutputVariables(node);
    variables.push(...outputs);
  });

  // Remove duplicates by name
  const uniqueVariables = variables.filter(
    (variable, index, self) =>
      index === self.findIndex((v) => v.name === variable.name)
  );

  return uniqueVariables;
}

/**
 * Get all nodes that come before the specified node
 * Uses BFS to traverse edges backwards
 *
 * @param nodeId - The target node ID
 * @param nodes - All workflow nodes
 * @param edges - All workflow edges
 * @returns Array of previous nodes
 */
export function getPreviousNodes(
  nodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): WorkflowNode[] {
  const previousNodes: WorkflowNode[] = [];
  const visited = new Set<string>();

  // Find all incoming edges
  const incomingEdges = edges.filter((edge) => edge.target === nodeId);

  incomingEdges.forEach((edge) => {
    if (!visited.has(edge.source)) {
      visited.add(edge.source);
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (sourceNode) {
        previousNodes.push(sourceNode);
      }
    }
  });

  return previousNodes;
}

/**
 * Get output variables produced by a specific node type
 * Each node type defines what variables it produces
 *
 * @param node - The workflow node
 * @returns Array of output variables
 */
export function getNodeOutputVariables(node: WorkflowNode): Variable[] {
  const outputs: Variable[] = [];

  switch (node.type) {
    case "agent":
      if ("outputVariable" in node.data) {
        outputs.push({
          id: `${node.id}-output`,
          name: node.data.outputVariable || "agent_response",
          type: "string",
          description: `Response from agent: ${node.data.name || node.id}`,
        });
      }
      // GPT-5 reasoning/thinking output
      outputs.push({
        id: `${node.id}-thinking`,
        name: "agent_thinking",
        type: "string",
        description: "GPT-5 reasoning content",
      });
      break;

    case "transform":
      if ("assignments" in node.data && node.data.assignments) {
        node.data.assignments.forEach((assignment) => {
          outputs.push({
            id: `${node.id}-${assignment.key}`,
            name: assignment.key,
            type: inferTypeFromCEL(assignment.value),
            description: `Transform output: ${assignment.value}`,
          });
        });
      }
      break;

    case "setState":
      if ("assignments" in node.data && node.data.assignments) {
        node.data.assignments.forEach((assignment) => {
          outputs.push({
            id: `${node.id}-${assignment.key}`,
            name: assignment.key,
            type: inferTypeFromCEL(assignment.value),
            description: `SetState output: ${assignment.key}`,
          });
        });
      }
      break;

    case "fileSearch":
      outputs.push(
        {
          id: `${node.id}-content`,
          name: "file_content",
          type: "string",
          description: "Content from file search",
        },
        {
          id: `${node.id}-metadata`,
          name: "file_metadata",
          type: "object",
          description: "File metadata",
        }
      );
      break;

    case "guardrails":
      outputs.push(
        {
          id: `${node.id}-result`,
          name: "guardrails_result",
          type: "object",
          description: "Guardrails check result",
        },
        {
          id: `${node.id}-safe`,
          name: "is_safe",
          type: "boolean",
          description: "Whether content passed guardrails",
        }
      );
      break;

    case "mcp":
      outputs.push({
        id: `${node.id}-response`,
        name: "mcp_response",
        type: "object",
        description: "MCP server response",
      });
      break;

    case "ifElse":
      // IfElse doesn't produce outputs, it just routes
      break;

    case "while":
      // While doesn't produce outputs, it just loops
      break;

    case "userApproval":
      outputs.push({
        id: `${node.id}-approved`,
        name: "user_approved",
        type: "boolean",
        description: "Whether user approved",
      });
      break;

    case "start":
      // Start node variables are handled separately
      break;

    case "end":
      // End node doesn't produce outputs
      break;

    case "note":
      // Note node doesn't produce outputs
      break;

    default:
      break;
  }

  return outputs;
}

/**
 * Infer variable type from CEL expression
 * This is a simple heuristic - actual type depends on execution
 *
 * @param expression - CEL expression string
 * @returns Inferred variable type
 */
export function inferTypeFromCEL(expression: string): Variable["type"] {
  const trimmed = expression.trim();

  // Check for boolean expressions
  if (
    trimmed.includes("==") ||
    trimmed.includes("!=") ||
    trimmed.includes(">") ||
    trimmed.includes("<") ||
    trimmed.includes("&&") ||
    trimmed.includes("||") ||
    trimmed === "true" ||
    trimmed === "false"
  ) {
    return "boolean";
  }

  // Check for number expressions
  if (
    /^\d+(\.\d+)?$/.test(trimmed) ||
    trimmed.includes("+") ||
    trimmed.includes("-") ||
    trimmed.includes("*") ||
    trimmed.includes("/")
  ) {
    return "number";
  }

  // Check for list/array
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return "list";
  }

  // Check for object
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return "object";
  }

  // Default to string
  return "string";
}

/**
 * Validate if a variable name exists in available variables
 *
 * @param variableName - Variable name to validate
 * @param availableVariables - List of available variables
 * @returns true if variable exists
 */
export function isVariableAvailable(
  variableName: string,
  availableVariables: Variable[]
): boolean {
  return availableVariables.some((v) => v.name === variableName);
}

/**
 * Extract all variable names from a text with ${...} syntax
 *
 * @param text - Text containing ${variable_name} patterns
 * @returns Array of variable names
 */
export function extractVariableNames(text: string): string[] {
  const regex = /\$\{([^}]+)\}/g;
  const matches = [...text.matchAll(regex)];
  return matches.map((match) => match[1].trim());
}

/**
 * Validate all variables in a text against available variables
 *
 * @param text - Text containing ${variable_name} patterns
 * @param availableVariables - List of available variables
 * @returns Object with validation result and invalid variable names
 */
export function validateVariablesInText(
  text: string,
  availableVariables: Variable[]
): { valid: boolean; invalidVariables: string[] } {
  const variableNames = extractVariableNames(text);
  const invalidVariables = variableNames.filter(
    (name) => !isVariableAvailable(name, availableVariables)
  );

  return {
    valid: invalidVariables.length === 0,
    invalidVariables,
  };
}
