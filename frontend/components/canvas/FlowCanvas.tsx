"use client";

import { useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Connection,
  Edge,
  Node,
  NodeChange,
  EdgeChange,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  NodeTypes,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useWorkflowStore } from "@/lib/store/workflow-store";
import type { WorkflowNode, WorkflowEdge, NodeType } from "@/types/workflow";
import { findNonOverlappingPosition, NODE_DIMENSIONS, rectanglesOverlap } from "@/lib/utils/node-collision";
import {
  StartNode,
  AgentNode,
  EndNode,
  NoteNode,
  FileSearchNode,
  GuardrailsNode,
  MCPNode,
  IfElseNode,
  WhileNode,
  UserApprovalNode,
  TransformNode,
  SetStateNode,
} from "./nodes";

const nodeTypes: NodeTypes = {
  start: StartNode as any,
  agent: AgentNode as any,
  end: EndNode as any,
  note: NoteNode as any,
  fileSearch: FileSearchNode as any,
  guardrails: GuardrailsNode as any,
  mcp: MCPNode as any,
  ifElse: IfElseNode as any,
  while: WhileNode as any,
  userApproval: UserApprovalNode as any,
  transform: TransformNode as any,
  setState: SetStateNode as any,
};

interface FlowCanvasProps {
  onNodeDrop?: (type: NodeType, position: { x: number; y: number }) => void;
  isInteractive?: boolean;
}

export function FlowCanvas({ onNodeDrop, isInteractive = true }: FlowCanvasProps) {
  const { nodes, edges, setNodes, setEdges, addEdge: addWorkflowEdge, selectNode, deleteNode, deleteEdge } = useWorkflowStore();
  const reactFlowInstance = useReactFlow();

  // ReactFlow requires specific types
  const [reactFlowNodes, setReactFlowNodes, onNodesChangeReactFlow] = useNodesState(nodes as Node[]);
  const [reactFlowEdges, setReactFlowEdges, onEdgesChangeReactFlow] = useEdgesState(edges as Edge[]);

  // Sync Zustand state with ReactFlow state
  // Sync on any node data changes (content, properties, etc.)
  useEffect(() => {
    setReactFlowNodes(nodes as Node[]);
  }, [nodes, setReactFlowNodes]);

  useEffect(() => {
    setReactFlowEdges(edges as Edge[]);
  }, [edges, setReactFlowEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: WorkflowEdge = {
        id: `edge-${connection.source}-${connection.target}`,
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle || undefined,
        targetHandle: connection.targetHandle || undefined,
      };
      addWorkflowEdge(newEdge);
    },
    [addWorkflowEdge]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Center the node with smooth animation
      reactFlowInstance.setCenter(
        node.position.x + 75,
        node.position.y + 30,
        { zoom: 1.2, duration: 400 }
      );
    },
    [reactFlowInstance]
  );

  // Prevent node overlap after dragging
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, draggedNode: Node) => {
      const nodeType = draggedNode.type as NodeType;
      const dimensions = NODE_DIMENSIONS[nodeType];

      const draggedRect = {
        x: draggedNode.position.x,
        y: draggedNode.position.y,
        width: dimensions.width,
        height: dimensions.height,
      };

      // Check if dragged node overlaps with any other node
      const hasCollision = reactFlowNodes.some((node) => {
        if (node.id === draggedNode.id) return false; // Skip self

        const nodeType = node.type as NodeType;
        const nodeDimensions = NODE_DIMENSIONS[nodeType];
        const nodeRect = {
          x: node.position.x,
          y: node.position.y,
          width: nodeDimensions.width,
          height: nodeDimensions.height,
        };

        return rectanglesOverlap(draggedRect, nodeRect);
      });

      // If collision detected, find non-overlapping position
      if (hasCollision) {
        const otherNodes = reactFlowNodes.filter(n => n.id !== draggedNode.id) as WorkflowNode[];
        const correctedPosition = findNonOverlappingPosition(
          draggedNode.position,
          otherNodes,
          nodeType
        );

        // Update node with corrected position
        const updatedNodes = reactFlowNodes.map(node =>
          node.id === draggedNode.id
            ? { ...node, position: correctedPosition }
            : node
        );

        setReactFlowNodes(updatedNodes);
        setNodes(updatedNodes as WorkflowNode[]);
      }
    },
    [reactFlowNodes, setReactFlowNodes, setNodes]
  );

  // Handle drag-and-drop from NodePanel
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow") as NodeType;
      if (!type) return;

      // Use screenToFlowPosition to account for pan/zoom - same as NodePanel's onDoubleClick
      const flowPosition = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Adjust for node center offset
      const adjustedPosition = {
        x: flowPosition.x - 75,
        y: flowPosition.y - 20,
      };

      // Call parent callback with transformed position
      onNodeDrop?.(type, adjustedPosition);
    },
    [reactFlowInstance, onNodeDrop]
  );

  // Custom handler to sync node deletions with Zustand store
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Filter out removal changes for Start nodes
      const filteredChanges = changes.filter((change) => {
        if (change.type === 'remove') {
          const node = reactFlowNodes.find(n => n.id === change.id);
          // Prevent deletion of Start nodes
          if (node?.type === 'start') {
            return false; // Block this change
          }
        }
        return true; // Allow all other changes
      });

      // Update ReactFlow's internal state with filtered changes
      onNodesChangeReactFlow(filteredChanges);

      // Process changes
      filteredChanges.forEach((change) => {
        // Sync deletions to Zustand store
        if (change.type === 'remove') {
          deleteNode(change.id);
        }

        // Sync position changes back to Zustand on drag end
        if (change.type === 'position' && change.dragging === false && change.position) {
          // Update Zustand with final position after drag ends
          const updatedNodes = reactFlowNodes.map(node =>
            node.id === change.id && change.position
              ? { ...node, position: change.position }
              : node
          );
          setNodes(updatedNodes as WorkflowNode[]);
        }
      });
    },
    [onNodesChangeReactFlow, deleteNode, reactFlowNodes, setNodes]
  );

  // Custom handler to sync edge deletions with Zustand store
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // Update ReactFlow's internal state
      onEdgesChangeReactFlow(changes);

      // Process changes
      changes.forEach((change) => {
        // Sync deletions to Zustand store
        if (change.type === 'remove') {
          deleteEdge(change.id);
        }
      });
    },
    [onEdgesChangeReactFlow, deleteEdge]
  );

  return (
    <div
      className="w-full h-full bg-black"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        nodesDraggable={isInteractive}
        nodesConnectable={isInteractive}
        elementsSelectable={isInteractive}
        nodesFocusable={isInteractive}
        defaultViewport={{ x: 250, y: 150, zoom: 1 }}
        className="bg-black"
        panOnDrag={isInteractive}
        zoomOnScroll={isInteractive}
        zoomOnDoubleClick={isInteractive}
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#333" />
        <Controls className="bg-gray-800 border border-gray-700" />
        <MiniMap
          className="border border-gray-700"
          style={{ backgroundColor: '#111' }}
          maskColor="rgba(0, 0, 0, 0.8)"
          nodeColor={(node) => {
            switch (node.type) {
              case "start":
              case "end":
                return "#10b981";
              case "agent":
                return "#3b82f6";
              case "note":
                return "#eab308";
              case "fileSearch":
              case "guardrails":
              case "mcp":
                return "#eab308";
              case "ifElse":
              case "while":
              case "userApproval":
                return "#f97316";
              case "transform":
              case "setState":
                return "#a855f7";
              default:
                return "#6b7280";
            }
          }}
        />
      </ReactFlow>
    </div>
  );
}
