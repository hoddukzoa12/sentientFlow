/**
 * Workflows DB Store
 *
 * Manages workflow persistence (save/load/delete).
 * Separate from workflow-store which handles canvas editing.
 *
 * Responsibilities:
 * - List saved workflows from DB
 * - Save current canvas to DB
 * - Load workflow from DB into canvas
 * - Delete/duplicate workflows
 */

import { create } from "zustand";
import {
  api,
  WorkflowListItem,
  WorkflowDetail,
  WorkflowCreate,
  WorkflowUpdate,
  WorkflowListParams,
} from "@/lib/api/client";
import { useWorkflowStore } from "./workflow-store";

interface WorkflowsDbState {
  // Data
  savedWorkflows: WorkflowListItem[];
  currentWorkflowId: string | null; // ID of currently loaded workflow (if any)
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchWorkflows: (params?: WorkflowListParams) => Promise<void>;
  loadWorkflow: (id: string) => Promise<void>;
  saveWorkflow: (name: string, description?: string) => Promise<string>;
  saveWorkflowAs: (name: string, description?: string) => Promise<string>;
  updateWorkflow: (id: string, name?: string, description?: string) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  duplicateWorkflow: (id: string) => Promise<void>;
  setCurrentWorkflowId: (id: string | null) => void;
  clearError: () => void;
}

export const useWorkflowsDbStore = create<WorkflowsDbState>((set, get) => ({
  savedWorkflows: [],
  currentWorkflowId: null,
  isLoading: false,
  error: null,

  /**
   * Fetch list of saved workflows
   */
  fetchWorkflows: async (params?: WorkflowListParams) => {
    set({ isLoading: true, error: null });

    try {
      const workflows = await api.workflows.list(params);

      set({
        savedWorkflows: workflows,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch workflows",
        isLoading: false,
      });
    }
  },

  /**
   * Load a workflow from DB into canvas
   */
  loadWorkflow: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      const workflow = await api.workflows.get(id);

      // Update workflow-store (canvas)
      const workflowStore = useWorkflowStore.getState();
      workflowStore.setWorkflowName(workflow.name);
      workflowStore.setNodes(workflow.definition.nodes || []);
      workflowStore.setEdges(workflow.definition.edges || []);

      set({
        currentWorkflowId: id,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load workflow",
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Save current canvas to DB (creates new or updates existing)
   */
  saveWorkflow: async (name: string, description?: string) => {
    const currentId = get().currentWorkflowId;

    if (currentId) {
      // Update existing workflow
      await get().updateWorkflow(currentId, name, description);
      return currentId;
    } else {
      // Create new workflow
      return await get().saveWorkflowAs(name, description);
    }
  },

  /**
   * Save current canvas as new workflow (always creates new)
   */
  saveWorkflowAs: async (name: string, description?: string) => {
    set({ isLoading: true, error: null });

    try {
      // Get current canvas state from workflow-store
      const workflowStore = useWorkflowStore.getState();
      const { nodes, edges } = workflowStore;

      const data: WorkflowCreate = {
        name,
        description: description || "",
        definition: {
          nodes,
          edges,
        },
      };

      const newWorkflow = await api.workflows.create(data);

      // Add to list and set as current
      set((state) => ({
        savedWorkflows: [newWorkflow, ...state.savedWorkflows],
        currentWorkflowId: newWorkflow.id,
        isLoading: false,
      }));

      // Update workflow name in canvas
      workflowStore.setWorkflowName(name);

      return newWorkflow.id;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to save workflow",
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Update an existing workflow
   */
  updateWorkflow: async (id: string, name?: string, description?: string) => {
    set({ isLoading: true, error: null });

    try {
      // Get current canvas state
      const workflowStore = useWorkflowStore.getState();
      const { nodes, edges } = workflowStore;

      const data: WorkflowUpdate = {
        name,
        description,
        definition: {
          nodes,
          edges,
        },
      };

      const updatedWorkflow = await api.workflows.update(id, data);

      // Update list
      set((state) => ({
        savedWorkflows: state.savedWorkflows.map((w) =>
          w.id === id
            ? {
                ...w,
                name: updatedWorkflow.name,
                description: updatedWorkflow.description,
                updated_at: updatedWorkflow.updated_at,
              }
            : w
        ),
        isLoading: false,
      }));

      // Update workflow name in canvas if provided
      if (name) {
        workflowStore.setWorkflowName(name);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to update workflow",
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Delete a workflow
   */
  deleteWorkflow: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      await api.workflows.delete(id);

      set((state) => ({
        savedWorkflows: state.savedWorkflows.filter((w) => w.id !== id),
        currentWorkflowId: state.currentWorkflowId === id ? null : state.currentWorkflowId,
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to delete workflow",
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Duplicate a workflow
   */
  duplicateWorkflow: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      const duplicatedWorkflow = await api.workflows.duplicate(id);

      set((state) => ({
        savedWorkflows: [duplicatedWorkflow, ...state.savedWorkflows],
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to duplicate workflow",
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Set current workflow ID (for tracking save state)
   */
  setCurrentWorkflowId: (id: string | null) => set({ currentWorkflowId: id }),

  /**
   * Clear error state
   */
  clearError: () => set({ error: null }),
}));
