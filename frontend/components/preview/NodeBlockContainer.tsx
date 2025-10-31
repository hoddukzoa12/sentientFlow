"use client";

import { useState } from "react";
import { Bot, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";

import type { NodeExecutionBlock } from "@/types/preview";

interface NodeBlockContainerProps {
  block: NodeExecutionBlock;
  isExecuting: boolean;
  timestamp?: string;
}

export function NodeBlockContainer({
  block,
  isExecuting,
  timestamp,
}: NodeBlockContainerProps) {
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);

  const hasThinking =
    block.thinkingChunks.length > 0 || block.streamingThinking;
  // Only show response if thinking is complete
  const hasResponse =
    block.thinkingComplete && (block.responseChunks.length > 0 || block.streamingResponse);

  const fullThinking = [...block.thinkingChunks, block.streamingThinking].join(
    ""
  );
  const fullResponse = [...block.responseChunks, block.streamingResponse].join(
    ""
  );

  // Format timestamp if not provided
  const displayTimestamp = timestamp || new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div className="flex gap-2 mb-4">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
        <Bot size={18} className="text-gray-300" />
      </div>

      {/* Bubble + Timestamp */}
      <div className="flex flex-col items-start max-w-[70%]">
        {/* Chat Bubble */}
        <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 w-full">
          {/* Thinking Process Section (Collapsible) */}
          {hasThinking && (
            <div className={hasResponse ? "border-b border-gray-700 pb-3 mb-3" : ""}>
              <button
                onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
              >
                {isThinkingExpanded ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
                <span>Thinking Process</span>
              </button>

              {isThinkingExpanded && (
                <div className="mt-2 text-sm text-gray-400 whitespace-pre-wrap break-words">
                  {fullThinking}
                  {isExecuting && block.streamingThinking && (
                    <span className="inline-block w-1 h-4 ml-1 bg-blue-400 animate-pulse" />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Final Response Section */}
          {hasResponse && (
            <div className="text-sm text-gray-200 whitespace-pre-wrap break-words">
              {fullResponse}
              {isExecuting && block.streamingResponse && (
                <span className="inline-block w-1 h-4 ml-1 bg-blue-400 animate-pulse" />
              )}
            </div>
          )}

          {/* Error Display */}
          {block.error && (
            <div className="flex items-start gap-2 mt-3 pt-3 border-t border-red-900/50 text-red-300 text-sm">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{block.error}</span>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-gray-500 mt-1 ml-3">
          {displayTimestamp}
        </span>
      </div>
    </div>
  );
}
