"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { parseSSEStream } from "@/lib/utils/sse-parser";
import type {
  WorkflowEvent,
  ExecutionStatus,
  StreamBuffer,
  WorkflowExecutionRequest,
} from "@/types/execution";

interface UseWorkflowExecutionReturn {
  events: WorkflowEvent[];
  status: ExecutionStatus;
  streamBuffers: Map<string, string>;
  executingNodeId: string | null;
  completedNodes: Set<string>;
  currentExecutionId: string | null;
  execute: (request: Omit<WorkflowExecutionRequest, "workflowId">) => void;
  cancel: () => void;
  clear: () => void;
}

export function useWorkflowExecution(
  workflowId: string
): UseWorkflowExecutionReturn {
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [status, setStatus] = useState<ExecutionStatus>("idle");
  const [streamBuffers, setStreamBuffers] = useState<Map<string, string>>(
    new Map()
  );
  const [executingNodeId, setExecutingNodeId] = useState<string | null>(null);
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set());
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setStatus("idle");
    }
  }, []);

  const clear = useCallback(() => {
    setEvents([]);
    setStreamBuffers(new Map());
    setStatus("idle");
    setExecutingNodeId(null);
    setCompletedNodes(new Set());
  }, []);

  const execute = useCallback(
    async (request: Omit<WorkflowExecutionRequest, "workflowId">) => {
      // Don't clear previous executions - keep chat history
      // Only the Refresh button should clear history

      // Generate unique execution ID for this workflow run
      const executionId = `exec-${Date.now()}`;
      setCurrentExecutionId(executionId);
      setStatus("running");

      // Create AbortController for cancellation
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        // Send POST request with workflow data in body
        const response = await fetch(
          `http://localhost:8000/api/workflows/${workflowId}/execute`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              workflowId,
              workflowDefinition: request.workflowDefinition,
              inputVariables: request.inputVariables,
            }),
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Parse SSE stream
        for await (const event of parseSSEStream(response)) {
          const eventType = event.type;
          const eventData = JSON.parse(event.data);

          if (eventType === "TEXT_BLOCK") {
            // Track node execution state
            if (eventData.eventName === "NODE_START" && eventData.nodeId) {
              setExecutingNodeId(eventData.nodeId);
            } else if (eventData.eventName === "NODE_COMPLETE" && eventData.nodeId) {
              setCompletedNodes((prev) => new Set(prev).add(eventData.nodeId));
              setExecutingNodeId(null);
            } else if (eventData.eventName === "WORKFLOW_COMPLETE") {
              setExecutingNodeId(null);
            }

            setEvents((prev) => [
              ...prev,
              {
                type: "TEXT_BLOCK",
                timestamp: Date.now(),
                eventName: eventData.eventName,
                content: eventData.content,
                nodeId: eventData.nodeId,
              },
            ]);
          } else if (eventType === "TEXT_CHUNK") {
            // Add TEXT_CHUNK to events array for PreviewPanel
            setEvents((prev) => [
              ...prev,
              {
                type: "TEXT_CHUNK",
                timestamp: Date.now(),
                streamId: eventData.streamId,
                eventName: eventData.eventName,
                content: eventData.content,
                isComplete: eventData.isComplete,
                nodeId: eventData.nodeId,
              },
            ]);

            // Keep existing streamBuffers logic for compatibility
            setStreamBuffers((prev) => {
              const newBuffers = new Map(prev);
              const currentContent = newBuffers.get(eventData.streamId) || "";

              if (eventData.isComplete) {
                // Stream complete
                newBuffers.delete(eventData.streamId);
              } else {
                // Append chunk
                newBuffers.set(eventData.streamId, currentContent + eventData.content);
              }

              return newBuffers;
            });
          } else if (eventType === "JSON") {
            setEvents((prev) => [
              ...prev,
              {
                type: "JSON",
                timestamp: Date.now(),
                eventName: eventData.eventName,
                content: eventData.content,
                nodeId: eventData.nodeId,
              },
            ]);
          } else if (eventType === "ERROR") {
            setEvents((prev) => [
              ...prev,
              {
                type: "ERROR",
                timestamp: Date.now(),
                errorMessage: eventData.errorMessage,
                errorCode: eventData.errorCode,
                nodeId: eventData.nodeId,
              },
            ]);
            setStatus("error");
            break;
          } else if (eventType === "DONE") {
            setEvents((prev) => [
              ...prev,
              {
                type: "DONE",
                timestamp: Date.now(),
              },
            ]);
            setStatus("completed");
            break;
          }
        }
      } catch (error: any) {
        if (error.name === "AbortError") {
          // Cancelled by user
          console.log("Execution cancelled");
          setStatus("idle");
        } else {
          console.error("Execution error:", error);
          setStatus("error");
          setEvents((prev) => [
            ...prev,
            {
              type: "ERROR",
              timestamp: Date.now(),
              errorMessage: error.message || "Connection to server failed",
              errorCode: 500,
            },
          ]);
        }
      } finally {
        abortControllerRef.current = null;
      }
    },
    [workflowId]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    events,
    status,
    streamBuffers,
    executingNodeId,
    completedNodes,
    currentExecutionId,
    execute,
    cancel,
    clear,
  };
}
