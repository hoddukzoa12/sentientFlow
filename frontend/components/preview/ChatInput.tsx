"use client";

import { useState, KeyboardEvent, ChangeEvent } from "react";
import { Paperclip, ArrowUp, Square } from "lucide-react";

import type { StartExecutionPayload } from "@/types/preview";
import type { StartNodeData, Variable } from "@/types/workflow";

interface ChatInputProps {
  startNodeData: StartNodeData | null;
  isExecuting: boolean;
  onStartExecution: (payload: StartExecutionPayload) => void;
  onCancel: () => void;
}

export function ChatInput({
  startNodeData,
  isExecuting,
  onStartExecution,
  onCancel,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [stateValues, setStateValues] = useState<Record<string, any>>({});

  const stateVariables = startNodeData?.stateVariables || [];

  const handleStateChange = (variableName: string, value: string) => {
    setStateValues((prev) => ({
      ...prev,
      [variableName]: value,
    }));
  };

  const handleSend = () => {
    if (!message.trim() || isExecuting) return;

    // Combine message and state variables
    const allInputVariables: Record<string, any> = {
      input_as_text: message.trim(),
    };

    // Add state variables (empty strings become null)
    stateVariables.forEach((variable) => {
      const value = stateValues[variable.name];
      if (value === "" || value === undefined) {
        allInputVariables[variable.name] = null;
      } else {
        // Type conversion
        if (variable.type === "number") {
          allInputVariables[variable.name] = Number(value);
        } else if (variable.type === "boolean") {
          allInputVariables[variable.name] = value === "true" || value === true;
        } else if (variable.type === "object" || variable.type === "list") {
          try {
            allInputVariables[variable.name] = JSON.parse(value);
          } catch {
            allInputVariables[variable.name] = value; // Keep as string if parse fails
          }
        } else {
          allInputVariables[variable.name] = value;
        }
      }
    });

    onStartExecution({ inputVariables: allInputVariables });

    setMessage("");
    // Keep state values for next execution
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getInputType = (variableType: Variable["type"]) => {
    switch (variableType) {
      case "number":
        return "number";
      case "boolean":
        return "checkbox";
      default:
        return "text";
    }
  };

  return (
    <div className="border-t border-gray-800 p-3 space-y-3">
      {/* State Variables (Optional) */}
      {stateVariables.length > 0 && (
        <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
          <div className="text-xs font-medium text-gray-400 mb-2">
            State Variables <span className="text-gray-500">(Optional)</span>
          </div>
          <div className="space-y-2">
            {stateVariables.map((variable) => (
              <div key={variable.id}>
                <label className="text-xs text-gray-300 block mb-1">
                  {variable.name}
                  <span className="text-gray-500 ml-1">({variable.type})</span>
                </label>
                {variable.type === "boolean" ? (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={stateValues[variable.name] === true || stateValues[variable.name] === "true"}
                      onChange={(e) => handleStateChange(variable.name, e.target.checked ? "true" : "false")}
                      disabled={isExecuting}
                      className="w-4 h-4 bg-gray-900 border-gray-700 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <span className="ml-2 text-xs text-gray-400">
                      {stateValues[variable.name] === true || stateValues[variable.name] === "true" ? "True" : "False"}
                    </span>
                  </div>
                ) : variable.type === "object" || variable.type === "list" ? (
                  <textarea
                    value={stateValues[variable.name] || ""}
                    onChange={(e) => handleStateChange(variable.name, e.target.value)}
                    placeholder={`Enter JSON ${variable.type} (optional)`}
                    disabled={isExecuting}
                    rows={2}
                    className="w-full px-2 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none"
                  />
                ) : (
                  <input
                    type={getInputType(variable.type)}
                    value={stateValues[variable.name] || ""}
                    onChange={(e) => handleStateChange(variable.name, e.target.value)}
                    placeholder={`Enter ${variable.type} (optional)`}
                    disabled={isExecuting}
                    className="w-full px-2 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="flex items-center gap-2 bg-gray-900 rounded-lg px-3 py-2 border border-gray-700 focus-within:border-gray-600">
        {/* Attachment button */}
        <button
          className="p-1 text-gray-400 hover:text-gray-300 transition-colors"
          aria-label="Attach file"
        >
          <Paperclip size={18} />
        </button>

        {/* Message input */}
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message..."
          disabled={isExecuting}
          className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-500 outline-none disabled:opacity-50"
        />

        {/* Send/Stop button */}
        {isExecuting ? (
          <button
            onClick={onCancel}
            className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors"
            aria-label="Stop execution"
          >
            <Square size={14} className="text-white" fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="w-7 h-7 rounded-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 flex items-center justify-center transition-colors"
            aria-label="Send message"
          >
            <ArrowUp size={16} className="text-gray-300" />
          </button>
        )}
      </div>
    </div>
  );
}
