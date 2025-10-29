import { create } from "zustand";
import type { WorkflowNode, WorkflowEdge, Workflow } from "@/types/workflow";

interface WorkflowState {
  // Current workflow
  workflow: Workflow | null;
  workflowName: string;
  workflowVersion: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;

  // Execution state (for visual feedback)
  executingNodeId: string | null;
  completedNodes: Set<string>;

  // Actions
  setWorkflow: (workflow: Workflow) => void;
  setWorkflowName: (name: string) => void;
  setWorkflowVersion: (version: string) => void;
  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: WorkflowEdge[]) => void;
  addNode: (node: WorkflowNode) => void;
  updateNode: (id: string, data: Partial<WorkflowNode["data"]>) => void;
  deleteNode: (id: string) => void;
  addEdge: (edge: WorkflowEdge) => void;
  deleteEdge: (id: string) => void;
  selectNode: (id: string | null) => void;
  setExecutingNodeId: (id: string | null) => void;
  setCompletedNodes: (nodes: Set<string>) => void;
  clearExecutionState: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  workflow: null,
  workflowName: "New workflow",
  workflowVersion: "Draft",
  nodes: [],
  edges: [],
  selectedNodeId: null,
  executingNodeId: null,
  completedNodes: new Set(),

  setWorkflow: (workflow) =>
    set({
      workflow,
      nodes: workflow.nodes,
      edges: workflow.edges,
    }),

  setWorkflowName: (name) => set({ workflowName: name }),

  setWorkflowVersion: (version) => set({ workflowVersion: version }),

  setNodes: (nodes) => set({ nodes }),

  setEdges: (edges) => set({ edges }),

  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node],
    })),

  updateNode: (id, data) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
    })),

  deleteNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      edges: state.edges.filter(
        (edge) => edge.source !== id && edge.target !== id
      ),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    })),

  addEdge: (edge) =>
    set((state) => ({
      edges: [...state.edges, edge],
    })),

  deleteEdge: (id) =>
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== id),
    })),

  selectNode: (id) => set({ selectedNodeId: id }),

  setExecutingNodeId: (id) => set({ executingNodeId: id }),

  setCompletedNodes: (nodes) => set({ completedNodes: nodes }),

  clearExecutionState: () =>
    set({
      executingNodeId: null,
      completedNodes: new Set(),
    }),
}));
