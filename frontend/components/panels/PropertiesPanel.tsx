"use client";

import { useWorkflowStore } from "@/lib/store/workflow-store";
import type {
  AgentNodeData,
  StartNodeData,
  NoteNodeData,
  FileSearchNodeData,
  GuardrailsNodeData,
  MCPNodeData,
  IfElseNodeData,
  WhileNodeData,
  UserApprovalNodeData,
  TransformNodeData,
  SetStateNodeData,
} from "@/types/workflow";
import { Copy, Trash2 } from "lucide-react";
import { KeyValueEditor } from "@/components/ui/KeyValueEditor";
import { TagInput } from "@/components/ui/TagInput";
import { ConditionEditor } from "@/components/ui/ConditionEditor";
import { ExpressionInput } from "@/components/ui/ExpressionInput";

export function PropertiesPanel() {
  const { nodes, selectedNodeId, updateNode, deleteNode } = useWorkflowStore();

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <div className="w-96 h-full bg-gray-950 border-l border-gray-800 p-4">
        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
          Select a node to edit its properties
        </div>
      </div>
    );
  }

  const handleDeleteNode = () => {
    if (selectedNodeId) {
      deleteNode(selectedNodeId);
    }
  };

  return (
    <div className="w-80 bg-gray-900 m-4 rounded-lg border border-gray-800 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
      <div className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-100 capitalize">
            {selectedNode.type}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {}}
              className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
              title="Duplicate"
            >
              <Copy size={14} className="text-gray-400" />
            </button>
            <button
              onClick={handleDeleteNode}
              className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
              title="Delete"
            >
              <Trash2 size={14} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Node-specific properties */}
        {selectedNode.type === "start" && (
          <StartNodeProperties
            data={selectedNode.data as StartNodeData}
            nodeId={selectedNode.id}
            updateNode={updateNode}
          />
        )}

        {selectedNode.type === "agent" && (
          <AgentNodeProperties
            data={selectedNode.data as AgentNodeData}
            nodeId={selectedNode.id}
            updateNode={updateNode}
          />
        )}

        {selectedNode.type === "end" && (
          <div className="text-sm text-gray-400">
            End node has no configurable properties.
          </div>
        )}

        {selectedNode.type === "note" && (
          <NoteNodeProperties
            data={selectedNode.data as NoteNodeData}
            nodeId={selectedNode.id}
            updateNode={updateNode}
          />
        )}

        {selectedNode.type === "fileSearch" && (
          <FileSearchNodeProperties
            data={selectedNode.data as FileSearchNodeData}
            nodeId={selectedNode.id}
            updateNode={updateNode}
          />
        )}

        {selectedNode.type === "guardrails" && (
          <GuardrailsNodeProperties
            data={selectedNode.data as GuardrailsNodeData}
            nodeId={selectedNode.id}
            updateNode={updateNode}
          />
        )}

        {selectedNode.type === "mcp" && (
          <MCPNodeProperties
            data={selectedNode.data as MCPNodeData}
            nodeId={selectedNode.id}
            updateNode={updateNode}
          />
        )}

        {selectedNode.type === "ifElse" && (
          <IfElseNodeProperties
            data={selectedNode.data as IfElseNodeData}
            nodeId={selectedNode.id}
            updateNode={updateNode}
          />
        )}

        {selectedNode.type === "while" && (
          <WhileNodeProperties
            data={selectedNode.data as WhileNodeData}
            nodeId={selectedNode.id}
            updateNode={updateNode}
          />
        )}

        {selectedNode.type === "userApproval" && (
          <UserApprovalNodeProperties
            data={selectedNode.data as UserApprovalNodeData}
            nodeId={selectedNode.id}
            updateNode={updateNode}
          />
        )}

        {selectedNode.type === "transform" && (
          <TransformNodeProperties
            data={selectedNode.data as TransformNodeData}
            nodeId={selectedNode.id}
            updateNode={updateNode}
          />
        )}

        {selectedNode.type === "setState" && (
          <SetStateNodeProperties
            data={selectedNode.data as SetStateNodeData}
            nodeId={selectedNode.id}
            updateNode={updateNode}
          />
        )}
      </div>
    </div>
  );
}

// Start Node Properties
function StartNodeProperties({
  data,
  nodeId,
  updateNode,
}: {
  data: StartNodeData;
  nodeId: string;
  updateNode: (id: string, data: Partial<any>) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-xs font-medium text-gray-300 mb-1.5">
          Input variables
        </h3>
        <div className="space-y-1.5">
          {data.inputVariables.map((variable) => (
            <div
              key={variable.id}
              className="flex items-center justify-between p-1.5 rounded-lg bg-gray-800"
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-gray-200">{variable.name}</span>
              </div>
              <span className="text-[10px] text-gray-400">{variable.type}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-medium text-gray-300 mb-1.5">
          State variables
        </h3>
        <button className="w-full px-2 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-xs text-gray-200">
          + Add
        </button>
      </div>
    </div>
  );
}

// Agent Node Properties
function AgentNodeProperties({
  data,
  nodeId,
  updateNode,
}: {
  data: AgentNodeData;
  nodeId: string;
  updateNode: (id: string, data: Partial<AgentNodeData>) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          Name
        </label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => updateNode(nodeId, { name: e.target.value })}
          className="w-full px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* System Prompt */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          System Prompt
        </label>
        <textarea
          value={data.systemPrompt}
          onChange={(e) => updateNode(nodeId, { systemPrompt: e.target.value })}
          rows={3}
          placeholder="You are a helpful assistant."
          className="w-full px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* User Prompt */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          User Prompt
          <span className="ml-1 text-gray-500 font-normal">
            (Optional - auto-uses input_as_text if empty)
          </span>
        </label>
        <textarea
          value={data.userPrompt}
          onChange={(e) => updateNode(nodeId, { userPrompt: e.target.value })}
          rows={3}
          placeholder="Leave empty to auto-use Start node input, or use ${variable_name} for custom templates"
          className="w-full px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Include chat history */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-300">
          Include chat history
        </label>
        <input
          type="checkbox"
          checked={data.includeHistory}
          onChange={(e) =>
            updateNode(nodeId, { includeHistory: e.target.checked })
          }
          className="w-8 h-5 rounded-full"
        />
      </div>

      {/* Model */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          Model
        </label>
        <select
          value={data.model}
          onChange={(e) => updateNode(nodeId, { model: e.target.value })}
          className="w-full px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="gpt-5">GPT-5</option>
          <option value="gpt-5-mini">GPT-5 Mini</option>
          <option value="gpt-5-nano">GPT-5 Nano</option>
        </select>
      </div>

      {/* Reasoning Effort - GPT-5 */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          Reasoning Effort
          <span className="ml-1 text-gray-500 font-normal text-[10px]">
            (Reasoning depth control)
          </span>
        </label>
        <select
          value={data.reasoningEffort ?? "medium"}
          onChange={(e) => updateNode(nodeId, { reasoningEffort: e.target.value as AgentNodeData["reasoningEffort"] })}
          className="w-full px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="minimal">Minimal - Minimal reasoning</option>
          <option value="low">Low - Low reasoning</option>
          <option value="medium">Medium - Medium reasoning</option>
          <option value="high">High - High reasoning</option>
        </select>
      </div>

      {/* Tools */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          Tools
        </label>
        <button className="w-full px-2 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-xs text-gray-200">
          + Add tool
        </button>
      </div>

      {/* Output format */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          Output format
        </label>
        <select
          value={data.outputFormat}
          onChange={(e) =>
            updateNode(nodeId, {
              outputFormat: e.target.value as "text" | "json",
            })
          }
          className="w-full px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="text">Text</option>
          <option value="json">JSON</option>
        </select>
      </div>
    </div>
  );
}

// Note Node Properties
function NoteNodeProperties({
  data,
  nodeId,
  updateNode,
}: {
  data: NoteNodeData;
  nodeId: string;
  updateNode: (id: string, data: Partial<NoteNodeData>) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          Note content
        </label>
        <textarea
          value={data.content}
          onChange={(e) => updateNode(nodeId, { content: e.target.value })}
          placeholder="Add your notes here..."
          rows={6}
          className="w-full px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
        />
      </div>
    </div>
  );
}

// File Search Node Properties
function FileSearchNodeProperties({
  data,
  nodeId,
  updateNode,
}: {
  data: FileSearchNodeData;
  nodeId: string;
  updateNode: (id: string, data: Partial<FileSearchNodeData>) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          Name
        </label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => updateNode(nodeId, { name: e.target.value })}
          className="w-full px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Query */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          Search Query
        </label>
        <textarea
          value={data.query}
          onChange={(e) => updateNode(nodeId, { query: e.target.value })}
          placeholder="Enter search query..."
          rows={3}
          className="w-full px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Files */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          Files
        </label>
        <TagInput
          value={data.files || []}
          onChange={(files) => updateNode(nodeId, { files })}
          placeholder="Type file path and press Enter"
        />
      </div>
    </div>
  );
}

// Guardrails Node Properties
function GuardrailsNodeProperties({
  data,
  nodeId,
  updateNode,
}: {
  data: GuardrailsNodeData;
  nodeId: string;
  updateNode: (id: string, data: Partial<GuardrailsNodeData>) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          Name
        </label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => updateNode(nodeId, { name: e.target.value })}
          className="w-full px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Input */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          Input
        </label>
        <input
          type="text"
          value={data.input}
          onChange={(e) => updateNode(nodeId, { input: e.target.value })}
          placeholder="Input to check..."
          className="w-full px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Categories */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          Categories
        </label>
        <TagInput
          value={data.categories}
          onChange={(categories) => updateNode(nodeId, { categories })}
          placeholder="Type category and press Enter"
        />
      </div>

      {/* Checks */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-300">
          Checks
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-xs text-gray-300">PII Check</span>
          <input
            type="checkbox"
            checked={data.piiCheck || false}
            onChange={(e) => updateNode(nodeId, { piiCheck: e.target.checked })}
            className="w-4 h-4 rounded"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-xs text-gray-300">Moderation Check</span>
          <input
            type="checkbox"
            checked={data.moderationCheck || false}
            onChange={(e) => updateNode(nodeId, { moderationCheck: e.target.checked })}
            className="w-4 h-4 rounded"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-xs text-gray-300">Jailbreak Check</span>
          <input
            type="checkbox"
            checked={data.jailbreakCheck || false}
            onChange={(e) => updateNode(nodeId, { jailbreakCheck: e.target.checked })}
            className="w-4 h-4 rounded"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-xs text-gray-300">Hallucination Check</span>
          <input
            type="checkbox"
            checked={data.hallucinationCheck || false}
            onChange={(e) => updateNode(nodeId, { hallucinationCheck: e.target.checked })}
            className="w-4 h-4 rounded"
          />
        </label>
      </div>

      {/* Continue on Error */}
      <label className="flex items-center justify-between cursor-pointer">
        <span className="text-xs font-medium text-gray-300">
          Continue on Error
        </span>
        <input
          type="checkbox"
          checked={data.continueOnError || false}
          onChange={(e) => updateNode(nodeId, { continueOnError: e.target.checked })}
          className="w-4 h-4 rounded"
        />
      </label>
    </div>
  );
}

// MCP Node Properties
function MCPNodeProperties({
  data,
  nodeId,
  updateNode,
}: {
  data: MCPNodeData;
  nodeId: string;
  updateNode: (id: string, data: Partial<MCPNodeData>) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          Name
        </label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => updateNode(nodeId, { name: e.target.value })}
          className="w-full px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Server */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          Server
        </label>
        <input
          type="text"
          value={data.server}
          onChange={(e) => updateNode(nodeId, { server: e.target.value })}
          placeholder="MCP server name"
          className="w-full px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Method */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          Method
        </label>
        <input
          type="text"
          value={data.method}
          onChange={(e) => updateNode(nodeId, { method: e.target.value })}
          placeholder="Method name"
          className="w-full px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Params */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          Parameters
        </label>
        <KeyValueEditor
          value={Object.entries(data.params || {}).map(([key, value]) => ({
            key,
            value: String(value),
          }))}
          onChange={(pairs) => {
            const params: Record<string, any> = {};
            pairs.forEach(({ key, value }) => {
              if (key) params[key] = value;
            });
            updateNode(nodeId, { params });
          }}
          keyPlaceholder="Parameter name"
          valuePlaceholder="Parameter value"
          keyLabel="Parameter"
        />
      </div>
    </div>
  );
}

// If/Else Node Properties
function IfElseNodeProperties({
  data,
  nodeId,
  updateNode,
}: {
  data: IfElseNodeData;
  nodeId: string;
  updateNode: (id: string, data: Partial<IfElseNodeData>) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          Conditions
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Define conditions using CEL expressions. The first matching condition will be executed.
        </p>
        <ConditionEditor
          value={data.conditions}
          onChange={(conditions) => updateNode(nodeId, { conditions })}
        />
      </div>
    </div>
  );
}

// While Node Properties
function WhileNodeProperties({
  data,
  nodeId,
  updateNode,
}: {
  data: WhileNodeData;
  nodeId: string;
  updateNode: (id: string, data: Partial<WhileNodeData>) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <ExpressionInput
          label="Loop Condition"
          value={data.expression}
          onChange={(expression) => updateNode(nodeId, { expression })}
          placeholder="e.g., counter < 10"
          helpText="CEL expression that evaluates to true/false. Loop continues while true."
          rows={3}
        />
      </div>
    </div>
  );
}

// User Approval Node Properties
function UserApprovalNodeProperties({
  data,
  nodeId,
  updateNode,
}: {
  data: UserApprovalNodeData;
  nodeId: string;
  updateNode: (id: string, data: Partial<UserApprovalNodeData>) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Message */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          Approval Message
        </label>
        <textarea
          value={data.message}
          onChange={(e) => updateNode(nodeId, { message: e.target.value })}
          placeholder="Enter message to show for approval..."
          rows={4}
          className="w-full px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Timeout */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          Timeout (seconds)
        </label>
        <input
          type="number"
          value={data.timeout || 300}
          onChange={(e) => updateNode(nodeId, { timeout: parseInt(e.target.value) || 300 })}
          min={0}
          className="w-full px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Time to wait for approval (0 = no timeout)
        </p>
      </div>
    </div>
  );
}

// Transform Node Properties
function TransformNodeProperties({
  data,
  nodeId,
  updateNode,
}: {
  data: TransformNodeData;
  nodeId: string;
  updateNode: (id: string, data: Partial<TransformNodeData>) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          Name
        </label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => updateNode(nodeId, { name: e.target.value })}
          className="w-full px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Output Type */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          Output Type
        </label>
        <select
          value={data.outputType}
          onChange={(e) =>
            updateNode(nodeId, {
              outputType: e.target.value as "expressions" | "object",
            })
          }
          className="w-full px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="expressions">Expressions</option>
          <option value="object">Object</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Expressions: Each assignment is a separate output variable. Object: All assignments combined into one object.
        </p>
      </div>

      {/* Assignments */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          Assignments
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Transform data using CEL expressions. Each assignment creates an output variable.
        </p>
        <KeyValueEditor
          value={data.assignments}
          onChange={(assignments) => updateNode(nodeId, { assignments })}
          keyPlaceholder="Variable name"
          valuePlaceholder="CEL expression"
          keyLabel="Variable"
          valueLabel="Expression"
        />
      </div>
    </div>
  );
}

// Set State Node Properties
function SetStateNodeProperties({
  data,
  nodeId,
  updateNode,
}: {
  data: SetStateNodeData;
  nodeId: string;
  updateNode: (id: string, data: Partial<SetStateNodeData>) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1.5">
          State Assignments
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Set or update workflow state variables. Values can be literals or expressions.
        </p>
        <KeyValueEditor
          value={data.assignments}
          onChange={(assignments) => updateNode(nodeId, { assignments })}
          keyPlaceholder="State variable"
          valuePlaceholder="Value or expression"
          keyLabel="Variable"
          valueLabel="Value"
        />
      </div>
    </div>
  );
}
