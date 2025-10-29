"use client";

interface ExpressionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
  helpText?: string;
}

export function ExpressionInput({
  value,
  onChange,
  placeholder = "Enter expression...",
  rows = 4,
  label,
  helpText,
}: ExpressionInputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-xs text-gray-400">
          {label}
        </label>
      )}

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-mono resize-none"
      />

      {helpText && (
        <p className="text-xs text-gray-500">
          {helpText}
        </p>
      )}
    </div>
  );
}
