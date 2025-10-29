"use client";

import { Handle, Position } from "@xyflow/react";
import { Shield } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import type { GuardrailsNodeData } from "@/types/workflow";

export function GuardrailsNode({ data, selected }: NodeProps<GuardrailsNodeData>) {
  return (
    <div
      className={`px-3 py-1.5 rounded-lg border-2 ${
        selected ? "border-blue-500" : "border-gray-700"
      } bg-gray-900 min-w-[120px]`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-gray-600 border-2 border-gray-500"
      />

      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-yellow-500 flex items-center justify-center">
          <Shield size={14} className="text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-gray-100">
            {data.name || "Guardrails"}
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
