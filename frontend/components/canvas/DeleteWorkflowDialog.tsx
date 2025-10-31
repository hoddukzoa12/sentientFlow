"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWorkflowsDbStore } from "@/lib/store/workflows-db-store";
import { useWorkflowStore } from "@/lib/store/workflow-store";

interface DeleteWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId?: string; // Optional: for deleting specific workflow (e.g., from home page)
  workflowName?: string; // Optional: for displaying specific workflow name
  onDeleteSuccess?: () => void; // Optional: callback after successful deletion
}

export function DeleteWorkflowDialog({
  open,
  onOpenChange,
  workflowId: propWorkflowId,
  workflowName: propWorkflowName,
  onDeleteSuccess,
}: DeleteWorkflowDialogProps) {
  const router = useRouter();
  const { currentWorkflowId, deleteWorkflow } = useWorkflowsDbStore();
  const { workflowName: storeWorkflowName } = useWorkflowStore();

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Use prop values if provided, otherwise fall back to store values
  const workflowIdToDelete = propWorkflowId || currentWorkflowId;
  const displayName = propWorkflowName || storeWorkflowName;

  const handleDelete = async () => {
    if (!workflowIdToDelete) {
      setDeleteError("No workflow to delete");
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteWorkflow(workflowIdToDelete);

      // Success - close dialog
      onOpenChange(false);

      // Call success callback if provided, otherwise redirect to home
      if (onDeleteSuccess) {
        onDeleteSuccess();
      } else {
        router.push("/");
      }
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete workflow"
      );
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Workflow?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{displayName}&quot;? This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {deleteError && (
          <div className="text-sm text-red-400 bg-red-950/20 border border-red-900 rounded-lg px-3 py-2">
            {deleteError}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
