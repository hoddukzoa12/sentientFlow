"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  MoreVertical,
  Play,
  Code,
  Eye,
  Rocket,
  Check,
  Copy,
  Edit,
  Trash2,
} from "lucide-react";
import { useWorkflowStore } from "@/lib/store/workflow-store";

export function WorkflowHeader() {
  const router = useRouter();
  const { workflowName, workflowVersion, setWorkflowName, setWorkflowVersion } =
    useWorkflowStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(workflowName);
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  const handleNameSave = () => {
    if (editedName.trim()) {
      setWorkflowName(editedName.trim());
    } else {
      setEditedName(workflowName);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameSave();
    } else if (e.key === "Escape") {
      setEditedName(workflowName);
      setIsEditingName(false);
    }
  };

  const handleRename = () => {
    setShowMenu(false);
    setIsEditingName(true);
  };

  const handleDuplicate = () => {
    setShowMenu(false);
    // TODO: Implement duplicate workflow
    console.log("Duplicate workflow");
  };

  const handleDelete = () => {
    setShowMenu(false);
    // TODO: Implement delete workflow with confirmation
    console.log("Delete workflow");
  };

  const handleSave = () => {
    // TODO: Implement save workflow
    console.log("Save workflow");
  };

  const handleDeploy = () => {
    // Set version to v1 on first deploy
    if (workflowVersion === "Draft") {
      setWorkflowVersion("v1");
    }
    // TODO: Implement deploy workflow
    console.log("Deploy workflow");
  };

  return (
    <header className="h-16 bg-black border-b border-gray-800 flex items-center justify-between px-4">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/")}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          title="Back to home"
        >
          <ArrowLeft size={20} className="text-gray-400" />
        </button>

        {isEditingName ? (
          <input
            ref={inputRef}
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={handleNameKeyDown}
            className="text-lg font-semibold text-white bg-gray-800 px-3 py-1 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <h1
            onClick={() => setIsEditingName(true)}
            className="text-lg font-semibold text-white cursor-pointer hover:text-gray-300 transition-colors"
          >
            {workflowName}
          </h1>
        )}

        <button className="flex items-center gap-1 px-2 py-1 text-sm text-gray-400 hover:bg-gray-800 rounded-lg transition-colors">
          <span>{workflowVersion}</span>
          <ChevronDown size={16} />
        </button>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Save button */}
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
          title="Save"
        >
          <Check size={16} />
          <span>Save</span>
        </button>

        {/* Menu dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="More options"
          >
            <MoreVertical size={20} className="text-gray-400" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-12 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-20 overflow-hidden">
                <button
                  onClick={handleDuplicate}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  <Copy size={16} />
                  <span>Duplicate</span>
                </button>
                <button
                  onClick={handleRename}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  <Edit size={16} />
                  <span>Rename</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-gray-800 transition-colors"
                >
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-700" />

        {/* Action buttons */}
        <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors">
          <Play size={16} />
          <span>Evaluate</span>
        </button>

        <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors">
          <Code size={16} />
          <span>Code</span>
        </button>

        <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors">
          <Eye size={16} />
          <span>Preview</span>
        </button>

        <button
          onClick={handleDeploy}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Rocket size={16} />
          <span>Deploy</span>
        </button>
      </div>
    </header>
  );
}
