"use client";

import { Handle, Position } from "@xyflow/react";
import { UserCheck } from "lucide-react";

import type { CustomNodeProps, UserApprovalNodeData } from "@/types/workflow";

export function UserApprovalNode({ data, selected }: CustomNodeProps<UserApprovalNodeData>) {
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
          <UserCheck size={14} className="text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-gray-100">User approval</span>
          <span className="text-[10px] text-gray-400">Logic</span>
        </div>
      </div>

      {/* Approve Row */}
      <div className="relative flex items-center justify-between py-1">
        <span className="text-xs font-medium text-green-400">Approve</span>
        <Handle
          id="approve"
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-green-500 border-2 border-green-400"
        />
      </div>

      {/* Reject Row */}
      <div className="relative flex items-center justify-between py-1">
        <span className="text-xs font-medium text-red-400">Reject</span>
        <Handle
          id="reject"
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-red-500 border-2 border-red-400"
        />
      </div>
    </div>
  );
}
