// Core workflow types for SentientFlow

export type NodeType =
  // Core
  | "start"
  | "agent"
  | "end"
  // Tools
  | "fileSearch"
  | "guardrails"
  | "mcp"
  // Logic
  | "ifElse"
  | "while"
  | "userApproval"
  // Data
  | "transform"
  | "setState"
  // Other
  | "note";

export type VariableType = "string" | "number" | "boolean" | "object" | "list";

export interface Variable {
  id: string;
  name: string;
  type: VariableType;
  defaultValue?: any;
  description?: string; // Description shown in Variable Picker
}

// Node Data Types
export interface StartNodeData {
  inputVariables: Variable[];
  stateVariables: Variable[];
}

export interface AgentNodeData {
  name: string;
  systemPrompt: string;
  userPrompt: string;
  model: string;

  // GPT-5 parameters
  reasoningEffort?: "minimal" | "low" | "medium" | "high";

  // Connection settings
  provider?: "openai" | "anthropic" | "gemini" | "grok"; // LLM provider (default: "openai")
  connectionId?: string; // Optional: specific connection ID (defaults to active connection)

  includeHistory: boolean;
  tools?: string[];
  outputFormat: "text" | "json";
  outputVariable?: string; // Variable name for agent output (default: "agent_response")
}

export interface EndNodeData {
  // End node has no additional data
}

export interface IfElseNodeData {
  conditions: Array<{
    id: string;
    name?: string;
    expression: string;
  }>;
}

export interface WhileNodeData {
  expression: string;
}

export interface TransformNodeData {
  name: string;
  outputType: "expressions" | "object";
  assignments: Array<{
    key: string;
    value: string; // CEL expression
  }>;
}

export interface SetStateNodeData {
  assignments: Array<{
    key: string;
    value: string;
  }>;
}

export interface NoteNodeData {
  content: string;
  color?: string;
}

export interface GuardrailsNodeData {
  name: string;
  input: string;
  categories: string[];
  piiCheck?: boolean;
  moderationCheck?: boolean;
  jailbreakCheck?: boolean;
  hallucinationCheck?: boolean;
  continueOnError?: boolean;
}

export interface FileSearchNodeData {
  name: string;
  query: string;
  files?: string[];
}

export interface MCPNodeData {
  name: string;
  server: string;
  method: string;
  params?: Record<string, any>;
}

export interface UserApprovalNodeData {
  message: string;
  timeout?: number;
}

// Union type for all node data
export type NodeData =
  | StartNodeData
  | AgentNodeData
  | EndNodeData
  | IfElseNodeData
  | WhileNodeData
  | TransformNodeData
  | SetStateNodeData
  | NoteNodeData
  | GuardrailsNodeData
  | FileSearchNodeData
  | MCPNodeData
  | UserApprovalNodeData;

// Custom node props type for node components
export interface CustomNodeProps<T = NodeData> {
  data: T;
  selected?: boolean;
  id?: string;
}

// ReactFlow Node type
export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
  width: number; // Node width (required for collision detection)
  height: number; // Node height (required for collision detection)
  deletable?: boolean; // Whether the node can be deleted (default: true)
  draggable?: boolean; // Whether the node can be dragged (default: true)
}

// ReactFlow Edge type
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  type?: "default" | "smoothstep" | "straight";
}

// Workflow metadata
export interface WorkflowMetadata {
  created: Date;
  modified: Date;
  author: string;
  tags: string[];
  version: string;
}

// Complete Workflow
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: Variable[];
  metadata: WorkflowMetadata;
}
