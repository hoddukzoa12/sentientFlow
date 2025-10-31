"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { FlowCanvas } from "@/components/canvas/FlowCanvas";
import { WorkflowHeader } from "@/components/canvas/WorkflowHeader";
import { NodePanel } from "@/components/panels/NodePanel";
import { PropertiesPanel } from "@/components/panels/PropertiesPanel";
import { PreviewPanel } from "@/components/preview/PreviewPanel";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import { useWorkflowsDbStore } from "@/lib/store/workflows-db-store";
import type { NodeType, WorkflowNode, StartNodeData } from "@/types/workflow";
import { findNonOverlappingPosition, NODE_DIMENSIONS } from "@/lib/utils/node-collision";
import { getDefaultNodeData } from "@/lib/utils/node-defaults";

// Inner component that can use useReactFlow
function WorkflowEditorInner({
  workflowId,
  isPreviewOpen,
  setIsPreviewOpen,
}: {
  workflowId: string;
  isPreviewOpen: boolean;
  setIsPreviewOpen: (open: boolean) => void;
}) {
  const { nodes, selectedNodeId, addNode } = useWorkflowStore();
  const { fitView } = useReactFlow();

  // Get Start node data for PreviewPanel
  const startNode = nodes.find((node) => node.type === "start");
  const startNodeData = startNode?.data as StartNodeData | null;

  // Fit view when preview opens
  useEffect(() => {
    if (isPreviewOpen) {
      // Delay fitView to allow layout to settle
      setTimeout(() => {
        fitView({ duration: 300, padding: 0.1 });
      }, 100);
    }
  }, [isPreviewOpen, fitView]);

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
  );
}

export default function WorkflowEditorPage() {
  const params = useParams();
  const workflowId = params.id as string;

  const { nodes, addNode } = useWorkflowStore();
  const { loadWorkflow, setCurrentWorkflowId } = useWorkflowsDbStore();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load workflow data on mount
  useEffect(() => {
    const initializeWorkflow = async () => {
      if (workflowId === "new") {
        // New workflow - just set loading to false
        setCurrentWorkflowId(null);
        setIsLoading(false);
      } else {
        // Existing workflow - load from database
        try {
          // loadWorkflow updates the workflow-store internally
          await loadWorkflow(workflowId);
          setIsLoading(false);
        } catch (error) {
          console.error("Failed to load workflow:", error);
          alert("Failed to load workflow");
          setIsLoading(false);
        }
      }
    };

    initializeWorkflow();
  }, [workflowId, loadWorkflow, setCurrentWorkflowId]);

  // Add a Start node automatically when the workflow is empty (only after loading)
  useEffect(() => {
    // Skip if still loading
    if (isLoading) return;

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
  }, [nodes, addNode, isLoading]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading workflow...</p>
        </div>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <WorkflowEditorInner
        workflowId={workflowId}
        isPreviewOpen={isPreviewOpen}
        setIsPreviewOpen={setIsPreviewOpen}
      />
    </ReactFlowProvider>
  );
}
