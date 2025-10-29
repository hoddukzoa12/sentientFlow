import type { NodeType, WorkflowNode } from "@/types/workflow";

// Accurate node dimensions based on actual rendered sizes
export const NODE_DIMENSIONS: Record<
  NodeType,
  { width: number; height: number }
> = {
  start: { width: 100, height: 40 },
  agent: { width: 120, height: 40 },
  end: { width: 90, height: 40 },
  note: { width: 200, height: 80 },
  fileSearch: { width: 130, height: 40 },
  guardrails: { width: 130, height: 40 },
  mcp: { width: 110, height: 40 },
  ifElse: { width: 110, height: 40 },
  while: { width: 100, height: 40 },
  userApproval: { width: 140, height: 40 },
  transform: { width: 130, height: 40 },
  setState: { width: 120, height: 40 },
};

// Helper function to check if two rectangles overlap
export function rectanglesOverlap(
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect2.x + rect2.width < rect1.x ||
    rect1.y + rect1.height < rect2.y ||
    rect2.y + rect2.height < rect1.y
  );
}

// Helper function to find a non-overlapping position for a new node
export function findNonOverlappingPosition(
  desiredPosition: { x: number; y: number },
  existingNodes: WorkflowNode[],
  nodeType: NodeType
): { x: number; y: number } {
  let position = { ...desiredPosition };
  let attempts = 0;
  const maxAttempts = 50;
  const offsetX = 40; // Increased spacing
  const offsetY = 100; // Increased spacing

  const dimensions = NODE_DIMENSIONS[nodeType];

  while (attempts < maxAttempts) {
    const currentRect = {
      x: position.x,
      y: position.y,
      width: dimensions.width,
      height: dimensions.height,
    };

    const hasOverlap = existingNodes.some((node) => {
      const nodeDimensions = NODE_DIMENSIONS[node.type as NodeType];
      const nodeRect = {
        x: node.position.x,
        y: node.position.y,
        width: nodeDimensions.width,
        height: nodeDimensions.height,
      };
      return rectanglesOverlap(currentRect, nodeRect);
    });

    if (!hasOverlap) {
      return position;
    }

    // Try moving right
    position.x += offsetX;
    attempts++;

    // If we've tried moving right too many times, move down and reset x
    if (attempts % 10 === 0) {
      position.x = desiredPosition.x;
      position.y += offsetY;
    }
  }

  return position;
}
