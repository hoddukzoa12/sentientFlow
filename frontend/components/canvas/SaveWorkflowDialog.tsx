"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWorkflowsDbStore } from "@/lib/store/workflows-db-store";
import { useWorkflowStore } from "@/lib/store/workflow-store";

interface SaveWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "save" | "saveAs"; // "save" updates existing, "saveAs" always creates new
}

export function SaveWorkflowDialog({
  open,
  onOpenChange,
  mode = "save",
}: SaveWorkflowDialogProps) {
  const { currentWorkflowId, saveWorkflow, saveWorkflowAs, isLoading, error } =
    useWorkflowsDbStore();
  const { workflowName } = useWorkflowStore();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Reset form when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Pre-fill name based on mode
      if (mode === "save" && workflowName) {
        setName(workflowName);
      } else if (mode === "saveAs" && workflowName) {
        setName(`${workflowName} (Copy)`);
      } else {
        setName("");
      }
      setDescription("");
      setSaveError(null);
    }
    onOpenChange(newOpen);
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      setSaveError("Workflow name is required");
      return;
    }

    if (name.length > 255) {
      setSaveError("Workflow name must be less than 255 characters");
      return;
    }

    setSaveError(null);

    try {
      if (mode === "saveAs") {
        // Always create new workflow
        await saveWorkflowAs(name.trim(), description.trim() || undefined);
      } else {
        // Save: update if exists, create if new
        await saveWorkflow(name.trim(), description.trim() || undefined);
      }

      // Success - close dialog
      onOpenChange(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save workflow");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.metaKey) {
      // Cmd+Enter to save
      handleSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>
            {mode === "saveAs" ? "Save Workflow As" : "Save Workflow"}
          </DialogTitle>
          <DialogDescription>
            {mode === "saveAs"
              ? "Save a copy of your workflow with a new name"
              : currentWorkflowId
              ? "Update your workflow details"
              : "Save your workflow to continue later"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="workflow-name">
              Workflow Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="workflow-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Customer Support Agent"
              className="bg-black border-gray-800"
              maxLength={255}
              autoFocus
            />
          </div>

          {/* Description Textarea */}
          <div className="space-y-2">
            <Label htmlFor="workflow-description">Description (Optional)</Label>
            <Textarea
              id="workflow-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this workflow does..."
              className="bg-black border-gray-800 resize-none"
              rows={3}
            />
          </div>

          {/* Error Message */}
          {(saveError || error) && (
            <div className="text-sm text-red-400 bg-red-950/20 border border-red-900 rounded-lg px-3 py-2">
              {saveError || error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isLoading || !name.trim()}
          >
            {isLoading ? "Saving..." : mode === "saveAs" ? "Save As" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
