/**
 * Types for chat-based workflow preview and execution.
 * Converts SSE events from backend into conversational chat messages.
 */

import type { NodeType } from "./workflow";

// ============================================================================
// Chat Message Types
// ============================================================================

export type ChatMessageRole = "user" | "agent" | "system";
export type SystemMessageType = "node_start" | "node_complete" | "workflow_start" | "workflow_complete";

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: number;
  nodeId?: string; // Associated workflow node
  nodeName?: string; // Display name of the node
  nodeType?: NodeType; // Type of the node
  messageType?: SystemMessageType; // Type of system message
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
// Node Execution Block (New Architecture)
// ============================================================================

export interface NodeExecutionBlock {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeType: NodeType;

  // Execution state
  status: "executing" | "completed" | "error";
  startedAt: number;
  completedAt?: number;

  // Content streams
  thinkingChunks: string[];      // Completed thinking chunks
  streamingThinking: string;     // Currently streaming thinking
  responseChunks: string[];      // Completed response chunks
  streamingResponse: string;     // Currently streaming response

  // Timing control
  thinkingComplete?: boolean;    // True when thinking is done, allows response to show

  // Error handling
  error?: string;
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
