"use client";


import type { CustomNodeProps, NoteNodeData } from "@/types/workflow";

export function NoteNode({ data, selected }: CustomNodeProps<NoteNodeData>) {
  return (
    <div
      className={`px-3 py-2 rounded-lg border-2 ${
        selected ? "border-yellow-500" : "border-yellow-600"
      } bg-yellow-500 min-w-[140px] max-w-[200px]`}
    >
      <p className="text-sm text-gray-900 whitespace-pre-wrap leading-snug">
        {data.content || "Add your notes here..."}
      </p>
    </div>
  );
}
