"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface JsonEditorProps {
  value: object | string;
  onChange: (value: object) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
}

export function JsonEditor({
  value,
  onChange,
  placeholder = '{\n  "key": "value"\n}',
  rows = 6,
  className,
  disabled = false,
}: JsonEditorProps) {
  // Convert object to JSON string for editing
  const [jsonString, setJsonString] = useState(() => {
    if (typeof value === "string") {
      return value;
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "";
    }
  });

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);

  // Sync external value changes
  useEffect(() => {
    if (typeof value === "string") {
      setJsonString(value);
    } else {
      try {
        const newString = JSON.stringify(value, null, 2);
        if (newString !== jsonString) {
          setJsonString(newString);
        }
      } catch {
        // Ignore
      }
    }
  }, [value]);

  // Handle text change with validation
  const handleChange = (newValue: string) => {
    setJsonString(newValue);

    // Try to parse JSON
    try {
      const parsed = JSON.parse(newValue);
      setIsValid(true);
      setValidationError(null);
      onChange(parsed);
    } catch (error) {
      setIsValid(false);
      if (error instanceof Error) {
        setValidationError(error.message);
      } else {
        setValidationError("Invalid JSON");
      }
    }
  };

  // Format JSON (pretty print)
  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonString);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonString(formatted);
      setIsValid(true);
      setValidationError(null);
      onChange(parsed);
    } catch (error) {
      // Keep current invalid state
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Editor */}
      <div className="relative">
        <textarea
          value={jsonString}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className={cn(
            "w-full rounded-md border px-3 py-2",
            "text-sm shadow-xs transition-[color,box-shadow] outline-none",
            "placeholder:text-muted-foreground",
            "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "resize-none font-mono", // monospace for JSON
            isValid
              ? "border-input bg-transparent focus-visible:border-ring"
              : "border-destructive bg-destructive/5 focus-visible:border-destructive",
            className
          )}
        />
      </div>

      {/* Validation Status */}
      <div className="flex items-start justify-between gap-2">
        {/* Status Message */}
        <div className="flex items-center gap-1.5 text-xs">
          {isValid ? (
            <>
              <CheckCircle2 className="size-3.5 text-green-500" />
              <span className="text-green-600 dark:text-green-400">
                Valid JSON
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="size-3.5 text-destructive" />
              <span className="text-destructive">
                {validationError || "Invalid JSON"}
              </span>
            </>
          )}
        </div>

        {/* Format Button */}
        <button
          type="button"
          onClick={handleFormat}
          disabled={disabled || !isValid}
          className={cn(
            "text-xs text-muted-foreground hover:text-foreground",
            "transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          Format
        </button>
      </div>
    </div>
  );
}
