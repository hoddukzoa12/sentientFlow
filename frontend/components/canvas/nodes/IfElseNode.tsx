"use client";

import { Handle, Position } from "@xyflow/react";
import { GitBranch } from "lucide-react";

import type { CustomNodeProps, IfElseNodeData } from "@/types/workflow";

export function IfElseNode({ data, selected }: CustomNodeProps<IfElseNodeData>) {
  const conditions = data.conditions || [];

  return (
    <div
      className={`relative px-3 py-2 rounded-lg border-2 ${
        selected ? "border-blue-500" : "border-gray-700"
      } bg-gray-900 min-w-[140px]`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-gray-600 border-2 border-gray-500"
      />

      {/* Header: Icon + Title */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-md bg-orange-500 flex items-center justify-center">
          <GitBranch size={14} className="text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-gray-100">If / else</span>
          <span className="text-[10px] text-gray-400">Logic</span>
        </div>
      </div>

      {/* Condition Rows (dynamic) */}
      {conditions.map((condition) => (
        <div key={condition.id} className="relative flex items-center justify-between py-1">
          <span className="text-xs text-gray-300">{condition.name || ""}</span>
          <Handle
            id={condition.id}
            type="source"
            position={Position.Right}
            className="w-3 h-3 bg-blue-500 border-2 border-blue-400"
          />
        </div>
      ))}

      {/* Else Row (always last) */}
      <div className="relative flex items-center justify-between py-1">
        <span className="text-xs font-medium text-orange-400">Else</span>
        <Handle
          id="else"
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-orange-500 border-2 border-orange-400"
        />
      </div>
    </div>
  );
}
