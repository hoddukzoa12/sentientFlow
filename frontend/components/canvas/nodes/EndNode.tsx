"use client";

import { Handle, Position } from "@xyflow/react";
import { Square } from "lucide-react";

import type { CustomNodeProps, EndNodeData } from "@/types/workflow";

export function EndNode({ selected }: CustomNodeProps<EndNodeData>) {
  return (
    <div
      className={`px-3 py-1.5 rounded-lg border-2 ${
        selected ? "border-blue-500" : "border-gray-700"
      } bg-gray-900 min-w-[85px]`}
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
    </div>
  );
}
