"use client";

import { Handle, Position } from "@xyflow/react";
import { Repeat } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import type { WhileNodeData } from "@/types/workflow";

export function WhileNode({ data, selected }: NodeProps<WhileNodeData>) {
  return (
    <div
      className={`px-3 py-1.5 rounded-lg border-2 ${
        selected ? "border-blue-500" : "border-gray-700"
      } bg-gray-900 min-w-[95px]`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-gray-600 border-2 border-gray-500"
      />

      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-orange-500 flex items-center justify-center">
          <Repeat size={14} className="text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-gray-100">While</span>
          <span className="text-[10px] text-gray-400">Logic</span>
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-gray-600 border-2 border-gray-500"
      />
    </div>
  );
}
