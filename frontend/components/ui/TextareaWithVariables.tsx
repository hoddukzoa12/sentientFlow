"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { VariablePicker } from "@/components/ui/VariablePicker";
import type { Variable } from "@/types/workflow";

interface TextareaWithVariablesProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  availableVariables: Variable[];
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
}

export function TextareaWithVariables({
  label,
  value,
  onChange,
  availableVariables,
  placeholder,
  rows = 4,
  className,
  disabled = false,
}: TextareaWithVariablesProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Ignore clicks on button, picker, or textarea
      if (
        buttonRef.current?.contains(target) ||
        pickerRef.current?.contains(target) ||
        textareaRef.current?.contains(target)
      ) {
        return;
      }

      setShowPicker(false);
    };

    if (showPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showPicker]);

  // Handle variable selection
  const handleSelectVariable = (variableName: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Insert ${variableName} at cursor position
    const before = value.substring(0, start);
    const after = value.substring(end);
    const newValue = `${before}\${${variableName}}${after}`;

    onChange(newValue);

    // Close picker
    setShowPicker(false);

    // Set cursor position after inserted variable
    const newCursorPos = start + variableName.length + 3; // ${} = 3 chars + varName
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Update cursor position on textarea interaction
  const handleTextareaClick = () => {
    if (textareaRef.current) {
      setCursorPosition(textareaRef.current.selectionStart);
    }
  };

  const handleTextareaKeyUp = () => {
    if (textareaRef.current) {
      setCursorPosition(textareaRef.current.selectionStart);
    }
  };

  // Highlight variables in the text
  const highlightedValue = React.useMemo(() => {
    const variableNames = availableVariables.map((v) => v.name);
    const regex = /\$\{([^}]+)\}/g;

    return value.replace(regex, (match, varName) => {
      const isValid = variableNames.includes(varName.trim());
      return match; // Keep original text (highlighting done in overlay)
    });
  }, [value, availableVariables]);

  return (
    <div className="flex flex-col gap-1.5">
      {/* Label */}
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-medium text-gray-300">
            {label}
          </label>
          {availableVariables.length > 0 && (
            <button
              ref={buttonRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowPicker(!showPicker);
              }}
              disabled={disabled}
              className="text-xs text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
            >
              {showPicker ? (
                <>
                  <X className="inline size-3 mr-1" />
                  Close
                </>
              ) : (
                <>
                  <Plus className="inline size-3 mr-1" />
                  Add Context
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Textarea Container */}
      <div className="relative">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={handleTextareaClick}
          onKeyUp={handleTextareaKeyUp}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className={cn(
            "w-full px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700",
            "text-gray-100 text-xs placeholder:text-gray-500",
            "focus:outline-none focus:ring-2 focus:ring-blue-500",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "resize-none",
            className
          )}
        />

        {/* Variable Picker Dropdown */}
        {showPicker && (
          <div
            ref={pickerRef}
            className="absolute top-full left-0 mt-2 z-50 animate-in fade-in-0 zoom-in-95"
          >
            <VariablePicker
              availableVariables={availableVariables}
              onSelectVariable={handleSelectVariable}
            />
          </div>
        )}
      </div>

      {/* Helper Text */}
      {availableVariables.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Add variables in the Start node to use them here.
        </p>
      )}
    </div>
  );
}
