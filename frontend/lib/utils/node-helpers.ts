/**
 * Helper utilities for working with workflow nodes.
 */

import type { WorkflowNode, NodeType } from "@/types/workflow";

/**
 * Get the display name for a workflow node.
 * Priority: user-defined name > type-based default name
 */
export function getNodeDisplayName(
  node: WorkflowNode | null | undefined
): string {
  if (!node) return "Unknown Node";

  // Priority 1: User-defined name in node data
  if ("name" in node.data && node.data.name) {
    return node.data.name as string;
  }

  // Priority 2: Type-based default names
  const typeNames: Record<NodeType, string> = {
    start: "Start",
    agent: "Agent",
    end: "End",
    fileSearch: "File Search",
    guardrails: "Guardrails",
    mcp: "MCP",
    ifElse: "If/Else",
    while: "While Loop",
    userApproval: "User Approval",
    transform: "Transform",
    setState: "Set State",
    note: "Note",
  };

  return typeNames[node.type] || node.type;
}

/**
 * Get node type icon emoji.
 */
export function getNodeIcon(nodeType: NodeType | undefined): string {
  if (!nodeType) return "📦";

  const iconMap: Record<NodeType, string> = {
    start: "🟢",
    agent: "🤖",
    end: "🏁",
    fileSearch: "📁",
    guardrails: "🛡️",
    mcp: "🔌",
    ifElse: "🔀",
    while: "🔄",
    userApproval: "✋",
    transform: "⚙️",
    setState: "💾",
    note: "📝",
  };

  return iconMap[nodeType] || "📦";
}
