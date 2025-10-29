"use client";

import { useState, KeyboardEvent } from "react";
import { Paperclip, ArrowUp, Square } from "lucide-react";

import type { StartExecutionPayload } from "@/types/preview";
import type { StartNodeData } from "@/types/workflow";

interface ChatInputProps {
  startNodeData: StartNodeData | null;
  isExecuting: boolean;
  onStartExecution: (payload: StartExecutionPayload) => void;
  onCancel: () => void;
}

export function ChatInput({
  startNodeData,
  isExecuting,
  onStartExecution,
  onCancel,
}: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim() || isExecuting) return;

    // Send message as input_as_text variable
    onStartExecution({
      inputVariables: {
        input_as_text: message.trim(),
      },
    });

    setMessage("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-800 p-3">
      <div className="flex items-center gap-2 bg-gray-900 rounded-lg px-3 py-2 border border-gray-700 focus-within:border-gray-600">
        {/* Attachment button */}
        <button
          className="p-1 text-gray-400 hover:text-gray-300 transition-colors"
          aria-label="Attach file"
        >
          <Paperclip size={18} />
        </button>

        {/* Message input */}
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message..."
          disabled={isExecuting}
          className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-500 outline-none disabled:opacity-50"
        />

        {/* Send/Stop button */}
        {isExecuting ? (
          <button
            onClick={onCancel}
            className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors"
            aria-label="Stop execution"
          >
            <Square size={14} className="text-white" fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="w-7 h-7 rounded-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 flex items-center justify-center transition-colors"
            aria-label="Send message"
          >
            <ArrowUp size={16} className="text-gray-300" />
          </button>
        )}
      </div>
    </div>
  );
}
