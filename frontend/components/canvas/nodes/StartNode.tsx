"use client";

import { Handle, Position } from "@xyflow/react";
import { Play, CheckCircle, Loader2 } from "lucide-react";
import type { CustomNodeProps, StartNodeData } from "@/types/workflow";
import { useWorkflowStore } from "@/lib/store/workflow-store";

export function StartNode({ id, data, selected }: CustomNodeProps<StartNodeData>) {
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
      className={`relative px-3 py-1.5 rounded-lg border-2 ${borderColor} bg-gray-900 min-w-[100px]`}
    >
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center">
          <Play size={14} className="text-white fill-white" />
        </div>
        <span className="text-xs font-medium text-gray-100">Start</span>
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

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-gray-600 border-2 border-gray-500"
      />
    </div>
  );
}
