"use client";

import { X } from "lucide-react";
import { useState } from "react";

import type {
  ChatMessage,
  PreviewPanelState,
  StartExecutionPayload,
} from "@/types/preview";
import type { StartNodeData } from "@/types/workflow";
import { ChatInterface } from "./ChatInterface";
import { ChatInput } from "./ChatInput";

interface PreviewPanelProps {
  isOpen: boolean;
  onClose: () => void;
  startNodeData: StartNodeData | null;
}

export function PreviewPanel({
  isOpen,
  onClose,
  startNodeData,
}: PreviewPanelProps) {
  const [state, setState] = useState<PreviewPanelState>({
    isOpen,
    isExecuting: false,
    messages: [],
    streamingMessage: null,
    inputVariables: {},
    error: null,
  });

  // Start execution handler
  const handleStartExecution = (payload: StartExecutionPayload) => {
    // Extract actual message content (not JSON)
    const messageContent =
      payload.inputVariables.input_as_text ||
      Object.values(payload.inputVariables)[0] ||
      "";

    setState((prev) => ({
      ...prev,
      isExecuting: true,
      inputVariables: payload.inputVariables,
      messages: [
        ...prev.messages,
        {
          id: `user-${Date.now()}`,
          role: "user" as const,
          content: String(messageContent),
          timestamp: Date.now(),
        },
      ],
    }));

    // TODO: Integrate with useWorkflowExecution hook
    console.log("Starting execution with:", payload);
  };

  // Approval response handler
  const handleApprovalResponse = (approvalId: string, approved: boolean) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((msg) =>
        "approvalId" in msg && msg.approvalId === approvalId
          ? { ...msg, status: approved ? "approved" : "rejected" }
          : msg
      ),
    }));

    // TODO: Send approval response to backend
    console.log("Approval response:", { approvalId, approved });
  };

  // Cancel execution handler
  const handleCancel = () => {
    setState((prev) => ({
      ...prev,
      isExecuting: false,
      streamingMessage: null,
    }));

    // TODO: Cancel actual backend execution
    console.log("Execution cancelled");
  };

  if (!isOpen) return null;

  return (
    <div className="h-full w-full bg-black border-l-2 border-gray-800 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-100">
          Test the workflow
        </h2>
        <div className="flex items-center gap-2">
          <button
            className="p-1 rounded-md hover:bg-gray-800 transition-colors"
            aria-label="Refresh"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="text-gray-400"
            >
              <path
                d="M14 8a6 6 0 1 1-2.5-4.87"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M11.5 3.13V6h2.87"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-800 transition-colors"
            aria-label="Close preview"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Chat Interface */}
      <ChatInterface
        messages={state.messages}
        streamingMessage={state.streamingMessage}
        isExecuting={state.isExecuting}
        onApprovalResponse={handleApprovalResponse}
      />

      {/* Chat Input */}
      <ChatInput
        startNodeData={startNodeData}
        isExecuting={state.isExecuting}
        onStartExecution={handleStartExecution}
        onCancel={handleCancel}
      />
    </div>
  );
}
