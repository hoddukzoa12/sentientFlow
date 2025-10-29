"use client";

import { X } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import { useWorkflowExecution } from "@/hooks/useWorkflowExecution";

import type {
  ChatMessage,
  NodeExecutionBlock,
  PreviewPanelState,
  StartExecutionPayload,
  StreamingMessage,
} from "@/types/preview";
import type { StartNodeData } from "@/types/workflow";
import type { WorkflowEvent } from "@/types/execution";
import { ChatInterface } from "./ChatInterface";
import { ChatInput } from "./ChatInput";
import { getNodeDisplayName } from "@/lib/utils/node-helpers";

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
  const { nodes, edges, setExecutingNodeId, setCompletedNodes, clearExecutionState } = useWorkflowStore();
  const [userMessages, setUserMessages] = useState<ChatMessage[]>([]);
  const workflowId = useMemo(() => `workflow-${Date.now()}`, []);

  // Use workflow execution hook
  const { events, status, streamBuffers, executingNodeId, completedNodes, currentExecutionId, execute, cancel, clear } = useWorkflowExecution(workflowId);

  // Sync execution state to Zustand store for canvas node visualization
  useEffect(() => {
    setExecutingNodeId(executingNodeId);
    setCompletedNodes(completedNodes);
  }, [executingNodeId, completedNodes, setExecutingNodeId, setCompletedNodes]);

  // Convert WorkflowEvents to NodeExecutionBlocks
  const nodeBlocks = useMemo(() => {
    const blocks = new Map<string, NodeExecutionBlock>();
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));

    // Track current execution ID as we process events
    let currentExecId = currentExecutionId || `exec-${Date.now()}`;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      // Update executionId when new workflow starts
      if (event.type === "TEXT_BLOCK" && event.eventName === "WORKFLOW_START") {
        currentExecId = `exec-${event.timestamp}`;
      }

      if (event.type === "TEXT_BLOCK") {
        const node = event.nodeId ? nodeMap.get(event.nodeId) : null;
        const nodeName = getNodeDisplayName(node);
        const nodeType = node?.type || "agent";

        // Block ID includes executionId to separate different runs
        const blockId = event.nodeId ? `${event.nodeId}-${currentExecId}` : null;

        // Initialize or get block
        if (blockId && !blocks.has(blockId)) {
          blocks.set(blockId, {
            id: `block-${blockId}`,
            nodeId: event.nodeId!,
            nodeName,
            nodeType,
            status: "executing",
            startedAt: event.timestamp,
            thinkingChunks: [],
            streamingThinking: "",
            responseChunks: [],
            streamingResponse: "",
          });
        }

        const block = blockId ? blocks.get(blockId) : null;

        // Handle NODE_COMPLETE
        if (event.eventName === "NODE_COMPLETE" && block) {
          block.status = "completed";
          block.completedAt = event.timestamp;
        }
      } else if (event.type === "TEXT_CHUNK") {
        // Get stream data
        const streamData = event as any;
        const streamId = streamData.streamId;
        const content = streamData.content;
        const isComplete = streamData.isComplete;
        const eventName = streamData.eventName;

        // Get nodeId directly from event data (provided by backend)
        const nodeId = streamData.nodeId;

        if (!nodeId) {
          console.error("TEXT_CHUNK missing nodeId", { streamId, eventName });
          continue;
        }

        // Block ID includes executionId to separate different runs
        const blockId = `${nodeId}-${currentExecId}`;

        // Create block if it doesn't exist (TEXT_CHUNK may arrive before TEXT_BLOCK)
        if (!blocks.has(blockId)) {
          const node = nodeMap.get(nodeId);
          blocks.set(blockId, {
            id: `block-${blockId}`,
            nodeId: nodeId,
            nodeName: getNodeDisplayName(node),
            nodeType: node?.type || "agent",
            status: "executing",
            startedAt: event.timestamp,
            thinkingChunks: [],
            streamingThinking: "",
            responseChunks: [],
            streamingResponse: "",
          });
        }

        const block = blocks.get(blockId)!;

        if (eventName === "AGENT_THINKING") {
          if (isComplete) {
            // Move streaming to completed chunks
            if (block.streamingThinking) {
              block.thinkingChunks.push(block.streamingThinking);
              block.streamingThinking = "";
            }
          } else {
            // Append to streaming thinking
            block.streamingThinking += content;
          }
        } else if (eventName === "AGENT_RESPONSE") {
          if (isComplete) {
            // Move streaming to completed chunks
            if (block.streamingResponse) {
              block.responseChunks.push(block.streamingResponse);
              block.streamingResponse = "";
            }
          } else {
            // Append to streaming response
            block.streamingResponse += content;
          }
        }
      } else if (event.type === "ERROR") {
        const node = event.nodeId ? nodeMap.get(event.nodeId) : null;

        if (event.nodeId) {
          // Block ID includes executionId to separate different runs
          const blockId = `${event.nodeId}-${currentExecId}`;
          let block = blocks.get(blockId);
          if (!block) {
            // Create block for error
            block = {
              id: `block-${blockId}`,
              nodeId: event.nodeId,
              nodeName: getNodeDisplayName(node),
              nodeType: node?.type || "agent",
              status: "error",
              startedAt: event.timestamp,
              thinkingChunks: [],
              streamingThinking: "",
              responseChunks: [],
              streamingResponse: "",
              error: event.errorMessage,
            };
            blocks.set(blockId, block);
          } else {
            block.status = "error";
            block.error = event.errorMessage;
          }
        }
      }
    }

    return Array.from(blocks.values()).sort((a, b) => a.startedAt - b.startedAt);
  }, [events, nodes, currentExecutionId]);

  // Convert stream buffers to streaming message
  const streamingMessage: StreamingMessage | null = useMemo(() => {
    if (streamBuffers.size === 0) return null;

    // Get first stream buffer (usually only one)
    const firstBuffer = Array.from(streamBuffers.values())[0];
    return firstBuffer
      ? {
          id: `stream-${Date.now()}`,
          role: "agent" as const,
          content: firstBuffer,
          isComplete: false,
          timestamp: Date.now(),
        }
      : null;
  }, [streamBuffers]);

  // Start execution handler
  const handleStartExecution = (payload: StartExecutionPayload) => {
    // Extract actual message content (not JSON)
    const messageContent =
      payload.inputVariables.input_as_text ||
      Object.values(payload.inputVariables)[0] ||
      "";

    // Add user message
    setUserMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: "user" as const,
        content: String(messageContent),
        timestamp: Date.now(),
      },
    ]);

    // Find start node and extract variables
    const startNode = nodes.find((node) => node.type === "start");
    const startData = startNode?.data as StartNodeData | undefined;
    const variables = [
      ...(startData?.inputVariables || []),
      ...(startData?.stateVariables || []),
    ];

    // Execute workflow
    execute({
      workflowDefinition: {
        id: workflowId,
        name: "Preview Workflow",
        version: "1.0.0",
        nodes,
        edges,
        variables,
      },
      inputVariables: payload.inputVariables,
    });
  };

  // Approval response handler
  const handleApprovalResponse = (approvalId: string, approved: boolean) => {
    // TODO: Send approval response to backend
    console.log("Approval response:", { approvalId, approved });
  };

  // Cancel execution handler
  const handleCancel = () => {
    cancel();
  };

  // Refresh handler
  const handleRefresh = () => {
    clear();
    setUserMessages([]);
    clearExecutionState();
  };

  // Clear execution state on unmount
  useEffect(() => {
    return () => {
      clearExecutionState();
    };
  }, [clearExecutionState]);

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
            onClick={handleRefresh}
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
        userMessages={userMessages}
        nodeBlocks={nodeBlocks}
        isExecuting={status === "running"}
        executingNodeId={executingNodeId}
        onApprovalResponse={handleApprovalResponse}
      />

      {/* Chat Input */}
      <ChatInput
        startNodeData={startNodeData}
        isExecuting={status === "running"}
        onStartExecution={handleStartExecution}
        onCancel={handleCancel}
      />
    </div>
  );
}
