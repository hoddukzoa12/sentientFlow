/**
 * Parse Server-Sent Events (SSE) from a fetch Response stream.
 * Yields parsed events with type and data.
 */
export async function* parseSSEStream(
  response: Response
): AsyncGenerator<{ type: string; data: string }> {
  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Split by newlines
      const lines = buffer.split("\n");

      // Keep last incomplete line in buffer
      buffer = lines.pop() || "";

      // Parse SSE format
      let event: { type?: string; data?: string } = {};

      for (const line of lines) {
        if (line.startsWith("event:")) {
          event.type = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          event.data = line.slice(5).trim();
        } else if (line === "" && event.type && event.data) {
          // Empty line marks end of event
          yield event as { type: string; data: string };
          event = {};
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
