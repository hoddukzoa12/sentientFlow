"use client";

import { Trash2, Plus } from "lucide-react";
import { Variable } from "@/types/workflow";

interface VariableEditorProps {
  value: Variable[];
  onChange: (value: Variable[]) => void;
  label?: string;
}

export function VariableEditor({
  value,
  onChange,
  label = "Variable",
}: VariableEditorProps) {
  const handleAdd = () => {
    onChange([
      ...value,
      {
        id: `var-${Date.now()}`,
        name: "",
        type: "string",
      },
    ]);
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleNameChange = (index: number, newName: string) => {
    const updated = [...value];
    updated[index] = { ...updated[index], name: newName };
    onChange(updated);
  };

  const handleTypeChange = (index: number, newType: Variable["type"]) => {
    const updated = [...value];
    updated[index] = { ...updated[index], type: newType, defaultValue: undefined };
    onChange(updated);
  };

  const handleDefaultValueChange = (index: number, newValue: any) => {
    const updated = [...value];
    updated[index] = { ...updated[index], defaultValue: newValue };
    onChange(updated);
  };

  const renderDefaultValueInput = (variable: Variable, index: number) => {
    switch (variable.type) {
      case "string":
        return (
          <input
            type="text"
            value={variable.defaultValue || ""}
            onChange={(e) => handleDefaultValueChange(index, e.target.value)}
            placeholder="Default value (optional)"
            className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
          />
        );
      case "number":
        return (
          <input
            type="number"
            value={variable.defaultValue || ""}
            onChange={(e) => handleDefaultValueChange(index, parseFloat(e.target.value) || undefined)}
            placeholder="Default value (optional)"
            className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
          />
        );
      case "boolean":
        return (
          <select
            value={variable.defaultValue === undefined ? "" : String(variable.defaultValue)}
            onChange={(e) =>
              handleDefaultValueChange(
                index,
                e.target.value === "" ? undefined : e.target.value === "true"
              )
            }
            className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
          >
            <option value="">No default</option>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        );
      case "object":
      case "list":
        return (
          <input
            type="text"
            value={variable.defaultValue ? JSON.stringify(variable.defaultValue) : ""}
            onChange={(e) => {
              try {
                const parsed = e.target.value ? JSON.parse(e.target.value) : undefined;
                handleDefaultValueChange(index, parsed);
              } catch {
                // Invalid JSON, don't update
              }
            }}
            placeholder={variable.type === "object" ? "{}" : "[]"}
            className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-mono"
          />
        );
    }
  };

  return (
    <div className="space-y-3">
      {value.map((variable, index) => (
        <div key={variable.id} className="p-3 bg-gray-900 rounded-lg border border-gray-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">
              {label} #{index + 1}
            </span>
            <button
              onClick={() => handleRemove(index)}
              className="px-2 py-1 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-md transition-colors"
              title="Remove"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Name</label>
              <input
                type="text"
                value={variable.name}
                onChange={(e) => handleNameChange(index, e.target.value)}
                placeholder="Variable name"
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Type</label>
              <select
                value={variable.type}
                onChange={(e) => handleTypeChange(index, e.target.value as Variable["type"])}
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="object">Object</option>
                <option value="list">List</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Default Value</label>
              {renderDefaultValueInput(variable, index)}
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={handleAdd}
        className="w-full px-3 py-2 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-md transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={16} />
        Add {label}
      </button>
    </div>
  );
}
