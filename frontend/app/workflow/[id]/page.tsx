"use client";

import { useCallback, useEffect, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { FlowCanvas } from "@/components/canvas/FlowCanvas";
import { WorkflowHeader } from "@/components/canvas/WorkflowHeader";
import { NodePanel } from "@/components/panels/NodePanel";
import { PropertiesPanel } from "@/components/panels/PropertiesPanel";
import { PreviewPanel } from "@/components/preview/PreviewPanel";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import type { NodeType, WorkflowNode, StartNodeData } from "@/types/workflow";
import { findNonOverlappingPosition, NODE_DIMENSIONS } from "@/lib/utils/node-collision";
import { getDefaultNodeData } from "@/lib/utils/node-defaults";

export default function WorkflowEditorPage() {
  const { nodes, selectedNodeId, addNode } = useWorkflowStore();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Get Start node data for PreviewPanel
  const startNode = nodes.find((node) => node.type === "start");
  const startNodeData = startNode?.data as StartNodeData | null;

  // Add a Start node automatically when the workflow is empty
  useEffect(() => {
    // Create only when there is no Start node
    const hasStartNode = nodes.some(node => node.type === "start");

    if (!hasStartNode) {
      const desiredPosition = { x: 100, y: 250 };
      const position = findNonOverlappingPosition(desiredPosition, nodes, "start");
      const dimensions = NODE_DIMENSIONS["start"];

      const startNode: WorkflowNode = {
        id: "start-initial",
        type: "start",
        position,
        width: dimensions.width,
        height: dimensions.height,
        data: getDefaultNodeData("start"),
        deletable: false, // Prevent deletion of Start node
      };
      addNode(startNode);
    }
  }, [nodes, addNode]);

  // Handle node drop from NodePanel (coordinates transformed by FlowCanvas)
  const handleNodeDrop = useCallback(
    (type: NodeType, position: { x: number; y: number }) => {
      // Find a non-overlapping position
      const finalPosition = findNonOverlappingPosition(position, nodes, type);

      // Get dimensions for this node type
      const dimensions = NODE_DIMENSIONS[type];

      // Generate node ID
      const id = `${type}-${Date.now()}`;

      // Create node with default data based on type
      const newNode: WorkflowNode = {
        id,
        type,
        position: finalPosition,
        width: dimensions.width,
        height: dimensions.height,
        data: getDefaultNodeData(type),
      };

      addNode(newNode);
    },
    [addNode, nodes]
  );

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-black">
        {/* Header */}
        <WorkflowHeader onPreviewToggle={() => setIsPreviewOpen(!isPreviewOpen)} />

        {/* Main Content - Split Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Side - Workflow Canvas */}
          <div className={`relative flex-1 ${isPreviewOpen ? "w-[70%]" : "w-full"} overflow-hidden`}>
            {/* Full Canvas */}
            <div className="w-full h-full">
              <FlowCanvas
                onNodeDrop={handleNodeDrop}
                isInteractive={!isPreviewOpen}
              />
            </div>

            {/* Floating Left Panel - Node Palette (hidden in Preview mode) */}
            {!isPreviewOpen && (
              <div className="absolute top-4 left-4 z-10">
                <NodePanel />
              </div>
            )}

            {/* Floating Right Panel - Properties (hidden in Preview mode) */}
            {selectedNodeId && !isPreviewOpen && (
              <div className="absolute top-4 right-4 z-10 max-h-[calc(100vh-120px)] overflow-hidden">
                <PropertiesPanel />
              </div>
            )}
          </div>

          {/* Right Side - Preview Panel (30% width when open) */}
          {isPreviewOpen && (
            <div className="w-[30%] min-w-[400px]">
              <PreviewPanel
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                startNodeData={startNodeData}
              />
            </div>
          )}
        </div>
      </div>
    </ReactFlowProvider>
  );
}
