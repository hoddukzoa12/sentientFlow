"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type SSEEventType = "TEXT_BLOCK" | "TEXT_CHUNK" | "JSON" | "ERROR" | "DONE";

export interface SSEEvent {
  type: SSEEventType;
  data: any;
}

interface UseEventStreamOptions {
  onEvent?: (event: SSEEvent) => void;
  onError?: (error: string) => void;
  onComplete?: () => void;
}

export function useEventStream(
  url: string | null,
  options?: UseEventStreamOptions
) {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    // No URL provided, skip connection
    if (!url) {
      disconnect();
      return;
    }

    // Create EventSource connection
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onerror = (err) => {
      console.error("SSE connection error:", err);
      const errorMessage = "Failed to connect to server";
      setError(errorMessage);
      setIsConnected(false);
      options?.onError?.(errorMessage);
      disconnect();
    };

    // Handle different event types
    eventSource.addEventListener("TEXT_BLOCK", (e: MessageEvent) => {
      const event: SSEEvent = {
        type: "TEXT_BLOCK",
        data: JSON.parse(e.data),
      };
      setEvents((prev) => [...prev, event]);
      options?.onEvent?.(event);
    });

    eventSource.addEventListener("TEXT_CHUNK", (e: MessageEvent) => {
      const event: SSEEvent = {
        type: "TEXT_CHUNK",
        data: JSON.parse(e.data),
      };
      setEvents((prev) => [...prev, event]);
      options?.onEvent?.(event);
    });

    eventSource.addEventListener("JSON", (e: MessageEvent) => {
      const event: SSEEvent = {
        type: "JSON",
        data: JSON.parse(e.data),
      };
      setEvents((prev) => [...prev, event]);
      options?.onEvent?.(event);
    });

    eventSource.addEventListener("ERROR", (e: MessageEvent) => {
      const event: SSEEvent = {
        type: "ERROR",
        data: JSON.parse(e.data),
      };
      setEvents((prev) => [...prev, event]);
      const errorMessage = event.data.message || "Execution error";
      setError(errorMessage);
      options?.onError?.(errorMessage);
      options?.onEvent?.(event);
    });

    eventSource.addEventListener("DONE", (e: MessageEvent) => {
      const event: SSEEvent = {
        type: "DONE",
        data: JSON.parse(e.data),
      };
      setEvents((prev) => [...prev, event]);
      options?.onEvent?.(event);
      options?.onComplete?.();
      disconnect();
    });

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [url, disconnect, options]);

  return {
    events,
    isConnected,
    error,
    disconnect,
  };
}
