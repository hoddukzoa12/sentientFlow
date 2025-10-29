"use client";

import { useCallback, useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { FlowCanvas } from "@/components/canvas/FlowCanvas";
import { WorkflowHeader } from "@/components/canvas/WorkflowHeader";
import { NodePanel } from "@/components/panels/NodePanel";
import { PropertiesPanel } from "@/components/panels/PropertiesPanel";
import { ExecutionPanel } from "@/components/execution/ExecutionPanel";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import type { NodeType, WorkflowNode } from "@/types/workflow";
import { findNonOverlappingPosition } from "@/lib/utils/node-collision";
import { getDefaultNodeData } from "@/lib/utils/node-defaults";

export default function WorkflowEditorPage() {
  const { nodes, selectedNodeId, addNode } = useWorkflowStore();

  // Add a Start node automatically when the workflow is empty
  useEffect(() => {
    if (nodes.length === 0) {
      const desiredPosition = { x: 100, y: 250 };
      const position = findNonOverlappingPosition(desiredPosition, nodes, "start");

      const startNode: WorkflowNode = {
        id: "start-initial",
        type: "start",
        position,
        data: getDefaultNodeData("start"),
        deletable: false, // Prevent deletion of Start node
      };
      addNode(startNode);
    }
  }, [nodes.length, addNode]);

  // Handle node drop from NodePanel (coordinates transformed by FlowCanvas)
  const handleNodeDrop = useCallback(
    (type: NodeType, position: { x: number; y: number }) => {
      // Find a non-overlapping position
      const finalPosition = findNonOverlappingPosition(position, nodes, type);

      // Generate node ID
      const id = `${type}-${Date.now()}`;

      // Create node with default data based on type
      const newNode: WorkflowNode = {
        id,
        type,
        position: finalPosition,
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
        <WorkflowHeader />

        {/* Main Content - Canvas with floating panels */}
        <div className="relative flex-1 overflow-hidden">
          {/* Full Canvas */}
          <div className="w-full h-full">
            <FlowCanvas onNodeDrop={handleNodeDrop} />
          </div>

          {/* Floating Left Panel - Node Palette */}
          <div className="absolute top-4 left-4 z-10">
            <NodePanel />
          </div>

          {/* Floating Right Panel - Properties (conditional) */}
          {selectedNodeId && (
            <div className="absolute top-4 right-4 z-10 max-h-[calc(100vh-120px)] overflow-hidden">
              <PropertiesPanel />
            </div>
          )}

          {/* Floating Bottom Right Panel - Execution */}
          <div className="absolute bottom-4 right-4 z-10 w-[400px] h-[500px] rounded-lg overflow-hidden shadow-2xl">
            <ExecutionPanel />
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
