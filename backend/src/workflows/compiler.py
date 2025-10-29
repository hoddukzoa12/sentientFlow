"""Workflow compiler - converts JSON workflow to executable graph."""

from typing import Dict, List, Optional, Set
from collections import deque

from src.workflows.models import WorkflowDefinition, Node, Edge, NodeType


class WorkflowCompiler:
    """Compiles visual workflow definition into executable graph."""

    def __init__(self, workflow: WorkflowDefinition):
        self.workflow = workflow
        self.nodes_map: Dict[str, Node] = {n.id: n for n in workflow.nodes}
        self.edges = workflow.edges

        # Build adjacency lists
        self.adjacency = self._build_adjacency()
        self.reverse_adjacency = self._build_reverse_adjacency()

    def _build_adjacency(self) -> Dict[str, List[Edge]]:
        """Build forward adjacency list (node -> outgoing edges)."""
        adjacency: Dict[str, List[Edge]] = {node_id: [] for node_id in self.nodes_map}

        for edge in self.edges:
            if edge.source not in adjacency:
                adjacency[edge.source] = []
            adjacency[edge.source].append(edge)

        return adjacency

    def _build_reverse_adjacency(self) -> Dict[str, List[str]]:
        """Build reverse adjacency list (node -> incoming node IDs)."""
        reverse: Dict[str, List[str]] = {node_id: [] for node_id in self.nodes_map}

        for edge in self.edges:
            if edge.target not in reverse:
                reverse[edge.target] = []
            reverse[edge.target].append(edge.source)

        return reverse

    def find_start_node(self) -> Optional[Node]:
        """Find the Start node in the workflow."""
        for node in self.workflow.nodes:
            if node.type == "start":
                return node
        return None

    def get_next_nodes(
        self,
        node_id: str,
        source_handle: Optional[str] = None
    ) -> List[Node]:
        """Get next nodes connected to this node (optionally from specific handle)."""
        next_nodes = []

        for edge in self.adjacency.get(node_id, []):
            # Filter by source handle if specified
            if source_handle is not None and edge.sourceHandle != source_handle:
                continue

            target_node = self.nodes_map.get(edge.target)
            if target_node:
                next_nodes.append(target_node)

        return next_nodes

    def topological_sort(self) -> List[str]:
        """
        Perform topological sort to determine execution order.
        Returns list of node IDs in execution order.
        """
        in_degree = {node_id: 0 for node_id in self.nodes_map}

        # Calculate in-degrees
        for edge in self.edges:
            in_degree[edge.target] += 1

        # Start with nodes that have no incoming edges
        queue = deque([node_id for node_id, deg in in_degree.items() if deg == 0])
        result = []

        while queue:
            node_id = queue.popleft()
            result.append(node_id)

            # Reduce in-degree for neighbors
            for edge in self.adjacency.get(node_id, []):
                in_degree[edge.target] -= 1
                if in_degree[edge.target] == 0:
                    queue.append(edge.target)

        # Check for cycles
        if len(result) != len(self.nodes_map):
            raise ValueError("Workflow contains cycles - cannot execute")

        return result

    def detect_cycles(self) -> List[List[str]]:
        """Detect cycles in the workflow graph."""
        visited: Set[str] = set()
        rec_stack: Set[str] = set()
        cycles = []

        def dfs(node_id: str, path: List[str]):
            visited.add(node_id)
            rec_stack.add(node_id)
            path.append(node_id)

            for edge in self.adjacency.get(node_id, []):
                neighbor = edge.target
                if neighbor not in visited:
                    dfs(neighbor, path)
                elif neighbor in rec_stack:
                    # Cycle detected
                    cycle_start = path.index(neighbor)
                    cycles.append(path[cycle_start:])

            rec_stack.remove(node_id)
            path.pop()

        for node_id in self.nodes_map:
            if node_id not in visited:
                dfs(node_id, [])

        return cycles

    def validate(self) -> Dict[str, any]:
        """
        Validate workflow structure.
        Returns validation result with errors if any.
        """
        errors = []

        # Check for Start node
        start_node = self.find_start_node()
        if not start_node:
            errors.append("Workflow must have exactly one Start node")

        # Check for cycles
        cycles = self.detect_cycles()
        if cycles:
            errors.append(f"Workflow contains {len(cycles)} cycle(s)")

        # Check for disconnected nodes
        reachable = set()
        if start_node:
            queue = deque([start_node.id])
            while queue:
                node_id = queue.popleft()
                if node_id in reachable:
                    continue
                reachable.add(node_id)
                next_nodes = self.get_next_nodes(node_id)
                queue.extend([n.id for n in next_nodes])

        disconnected = set(self.nodes_map.keys()) - reachable
        if disconnected:
            errors.append(f"Disconnected nodes: {disconnected}")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "nodeCount": len(self.nodes_map),
            "edgeCount": len(self.edges),
            "hasCycles": len(cycles) > 0,
        }
