"use client";

import { Trash2, Plus } from "lucide-react";

interface Condition {
  id: string;
  name?: string;
  expression: string;
}

interface ConditionEditorProps {
  value: Condition[];
  onChange: (value: Condition[]) => void;
}

export function ConditionEditor({ value, onChange }: ConditionEditorProps) {
  const handleAdd = () => {
    onChange([
      ...value,
      {
        id: `condition-${Date.now()}`,
        name: "",
        expression: "",
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

  const handleExpressionChange = (index: number, newExpression: string) => {
    const updated = [...value];
    updated[index] = { ...updated[index], expression: newExpression };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {value.map((condition, index) => (
        <div key={condition.id} className="p-3 bg-gray-900 rounded-lg border border-gray-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">
              Condition #{index + 1}
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
              <label className="block text-xs text-gray-400 mb-1">
                Name (optional)
              </label>
              <input
                type="text"
                value={condition.name || ""}
                onChange={(e) => handleNameChange(index, e.target.value)}
                placeholder="e.g., Check status"
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Expression (CEL)
              </label>
              <textarea
                value={condition.expression}
                onChange={(e) => handleExpressionChange(index, e.target.value)}
                placeholder="e.g., status == 'approved'"
                rows={3}
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-mono resize-none"
              />
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={handleAdd}
        className="w-full px-3 py-2 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-md transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={16} />
        Add Condition
      </button>
    </div>
  );
}
