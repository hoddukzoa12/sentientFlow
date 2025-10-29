"""Workflow definition models (Pydantic)."""

from typing import Any, Dict, List, Optional, Literal
from pydantic import BaseModel, Field


# ============================================================================
# Node Types
# ============================================================================

NodeType = Literal[
    "start",
    "agent",
    "end",
    "note",
    "fileSearch",
    "guardrails",
    "mcp",
    "ifElse",
    "while",
    "userApproval",
    "transform",
    "setState",
]

VariableType = Literal["string", "number", "boolean", "object", "list"]


# ============================================================================
# Variable Definitions
# ============================================================================

class Variable(BaseModel):
    """Input/state variable definition."""

    id: str
    name: str
    type: VariableType
    defaultValue: Optional[Any] = None


# ============================================================================
# Node Data Models
# ============================================================================

class BaseNodeData(BaseModel):
    """Base node data with common fields."""

    name: str = ""


class StartNodeData(BaseNodeData):
    """Start node configuration."""

    variables: List[Variable] = Field(default_factory=list)


class AgentNodeData(BaseNodeData):
    """Agent node configuration (GPT-5 only)."""

    systemPrompt: str = ""
    userPrompt: str = ""
    model: str = "gpt-5"

    # GPT-5 parameters
    reasoningEffort: Optional[Literal["minimal", "low", "medium", "high"]] = "medium"

    outputVariable: str = "agent_response"


class TransformNodeData(BaseNodeData):
    """Transform node configuration."""

    outputType: Literal["expressions", "object"] = "expressions"
    assignments: List[Dict[str, str]] = Field(default_factory=list)


class IfElseNodeData(BaseNodeData):
    """If/Else node configuration."""

    conditions: List[Dict[str, Any]] = Field(default_factory=list)


class WhileNodeData(BaseNodeData):
    """While loop node configuration."""

    condition: str = "false"
    maxIterations: int = 100


class SetStateNodeData(BaseNodeData):
    """SetState node configuration."""

    assignments: List[Dict[str, str]] = Field(default_factory=list)


class EndNodeData(BaseNodeData):
    """End node configuration."""

    pass


class NoteNodeData(BaseNodeData):
    """Note node configuration."""

    content: str = ""


# ============================================================================
# Node Definition
# ============================================================================

class Node(BaseModel):
    """Workflow node definition."""

    id: str
    type: NodeType
    position: Dict[str, float]
    data: Dict[str, Any]  # Will be validated based on type


# ============================================================================
# Edge Definition
# ============================================================================

class Edge(BaseModel):
    """Workflow edge (connection) definition."""

    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None


# ============================================================================
# Workflow Definition
# ============================================================================

class WorkflowDefinition(BaseModel):
    """Complete workflow definition."""

    id: str
    name: str = "Untitled Workflow"
    version: str = "1.0.0"
    nodes: List[Node]
    edges: List[Edge]
    variables: List[Variable] = Field(default_factory=list)


# ============================================================================
# Execution Request
# ============================================================================

class WorkflowExecutionRequest(BaseModel):
    """Request to execute a workflow."""

    workflowId: str
    workflowDefinition: WorkflowDefinition
    inputVariables: Dict[str, Any] = Field(default_factory=dict)
    sessionContext: Optional[Dict[str, Any]] = None
