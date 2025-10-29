"""Execution context for workflow runs."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field


@dataclass
class NodeExecution:
    """Record of a node execution."""

    node_id: str
    timestamp: datetime
    success: bool
    duration: Optional[float] = None
    error: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "nodeId": self.node_id,
            "timestamp": self.timestamp.isoformat(),
            "success": self.success,
            "duration": self.duration,
            "error": self.error,
        }


@dataclass
class ExecutionContext:
    """Workflow execution context with variables and state."""

    workflow_id: str
    session_id: str
    _variables: Dict[str, Any] = field(default_factory=dict)
    _scoped_variables: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    _execution_history: List[NodeExecution] = field(default_factory=list)
    _node_states: Dict[str, Any] = field(default_factory=dict)
    started_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def set_variable(self, name: str, value: Any, scope: str = "global") -> None:
        """Set a variable in the specified scope."""
        if scope == "global":
            self._variables[name] = value
        else:
            if scope not in self._scoped_variables:
                self._scoped_variables[scope] = {}
            self._scoped_variables[scope][name] = value

    def get_variable(self, name: str, scope: str = "global") -> Any:
        """Get a variable with scope chain lookup."""
        # Check scoped variables first
        if scope != "global" and scope in self._scoped_variables:
            if name in self._scoped_variables[scope]:
                return self._scoped_variables[scope][name]

        # Fall back to global
        return self._variables.get(name)

    def get_all_variables(self) -> Dict[str, Any]:
        """Get all variables merged (global + scoped)."""
        result = dict(self._variables)
        for scope_vars in self._scoped_variables.values():
            result.update(scope_vars)
        return result

    def record_execution(
        self,
        node_id: str,
        success: bool,
        duration: Optional[float] = None,
        error: Optional[str] = None,
    ) -> None:
        """Record a node execution."""
        self._execution_history.append(
            NodeExecution(
                node_id=node_id,
                timestamp=datetime.now(),
                success=success,
                duration=duration,
                error=error,
            )
        )

    def get_execution_trace(self) -> List[NodeExecution]:
        """Get execution history."""
        return self._execution_history

    def set_node_state(self, node_id: str, state: Any) -> None:
        """Set node-specific state."""
        self._node_states[node_id] = state

    def get_node_state(self, node_id: str) -> Optional[Any]:
        """Get node-specific state."""
        return self._node_states.get(node_id)

    def to_dict(self) -> dict:
        """Convert to dictionary for serialization."""
        return {
            "workflowId": self.workflow_id,
            "sessionId": self.session_id,
            "variables": self._variables,
            "scopedVariables": self._scoped_variables,
            "executionHistory": [e.to_dict() for e in self._execution_history],
            "startedAt": self.started_at.isoformat(),
            "metadata": self.metadata,
        }
