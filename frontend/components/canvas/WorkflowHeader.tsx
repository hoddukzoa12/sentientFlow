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
  Settings,
} from "lucide-react";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import { useWorkflowsDbStore } from "@/lib/store/workflows-db-store";
import { SaveWorkflowDialog } from "./SaveWorkflowDialog";
import { DeleteWorkflowDialog } from "./DeleteWorkflowDialog";

interface WorkflowHeaderProps {
  onPreviewToggle?: () => void;
}

export function WorkflowHeader({ onPreviewToggle }: WorkflowHeaderProps) {
  const router = useRouter();
  const { workflowName, workflowVersion, setWorkflowName, setWorkflowVersion } =
    useWorkflowStore();
  const { currentWorkflowId, duplicateWorkflow } = useWorkflowsDbStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(workflowName);
  const [showMenu, setShowMenu] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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

  const handleDuplicate = async () => {
    setShowMenu(false);

    if (!currentWorkflowId) {
      alert("Please save the workflow first before duplicating");
      return;
    }

    try {
      const newWorkflowId = await duplicateWorkflow(currentWorkflowId);
      // Navigate to the duplicated workflow
      router.push(`/workflow/${newWorkflowId}`);
    } catch (error) {
      console.error("Failed to duplicate workflow:", error);
      alert("Failed to duplicate workflow");
    }
  };

  const handleDelete = () => {
    setShowMenu(false);

    if (!currentWorkflowId) {
      alert("No workflow to delete");
      return;
    }

    setShowDeleteDialog(true);
  };

  const handleSettings = () => {
    setShowMenu(false);
    router.push("/settings");
  };

  const handleSave = () => {
    setShowSaveDialog(true);
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
                <div className="w-full h-px bg-gray-700" />
                <button
                  onClick={handleSettings}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  <Settings size={16} />
                  <span>Settings</span>
                </button>
                <div className="w-full h-px bg-gray-700" />
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

        <button
          onClick={onPreviewToggle}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
        >
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

      {/* Dialogs */}
      <SaveWorkflowDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        mode="save"
      />
      <DeleteWorkflowDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />
    </header>
  );
}
