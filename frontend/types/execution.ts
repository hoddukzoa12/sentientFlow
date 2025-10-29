/**
 * Types for workflow execution and event streaming.
 * Corresponds to Sentient Framework's ResponseEvent system.
 */

// ============================================================================
// Execution Status
// ============================================================================

export type ExecutionStatus = "idle" | "running" | "completed" | "error";

// ============================================================================
// SSE Event Types (from Sentient Framework)
// ============================================================================

export type EventType =
  | "TEXT_BLOCK"
  | "TEXT_CHUNK"
  | "JSON"
  | "ERROR"
  | "DONE"
  | "WORKFLOW_START"
  | "NODE_START"
  | "NODE_COMPLETE"
  | "BRANCH_TAKEN"
  | "LOOP_ITERATION";

// ============================================================================
// Event Payloads
// ============================================================================

export interface BaseEvent {
  type: EventType;
  timestamp: number;
}

export interface TextBlockEvent extends BaseEvent {
  type: "TEXT_BLOCK" | "WORKFLOW_START" | "NODE_START" | "NODE_COMPLETE" | "BRANCH_TAKEN" | "LOOP_ITERATION";
  eventName: string;
  content: string;
  nodeId?: string;
}

export interface TextChunkEvent extends BaseEvent {
  type: "TEXT_CHUNK";
  streamId: string;
  content: string;
  isComplete: boolean;
}

export interface JsonEvent extends BaseEvent {
  type: "JSON";
  eventName: string;
  content: Record<string, any>;
  nodeId?: string;
}

export interface ErrorEvent extends BaseEvent {
  type: "ERROR";
  errorMessage: string;
  errorCode: number;
  nodeId?: string;
}

export interface DoneEvent extends BaseEvent {
  type: "DONE";
}

export type WorkflowEvent =
  | TextBlockEvent
  | TextChunkEvent
  | JsonEvent
  | ErrorEvent
  | DoneEvent;

// ============================================================================
// Execution Request/Response
// ============================================================================

export interface WorkflowExecutionRequest {
  workflowId: string;
  workflowDefinition: {
    id: string;
    name: string;
    version: string;
    nodes: any[]; // Will use WorkflowNode[] once imported
    edges: any[]; // Will use WorkflowEdge[] once imported
    variables?: any[];
  };
  inputVariables: Record<string, any>;
  sessionContext?: {
    userId?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
  };
}

export interface ExecutionContextDTO {
  workflowId: string;
  sessionId: string;
  variables: Record<string, any>;
  scopedVariables: Record<string, Record<string, any>>;
  executionHistory: NodeExecutionRecord[];
  startedAt: string;
  metadata: Record<string, any>;
}

export interface NodeExecutionRecord {
  nodeId: string;
  timestamp: string;
  success: boolean;
  duration?: number;
  error?: string;
}

// ============================================================================
// Stream Buffer State
// ============================================================================

export interface StreamBuffer {
  streamId: string;
  content: string;
  startedAt: number;
}

// ============================================================================
// Execution Result
// ============================================================================

export interface ExecutionResult {
  status: ExecutionStatus;
  events: WorkflowEvent[];
  finalContext?: ExecutionContextDTO;
  error?: string;
}
