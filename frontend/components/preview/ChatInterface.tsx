"use client";

import { useEffect, useRef, useMemo } from "react";
import { User } from "lucide-react";

import type { ChatMessage, NodeExecutionBlock } from "@/types/preview";
import { NodeBlockContainer } from "./NodeBlockContainer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Combined type for messages and blocks
type ChatItem =
  | { type: 'message'; data: ChatMessage; timestamp: number }
  | { type: 'block'; data: NodeExecutionBlock; timestamp: number };

interface ChatInterfaceProps {
  userMessages: ChatMessage[];
  nodeBlocks: NodeExecutionBlock[];
  isExecuting: boolean;
  executingNodeId: string | null;
  onApprovalResponse?: (approvalId: string, approved: boolean) => void;
}

export function ChatInterface({
  userMessages,
  nodeBlocks,
  isExecuting,
  executingNodeId,
  onApprovalResponse,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Merge and sort messages and blocks by timestamp
  const chatItems = useMemo(() => {
    const items: ChatItem[] = [
      ...userMessages.map(msg => ({
        type: 'message' as const,
        data: msg,
        timestamp: msg.timestamp
      })),
      ...nodeBlocks.map(block => ({
        type: 'block' as const,
        data: block,
        timestamp: block.startedAt
      }))
    ];
    return items.sort((a, b) => a.timestamp - b.timestamp);
  }, [userMessages, nodeBlocks]);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatItems]);

  return (
    <ScrollArea className="flex-1 px-3 py-2 overflow-auto">
      <div className="min-h-full">
        {/* Empty State */}
        {chatItems.length === 0 && !isExecuting && (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <div className="text-center text-gray-500">
              <p className="text-xs">No messages yet</p>
              <p className="text-[10px] mt-1">
                Start execution to see output
              </p>
            </div>
          </div>
        )}

        {/* Chat Items (Messages and Blocks interleaved by timestamp) */}
        {chatItems.map((item, index) => {
          if (item.type === 'message') {
            const message = item.data;
            return (
              <div key={`${message.id}-${index}`} className="flex justify-end gap-2 mb-4">
                <div className="flex flex-col items-end max-w-[220px]">
                  <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-3 py-2">
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <Avatar className="w-7 h-7 flex-shrink-0">
                  <AvatarFallback className="bg-blue-600 text-white text-xs">
                    <User size={14} />
                  </AvatarFallback>
                </Avatar>
              </div>
            );
          } else {
            const block = item.data;
            return (
              <NodeBlockContainer
                key={block.id}
                block={block}
                isExecuting={block.nodeId === executingNodeId && block.status === "executing"}
              />
            );
          }
        })}

        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
