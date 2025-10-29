"use client";

import { Bot, Square, FileText, FileSearch, Shield, Puzzle, GitBranch, Clock, Users, Shuffle, Database } from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import { findNonOverlappingPosition, NODE_DIMENSIONS } from "@/lib/utils/node-collision";
import { getDefaultNodeData } from "@/lib/utils/node-defaults";
import type { NodeType, WorkflowNode } from "@/types/workflow";

interface NodeItem {
  type: NodeType;
  label: string;
  icon: React.ReactNode;
  category: "core" | "tools" | "logic" | "data";
}

const nodeItems: NodeItem[] = [
  // Core
  { type: "agent", label: "Agent", icon: <Bot size={14} />, category: "core" },
  { type: "end", label: "End", icon: <Square size={14} />, category: "core" },
  { type: "note", label: "Note", icon: <FileText size={14} />, category: "core" },

  // Tools
  { type: "fileSearch", label: "File search", icon: <FileSearch size={14} />, category: "tools" },
  { type: "guardrails", label: "Guardrails", icon: <Shield size={14} />, category: "tools" },
  { type: "mcp", label: "MCP", icon: <Puzzle size={14} />, category: "tools" },

  // Logic
  { type: "ifElse", label: "If / else", icon: <GitBranch size={14} />, category: "logic" },
  { type: "while", label: "While", icon: <Clock size={14} />, category: "logic" },
  { type: "userApproval", label: "User approval", icon: <Users size={14} />, category: "logic" },

  // Data
  { type: "transform", label: "Transform", icon: <Shuffle size={14} />, category: "data" },
  { type: "setState", label: "Set state", icon: <Database size={14} />, category: "data" },
];

const categoryColors: Record<string, string> = {
  core: "bg-blue-500",
  tools: "bg-yellow-500",
  logic: "bg-orange-500",
  data: "bg-purple-500",
};

export function NodePanel() {
  const { addNode, nodes } = useWorkflowStore();
  const { screenToFlowPosition, getViewport } = useReactFlow();

  const categories = [
    { id: "core", label: "Core" },
    { id: "tools", label: "Tools" },
    { id: "logic", label: "Logic" },
    { id: "data", label: "Data" },
  ];

  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  // Add double-click handler to create node at canvas center
  const onDoubleClick = (nodeType: NodeType) => {
    // Get viewport center position
    const viewport = getViewport();
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    // Convert screen coordinates to flow coordinates
    const flowPosition = screenToFlowPosition({
      x: centerX - 75, // Offset for node width
      y: centerY - 30, // Offset for node height
    });

    // Use collision detection to find non-overlapping position
    const position = findNonOverlappingPosition(flowPosition, nodes, nodeType);

    // Get dimensions for this node type
    const dimensions = NODE_DIMENSIONS[nodeType];

    // Create new node
    const newNode: WorkflowNode = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType,
      position,
      width: dimensions.width,
      height: dimensions.height,
      data: getDefaultNodeData(nodeType),
    };

    addNode(newNode);
  };

  return (
    <div className="w-[188px] max-h-[calc(100vh-2rem)] bg-gray-900 rounded-lg border border-gray-800 shadow-xl overflow-y-auto">
      <div className="p-3 space-y-5">
        {categories.map((category) => (
          <div key={category.id}>
            <h3 className="text-xs font-medium text-gray-400 uppercase mb-2">
              {category.label}
            </h3>
            <div className="space-y-0.5">
              {nodeItems
                .filter((item) => item.category === category.id)
                .map((item) => (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, item.type)}
                    onDoubleClick={() => onDoubleClick(item.type)}
                    className="flex items-center gap-1.5 p-1.5 rounded-lg cursor-move hover:bg-gray-800 transition-colors"
                    title="Drag to canvas or double-click to add at center"
                  >
                    <div
                      className={`w-7 h-7 rounded-md ${
                        categoryColors[item.category]
                      } flex items-center justify-center text-white`}
                    >
                      {item.icon}
                    </div>
                    <span className="text-xs text-gray-200">{item.label}</span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
