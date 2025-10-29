"use client";

import { useState } from "react";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";

import type { NodeExecutionBlock } from "@/types/preview";
import { NodeIcon } from "./NodeIcon";

interface NodeBlockContainerProps {
  block: NodeExecutionBlock;
  isExecuting: boolean;
}

export function NodeBlockContainer({
  block,
  isExecuting,
}: NodeBlockContainerProps) {
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);

  const hasThinking =
    block.thinkingChunks.length > 0 || block.streamingThinking;
  const hasResponse =
    block.responseChunks.length > 0 || block.streamingResponse;

  const fullThinking = [...block.thinkingChunks, block.streamingThinking].join(
    ""
  );
  const fullResponse = [...block.responseChunks, block.streamingResponse].join(
    ""
  );

  return (
    <div className="mb-3 border-l-4 border-blue-500 bg-gray-900/50 rounded-r-lg overflow-hidden">
      {/* Header: Icon + Name + Loading Indicator */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800/50">
        <div className="flex items-center gap-2">
          <NodeIcon type={block.nodeType} className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-100">
            {block.nodeName}
          </span>
        </div>

        {/* Right-side loading indicator */}
        {isExecuting && (
          <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
        )}
      </div>

      {/* Thinking Process Section (Collapsible) */}
      {hasThinking && (
        <div className="border-t border-gray-800">
          <button
            onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
            className="flex items-center gap-2 w-full px-4 py-2 text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-800/30 transition-colors"
          >
            {isThinkingExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span>Thinking Process</span>
          </button>

          {isThinkingExpanded && (
            <div className="px-4 py-3 text-sm text-gray-300 whitespace-pre-wrap break-words bg-gray-900/30">
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
        <div className="border-t border-gray-800 px-4 py-3">
          <div className="text-sm text-gray-100 whitespace-pre-wrap break-words">
            {fullResponse}
            {isExecuting && block.streamingResponse && (
              <span className="inline-block w-1 h-4 ml-1 bg-blue-400 animate-pulse" />
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {block.error && (
        <div className="border-t border-red-900/50 px-4 py-2 bg-red-900/20 text-red-300 text-xs">
          ❌ {block.error}
        </div>
      )}

      {/* Empty state for executing nodes without content yet */}
      {isExecuting && !hasThinking && !hasResponse && !block.error && (
        <div className="px-4 py-3 text-xs text-gray-500 italic">
          Executing...
        </div>
      )}
    </div>
  );
}
