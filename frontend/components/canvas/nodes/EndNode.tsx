"use client";

import { Handle, Position } from "@xyflow/react";
import { Square, CheckCircle, Loader2 } from "lucide-react";

import type { CustomNodeProps, EndNodeData } from "@/types/workflow";
import { useWorkflowStore } from "@/lib/store/workflow-store";

export function EndNode({ id, selected }: CustomNodeProps<EndNodeData>) {
  const { executingNodeId, completedNodes } = useWorkflowStore();

  const isExecuting = id === executingNodeId;
  const isCompleted = id && completedNodes.has(id);

  const borderColor = isExecuting
    ? "border-yellow-500 animate-pulse"
    : isCompleted
    ? "border-green-500"
    : selected
    ? "border-blue-500"
    : "border-gray-700";

  return (
    <div
      className={`relative px-3 py-1.5 rounded-lg border-2 ${borderColor} bg-gray-900 min-w-[85px]`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-gray-600 border-2 border-gray-500"
      />

      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center">
          <Square size={14} className="text-white" />
        </div>
        <span className="text-xs font-medium text-gray-100">End</span>
      </div>

      {/* Execution State Indicators */}
      {isExecuting && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
          <Loader2 size={12} className="text-white animate-spin" />
        </div>
      )}
      {isCompleted && !isExecuting && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
          <CheckCircle size={12} className="text-white" />
        </div>
      )}
    </div>
  );
}
