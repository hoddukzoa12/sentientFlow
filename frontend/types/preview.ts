/**
 * Types for chat-based workflow preview and execution.
 * Converts SSE events from backend into conversational chat messages.
 */

// ============================================================================
// Chat Message Types
// ============================================================================

export type ChatMessageRole = "user" | "agent" | "system";

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: number;
  nodeId?: string; // Associated workflow node
  metadata?: Record<string, any>;
}

// ============================================================================
// User Approval Messages (Interactive)
// ============================================================================

export interface UserApprovalMessage extends ChatMessage {
  role: "system";
  approvalId: string;
  approvalNodeId: string;
  status: "pending" | "approved" | "rejected";
}

// ============================================================================
// Streaming State
// ============================================================================

export interface StreamingMessage {
  id: string;
  role: "agent";
  content: string;
  isComplete: boolean;
  timestamp: number;
  nodeId?: string;
}

// ============================================================================
// Preview Panel State
// ============================================================================

export interface PreviewPanelState {
  isOpen: boolean;
  isExecuting: boolean;
  messages: ChatMessage[];
  streamingMessage: StreamingMessage | null;
  inputVariables: Record<string, any>; // From Start node
  error: string | null;
}

// ============================================================================
// User Actions
// ============================================================================

export interface StartExecutionPayload {
  inputVariables: Record<string, any>;
}

export interface ApprovalResponsePayload {
  approvalId: string;
  approved: boolean;
}
