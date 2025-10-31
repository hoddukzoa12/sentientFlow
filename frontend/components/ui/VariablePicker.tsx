"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Variable } from "@/types/workflow";

interface VariablePickerProps {
  availableVariables: Variable[];
  onSelectVariable: (variableName: string) => void;
  className?: string;
  searchable?: boolean;
}

interface GroupedVariables {
  category: string;
  variables: Variable[];
}

export function VariablePicker({
  availableVariables,
  onSelectVariable,
  className,
  searchable = true,
}: VariablePickerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Group variables by category based on their id/name pattern
  const groupedVariables = useMemo((): GroupedVariables[] => {
    // Categorize variables
    const inputVars: Variable[] = [];
    const stateVars: Variable[] = [];
    const outputVars: Variable[] = [];

    availableVariables.forEach((variable) => {
      if (variable.name === "input_as_text") {
        inputVars.push(variable);
      } else if (
        variable.description?.includes("output") ||
        variable.description?.includes("response") ||
        variable.description?.includes("thinking")
      ) {
        outputVars.push(variable);
      } else {
        stateVars.push(variable);
      }
    });

    return [
      { category: "Input Variables", variables: inputVars },
      { category: "State Variables", variables: stateVars },
      { category: "Previous Node Outputs", variables: outputVars },
    ].filter((group) => group.variables.length > 0);
  }, [availableVariables]);

  // Filter variables based on search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groupedVariables;

    return groupedVariables
      .map((group) => ({
        ...group,
        variables: group.variables.filter(
          (variable) =>
            variable.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            variable.description
              ?.toLowerCase()
              .includes(searchQuery.toLowerCase())
        ),
      }))
      .filter((group) => group.variables.length > 0);
  }, [groupedVariables, searchQuery]);

  const handleVariableClick = (variableName: string) => {
    onSelectVariable(variableName);
    setSearchQuery(""); // Reset search after selection
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-gray-700 bg-gray-800 p-3 shadow-md",
        "min-w-[280px] max-w-[400px]",
        className
      )}
    >
      {/* Search Input */}
      {searchable && (
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search variables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-8 pr-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-100 text-xs placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Variables List */}
      <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
        {filteredGroups.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-4">
            No variables found
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div key={group.category} className="flex flex-col gap-1.5">
              {/* Category Header */}
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">
                {group.category}
              </div>

              {/* Variables in Category */}
              {group.variables.map((variable) => (
                <button
                  key={variable.id}
                  onClick={() => handleVariableClick(variable.name)}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-md px-2 py-1.5",
                    "hover:bg-gray-700 hover:text-gray-100",
                    "transition-colors cursor-pointer text-left",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                  )}
                >
                  {/* Variable Name */}
                  <span className="text-sm font-medium text-gray-200 truncate">
                    {variable.name}
                  </span>

                  {/* Variable Type */}
                  <span className="text-xs text-gray-400 bg-gray-900 px-1.5 py-0.5 rounded shrink-0">
                    {variable.type}
                  </span>
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Helper Text */}
      {availableVariables.length === 0 && (
        <div className="text-xs text-gray-400 text-center py-4">
          No variables available. Add variables in the Start node.
        </div>
      )}
    </div>
  );
}
