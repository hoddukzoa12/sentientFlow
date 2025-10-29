"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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

  const eventSourceRef = useRef<EventSource | null>(null);

  const cancel = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setStatus("idle");
    }
  }, []);

  const clear = useCallback(() => {
    setEvents([]);
    setStreamBuffers(new Map());
    setStatus("idle");
  }, []);

  const execute = useCallback(
    (request: Omit<WorkflowExecutionRequest, "workflowId">) => {
      // Clear previous execution
      clear();
      setStatus("running");

      // Build query parameters
      const params = new URLSearchParams({
        workflowId,
        inputVariables: JSON.stringify(request.inputVariables),
      });

      // Create EventSource connection
      const url = `http://localhost:8000/api/workflows/${workflowId}/execute?${params}`;
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      // TEXT_BLOCK events
      eventSource.addEventListener("TEXT_BLOCK", (e) => {
        const data = JSON.parse(e.data);
        setEvents((prev) => [
          ...prev,
          {
            type: "TEXT_BLOCK",
            timestamp: Date.now(),
            eventName: data.eventName,
            content: data.content,
            nodeId: data.nodeId,
          },
        ]);
      });

      // TEXT_CHUNK events (streaming)
      eventSource.addEventListener("TEXT_CHUNK", (e) => {
        const data = JSON.parse(e.data);

        setStreamBuffers((prev) => {
          const newBuffers = new Map(prev);
          const currentContent = newBuffers.get(data.streamId) || "";

          if (data.isComplete) {
            // Stream complete - move to events
            newBuffers.delete(data.streamId);
            setEvents((prevEvents) => [
              ...prevEvents,
              {
                type: "TEXT_BLOCK",
                timestamp: Date.now(),
                eventName: "STREAM_COMPLETE",
                content: currentContent,
              },
            ]);
          } else {
            // Append chunk
            newBuffers.set(data.streamId, currentContent + data.content);
          }

          return newBuffers;
        });
      });

      // JSON events
      eventSource.addEventListener("JSON", (e) => {
        const data = JSON.parse(e.data);
        setEvents((prev) => [
          ...prev,
          {
            type: "JSON",
            timestamp: Date.now(),
            eventName: data.eventName,
            content: data.content,
            nodeId: data.nodeId,
          },
        ]);
      });

      // ERROR events
      eventSource.addEventListener("ERROR", (e) => {
        const data = JSON.parse(e.data);
        setEvents((prev) => [
          ...prev,
          {
            type: "ERROR",
            timestamp: Date.now(),
            errorMessage: data.errorMessage,
            errorCode: data.errorCode,
            nodeId: data.nodeId,
          },
        ]);
        setStatus("error");
        eventSource.close();
      });

      // DONE event
      eventSource.addEventListener("DONE", () => {
        setEvents((prev) => [
          ...prev,
          {
            type: "DONE",
            timestamp: Date.now(),
          },
        ]);
        setStatus("completed");
        eventSource.close();
      });

      // Connection error
      eventSource.onerror = (error) => {
        console.error("EventSource error:", error);
        setStatus("error");
        setEvents((prev) => [
          ...prev,
          {
            type: "ERROR",
            timestamp: Date.now(),
            errorMessage: "Connection to server failed",
            errorCode: 500,
          },
        ]);
        eventSource.close();
      };
    },
    [workflowId, clear]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    events,
    status,
    streamBuffers,
    execute,
    cancel,
    clear,
  };
}
