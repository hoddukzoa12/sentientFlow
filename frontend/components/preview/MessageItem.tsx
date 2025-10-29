"use client";

import { Bot, User, CheckCircle, XCircle } from "lucide-react";

import type { ChatMessage, UserApprovalMessage } from "@/types/preview";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface MessageItemProps {
  message: ChatMessage;
  onApprovalResponse?: (approvalId: string, approved: boolean) => void;
}

export function MessageItem({ message, onApprovalResponse }: MessageItemProps) {
  const isUserApproval = message.role === "system" && "approvalId" in message;
  const approvalMessage = isUserApproval ? (message as UserApprovalMessage) : null;

  const timestamp = new Date(message.timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // User message - right aligned
  if (message.role === "user") {
    return (
      <div className="flex justify-end gap-2 mb-4">
        <div className="flex flex-col items-end max-w-[220px]">
          <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-3 py-2">
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          </div>
          <span className="text-[10px] text-gray-500 mt-1">{timestamp}</span>
        </div>
        <Avatar className="w-7 h-7 flex-shrink-0">
          <AvatarFallback className="bg-blue-600 text-white text-xs">
            <User size={14} />
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }

  // Agent message - left aligned
  if (message.role === "agent") {
    return (
      <div className="flex gap-2 mb-4">
        <Avatar className="w-7 h-7 flex-shrink-0">
          <AvatarFallback className="bg-gray-700 text-gray-300 text-xs">
            <Bot size={14} />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col items-start max-w-[220px]">
          <div className="bg-gray-800 text-gray-100 rounded-2xl rounded-tl-sm px-3 py-2">
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          </div>
          <span className="text-[10px] text-gray-500 mt-1">{timestamp}</span>
        </div>
      </div>
    );
  }

  // System message (UserApproval) - centered
  return (
    <div className="flex flex-col items-center mb-4 gap-2">
      <div className="bg-orange-900/30 border border-orange-700/50 text-orange-200 rounded-lg px-3 py-2 max-w-[240px]">
        <p className="text-xs text-center whitespace-pre-wrap">
          {message.content}
        </p>
      </div>

      {/* User Approval Interactive Buttons */}
      {approvalMessage && approvalMessage.status === "pending" && (
        <div className="flex gap-2 w-full max-w-[240px]">
          <Button
            onClick={() =>
              onApprovalResponse?.(approvalMessage.approvalId, true)
            }
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white h-8"
          >
            <CheckCircle size={14} className="mr-1" />
            Approve
          </Button>
          <Button
            onClick={() =>
              onApprovalResponse?.(approvalMessage.approvalId, false)
            }
            size="sm"
            variant="destructive"
            className="flex-1 h-8"
          >
            <XCircle size={14} className="mr-1" />
            Reject
          </Button>
        </div>
      )}

      {/* Approval Status Display */}
      {approvalMessage && approvalMessage.status !== "pending" && (
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
            approvalMessage.status === "approved"
              ? "bg-green-900/50 text-green-300"
              : "bg-red-900/50 text-red-300"
          }`}
        >
          {approvalMessage.status === "approved" ? (
            <>
              <CheckCircle size={12} />
              Approved
            </>
          ) : (
            <>
              <XCircle size={12} />
              Rejected
            </>
          )}
        </div>
      )}

      <span className="text-[10px] text-gray-500">{timestamp}</span>
    </div>
  );
}
