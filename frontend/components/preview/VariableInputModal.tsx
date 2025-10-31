"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagInput } from "@/components/ui/TagInput";
import { JsonEditor } from "@/components/ui/JsonEditor";
import type { Variable } from "@/types/workflow";

interface VariableInputModalProps {
  stateVariables: Variable[];
  onSubmit: (values: Record<string, any>) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export function VariableInputModal({
  stateVariables,
  onSubmit,
  onCancel,
  isOpen,
}: VariableInputModalProps) {
  const [values, setValues] = useState<Record<string, any>>({});

  // Initialize values with defaults
  useEffect(() => {
    if (isOpen) {
      const initialValues: Record<string, any> = {};
      stateVariables.forEach((variable) => {
        initialValues[variable.name] = variable.defaultValue ?? getDefaultForType(variable.type);
      });
      setValues(initialValues);
    }
  }, [isOpen, stateVariables]);

  // Get default value based on type
  const getDefaultForType = (type: Variable["type"]) => {
    switch (type) {
      case "string":
        return "";
      case "number":
        return 0;
      case "boolean":
        return false;
      case "list":
        return [];
      case "object":
        return {};
      default:
        return "";
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  // Handle value change
  const handleChange = (name: string, value: any) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={cn(
            "w-full max-w-lg max-h-[85vh] overflow-hidden",
            "rounded-lg border border-input bg-background shadow-lg",
            "animate-in fade-in-0 zoom-in-95"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-input px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold">Input State Variables</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Provide values for workflow state variables
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onCancel}
              className="shrink-0"
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col">
            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Info about input_as_text */}
              <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                <strong>input_as_text</strong> is automatically set from your chat
                message
              </div>

              {/* State Variables */}
              {stateVariables.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No state variables defined. Add them in the Start node.
                </div>
              ) : (
                stateVariables.map((variable) => (
                  <div key={variable.id} className="flex flex-col gap-1.5">
                    {/* Label */}
                    <label className="text-sm font-medium flex items-center gap-2">
                      {variable.name}
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {variable.type}
                      </span>
                    </label>

                    {/* Description */}
                    {variable.description && (
                      <p className="text-xs text-muted-foreground">
                        {variable.description}
                      </p>
                    )}

                    {/* Input based on type */}
                    {variable.type === "string" && (
                      <Input
                        type="text"
                        value={values[variable.name] || ""}
                        onChange={(e) => handleChange(variable.name, e.target.value)}
                        placeholder={`Enter ${variable.name}...`}
                      />
                    )}

                    {variable.type === "number" && (
                      <Input
                        type="number"
                        value={values[variable.name] || 0}
                        onChange={(e) =>
                          handleChange(variable.name, parseFloat(e.target.value) || 0)
                        }
                        placeholder={`Enter ${variable.name}...`}
                      />
                    )}

                    {variable.type === "boolean" && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={values[variable.name] || false}
                          onChange={(e) =>
                            handleChange(variable.name, e.target.checked)
                          }
                          className={cn(
                            "size-4 rounded border-input",
                            "checked:bg-primary checked:border-primary",
                            "focus:ring-2 focus:ring-ring focus:ring-offset-2",
                            "cursor-pointer"
                          )}
                        />
                        <span className="text-sm">
                          {values[variable.name] ? "True" : "False"}
                        </span>
                      </label>
                    )}

                    {variable.type === "list" && (
                      <TagInput
                        value={values[variable.name] || []}
                        onChange={(newValue) => handleChange(variable.name, newValue)}
                        placeholder="Type and press Enter to add items..."
                      />
                    )}

                    {variable.type === "object" && (
                      <JsonEditor
                        value={values[variable.name] || {}}
                        onChange={(newValue) => handleChange(variable.name, newValue)}
                        rows={4}
                      />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-input px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={stateVariables.length === 0}
              >
                Execute Workflow
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
