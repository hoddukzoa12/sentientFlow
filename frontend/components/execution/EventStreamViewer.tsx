"use client";

import { MessageSquare, Code, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import type { WorkflowEvent } from "@/types/execution";

interface EventStreamViewerProps {
  events: WorkflowEvent[];
  streamBuffers: Map<string, string>;
}

export function EventStreamViewer({ events, streamBuffers }: EventStreamViewerProps) {
  return (
    <div className="space-y-3">
      {/* Completed Events */}
      {events.map((event, index) => (
        <div key={index} className="p-3 bg-gray-900 rounded-lg border border-gray-800">
          {/* TEXT_BLOCK Events */}
          {event.type === "TEXT_BLOCK" && (
            <div className="flex items-start gap-2">
              <MessageSquare size={16} className="text-blue-400 mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-400 mb-1">
                  {(event as any).eventName || "Message"}
                </div>
                <div className="text-sm text-gray-100 whitespace-pre-wrap break-words">
                  {(event as any).content}
                </div>
              </div>
            </div>
          )}

          {/* JSON Events */}
          {event.type === "JSON" && (
            <div className="flex items-start gap-2">
              <Code size={16} className="text-green-400 mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-400 mb-1">
                  {(event as any).eventName || "JSON"}
                </div>
                <pre className="text-xs text-gray-100 overflow-x-auto bg-gray-950 p-2 rounded border border-gray-800">
                  {JSON.stringify((event as any).content, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* ERROR Events */}
          {event.type === "ERROR" && (
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-red-400 mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-red-400 mb-1">Error</div>
                <div className="text-sm text-red-300 whitespace-pre-wrap break-words">
                  {(event as any).errorMessage}
                </div>
                {(event as any).errorCode && (
                  <div className="text-xs text-red-400 mt-1">
                    Code: {(event as any).errorCode}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DONE Event */}
          {event.type === "DONE" && (
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
              <span className="text-sm text-green-400">Execution Complete</span>
            </div>
          )}
        </div>
      ))}

      {/* Active Streams (in progress) */}
      {Array.from(streamBuffers.entries()).map(([streamId, content]) => (
        <div
          key={streamId}
          className="p-3 bg-gray-900 rounded-lg border-2 border-blue-500 animate-pulse"
        >
          <div className="flex items-center gap-2 mb-2">
            <Loader2 size={16} className="text-blue-400 animate-spin flex-shrink-0" />
            <span className="text-xs text-gray-400">Streaming...</span>
          </div>
          <div className="text-sm text-gray-100 whitespace-pre-wrap break-words">
            {content}
            <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1" />
          </div>
        </div>
      ))}
    </div>
  );
}
