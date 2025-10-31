"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MoreVertical,
  Copy,
  Trash2,
  Calendar,
  Clock,
  FileText,
} from "lucide-react";
import { useWorkflowsDbStore } from "@/lib/store/workflows-db-store";
import { DeleteWorkflowDialog } from "@/components/canvas/DeleteWorkflowDialog";

interface WorkflowCardProps {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export function WorkflowCard({
  id,
  name,
  description,
  createdAt,
  updatedAt,
}: WorkflowCardProps) {
  const router = useRouter();
  const { duplicateWorkflow } = useWorkflowsDbStore();

  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleOpen = () => {
    router.push(`/workflow/${id}`);
  };

  const handleDuplicate = async () => {
    setShowMenu(false);

    try {
      const newWorkflowId = await duplicateWorkflow(id);
      router.push(`/workflow/${newWorkflowId}`);
    } catch (error) {
      console.error("Failed to duplicate workflow:", error);
      alert("Failed to duplicate workflow");
    }
  };

  const handleDelete = () => {
    setShowMenu(false);
    setShowDeleteDialog(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  return (
    <>
      <div className="group relative bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors">
        {/* Header with name and menu */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-white truncate">
              {name}
            </h3>
            {description && (
              <p className="text-sm text-gray-400 line-clamp-2 mt-1">
                {description}
              </p>
            )}
          </div>

          {/* Menu dropdown */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              title="More options"
            >
              <MoreVertical size={16} className="text-gray-400" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-8 w-40 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-20 overflow-hidden">
                  <button
                    onClick={handleDuplicate}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
                  >
                    <Copy size={14} />
                    <span>Duplicate</span>
                  </button>
                  <div className="w-full h-px bg-gray-700" />
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-gray-800 transition-colors"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
          <div className="flex items-center gap-1.5">
            <Calendar size={12} />
            <span>Created {formatDate(createdAt)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={12} />
            <span>Updated {formatDate(updatedAt)}</span>
          </div>
        </div>

        {/* Open button */}
        <button
          onClick={handleOpen}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Open Workflow
        </button>
      </div>

      {/* Delete Dialog */}
      <DeleteWorkflowDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        workflowId={id}
        workflowName={name}
        onDeleteSuccess={() => {
          // Zustand store already updated by deleteWorkflow()
          // UI will automatically re-render via React subscription
        }}
      />
    </>
  );
}
