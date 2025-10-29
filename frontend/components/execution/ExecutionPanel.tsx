"use client";

import { Play, Square, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import { useWorkflowExecution } from "@/hooks/useWorkflowExecution";
import { EventStreamViewer } from "./EventStreamViewer";

export function ExecutionPanel() {
  const { nodes, edges } = useWorkflowStore();
  const workflowId = "workflow-1"; // TODO: Get from route params

  const { events, status, streamBuffers, execute, cancel, clear } =
    useWorkflowExecution(workflowId);

  const handleExecute = () => {
    execute({
      workflowDefinition: {
        id: workflowId,
        name: "Test Workflow",
        version: "1.0.0",
        nodes: nodes as any[],
        edges: edges as any[],
      },
      inputVariables: {},
    });
  };

  const isRunning = status === "running";
  const isCompleted = status === "completed";
  const isError = status === "error";

  return (
    <div className="h-full flex flex-col bg-black border-l border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-gray-100">Execution</h2>

          {/* Status Badge */}
          {isRunning && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-900/30 border border-blue-700/50 rounded-md">
              <Loader2 size={12} className="text-blue-400 animate-spin" />
              <span className="text-xs text-blue-400">Running</span>
            </div>
          )}

          {isCompleted && (
            <div className="flex items-center gap-1 px-2 py-1 bg-green-900/30 border border-green-700/50 rounded-md">
              <CheckCircle2 size={12} className="text-green-400" />
              <span className="text-xs text-green-400">Completed</span>
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-900/30 border border-red-700/50 rounded-md">
              <AlertCircle size={12} className="text-red-400" />
              <span className="text-xs text-red-400">Error</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isRunning ? (
            <button
              onClick={cancel}
              className="flex items-center gap-2 px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
            >
              <Square size={14} />
              Stop
            </button>
          ) : (
            <button
              onClick={handleExecute}
              disabled={nodes.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={14} />
              Run Workflow
            </button>
          )}

          {events.length > 0 && !isRunning && (
            <button
              onClick={clear}
              className="flex items-center gap-2 px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-md transition-colors"
            >
              <Trash2 size={14} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Event Stream */}
      <div className="flex-1 overflow-y-auto p-4">
        {events.length === 0 && streamBuffers.size === 0 && status === "idle" && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Play size={48} className="mb-4 opacity-50" />
            <p className="text-sm">Click "Run Workflow" to execute</p>
          </div>
        )}

        <EventStreamViewer events={events} streamBuffers={streamBuffers} />
      </div>
    </div>
  );
}
