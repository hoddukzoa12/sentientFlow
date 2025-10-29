"use client";

import { Handle, Position } from "@xyflow/react";
import { Plug } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import type { MCPNodeData } from "@/types/workflow";

export function MCPNode({ data, selected }: NodeProps<MCPNodeData>) {
  return (
    <div
      className={`px-3 py-1.5 rounded-lg border-2 ${
        selected ? "border-blue-500" : "border-gray-700"
      } bg-gray-900 min-w-[100px]`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-gray-600 border-2 border-gray-500"
      />

      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-yellow-500 flex items-center justify-center">
          <Plug size={14} className="text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-gray-100">
            {data.name || "MCP"}
          </span>
          <span className="text-[10px] text-gray-400">Tool</span>
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
