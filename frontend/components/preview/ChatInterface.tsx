"use client";

import { useEffect, useRef } from "react";
import { Loader2, Bot } from "lucide-react";

import type { ChatMessage, StreamingMessage } from "@/types/preview";
import { MessageItem } from "./MessageItem";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  streamingMessage: StreamingMessage | null;
  isExecuting: boolean;
  onApprovalResponse?: (approvalId: string, approved: boolean) => void;
}

export function ChatInterface({
  messages,
  streamingMessage,
  isExecuting,
  onApprovalResponse,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  return (
    <ScrollArea className="flex-1 px-3 py-2">
      {/* Empty State */}
      {messages.length === 0 && !streamingMessage && !isExecuting && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <p className="text-xs">No messages yet</p>
            <p className="text-[10px] mt-1">
              Start execution to see output
            </p>
          </div>
        </div>
      )}

      {/* Message List */}
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          onApprovalResponse={onApprovalResponse}
        />
      ))}

      {/* Streaming Message (Agent typing) */}
      {streamingMessage && (
        <div className="flex gap-2 mb-4">
          <Avatar className="w-7 h-7 flex-shrink-0">
            <AvatarFallback className="bg-gray-700 text-gray-300 text-xs">
              <Bot size={14} />
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start max-w-[220px]">
            <div className="bg-gray-800 text-gray-100 rounded-2xl rounded-tl-sm px-3 py-2">
              <p className="text-sm whitespace-pre-wrap break-words">
                {streamingMessage.content}
                <span className="inline-block w-1 h-3 ml-1 bg-blue-400 animate-pulse" />
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Execution Indicator */}
      {isExecuting && !streamingMessage && (
        <div className="flex items-center justify-center gap-2 py-2 text-gray-500">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-[10px]">Executing...</span>
        </div>
      )}

      {/* Auto-scroll anchor */}
      <div ref={messagesEndRef} />
    </ScrollArea>
  );
}
