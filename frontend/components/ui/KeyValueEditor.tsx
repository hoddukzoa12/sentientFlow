"use client";

import { Trash2, Plus } from "lucide-react";

interface KeyValuePair {
  key: string;
  value: string;
}

interface KeyValueEditorProps {
  value: KeyValuePair[];
  onChange: (value: KeyValuePair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  keyLabel?: string;
  valueLabel?: string;
}

export function KeyValueEditor({
  value,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
  keyLabel = "Key",
  valueLabel = "Value",
}: KeyValueEditorProps) {
  const handleAdd = () => {
    onChange([...value, { key: "", value: "" }]);
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyChange = (index: number, newKey: string) => {
    const updated = [...value];
    updated[index] = { ...updated[index], key: newKey };
    onChange(updated);
  };

  const handleValueChange = (index: number, newValue: string) => {
    const updated = [...value];
    updated[index] = { ...updated[index], value: newValue };
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs text-gray-400 mb-1">
          <div>{keyLabel}</div>
          <div>{valueLabel}</div>
          <div className="w-8"></div>
        </div>
      )}

      {value.map((pair, index) => (
        <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <input
            type="text"
            value={pair.key}
            onChange={(e) => handleKeyChange(index, e.target.value)}
            placeholder={keyPlaceholder}
            className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
          />
          <input
            type="text"
            value={pair.value}
            onChange={(e) => handleValueChange(index, e.target.value)}
            placeholder={valuePlaceholder}
            className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
          />
          <button
            onClick={() => handleRemove(index)}
            className="px-2 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-md transition-colors"
            title="Remove"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      <button
        onClick={handleAdd}
        className="w-full px-3 py-2 text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-md transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={16} />
        Add {keyLabel}
      </button>
    </div>
  );
}
