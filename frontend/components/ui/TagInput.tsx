"use client";

import { X } from "lucide-react";
import { useState, KeyboardEvent } from "react";

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export function TagInput({
  value,
  onChange,
  placeholder = "Type and press Enter",
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      if (!value.includes(inputValue.trim())) {
        onChange([...value, inputValue.trim()]);
      }
      setInputValue("");
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      // Remove last tag if input is empty and backspace is pressed
      onChange(value.slice(0, -1));
    }
  };

  const handleRemove = (indexToRemove: number) => {
    onChange(value.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag, index) => (
            <div
              key={index}
              className="flex items-center gap-1 px-2 py-1 bg-blue-900/30 border border-blue-700/50 rounded-md text-sm text-blue-300"
            >
              <span>{tag}</span>
              <button
                onClick={() => handleRemove(index)}
                className="hover:text-blue-100 transition-colors"
                title="Remove"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
      />
    </div>
  );
}
