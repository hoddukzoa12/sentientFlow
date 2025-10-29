"use client";

import { Handle, Position } from "@xyflow/react";
import { Play } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import type { StartNodeData } from "@/types/workflow";

export function StartNode({ data, selected }: NodeProps<StartNodeData>) {
  return (
    <div
      className={`px-3 py-1.5 rounded-lg border-2 ${
        selected ? "border-blue-500" : "border-gray-700"
      } bg-gray-900 min-w-[100px]`}
    >
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center">
          <Play size={14} className="text-white fill-white" />
        </div>
        <span className="text-xs font-medium text-gray-100">Start</span>
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
