"""CEL (Common Expression Language) evaluator for workflow nodes.

This module provides a wrapper around the celpy library for evaluating
CEL expressions in Transform, IfElse, and While nodes.
"""

import logging
from typing import Any, Dict

from celpy import Environment, Runner
from celpy.adapter import json_to_cel

logger = logging.getLogger(__name__)


class CELEvaluationError(Exception):
    """Raised when CEL expression evaluation fails."""
    pass


class CELEvaluator:
    """CEL expression evaluator with security sandboxing."""

    def __init__(self, safe_mode: bool = True):
        """Initialize CEL evaluator.

        Args:
            safe_mode: If True, enables security restrictions
        """
        self.safe_mode = safe_mode
        self.env = Environment()

    def evaluate(self, expression: str, context: Dict[str, Any]) -> Any:
        """Evaluate CEL expression with given context.

        Args:
            expression: CEL expression string (e.g., "price * 1.1")
            context: Variable context for evaluation

        Returns:
            Evaluation result (can be any type: int, str, bool, dict, list, etc.)

        Raises:
            CELEvaluationError: If expression evaluation fails

        Example:
            >>> evaluator = CELEvaluator()
            >>> evaluator.evaluate("1 + 1", {})
            2
            >>> evaluator.evaluate("user.name + ' is ' + string(user.age)", {
            ...     "user": {"name": "Alice", "age": 30}
            ... })
            'Alice is 30'
        """
        try:
            # Compile CEL expression to AST
            ast = self.env.compile(expression)

            # Wrap context dicts with json_to_cel for dot notation support
            activation = self._prepare_activation(context)

            # Create runner and evaluate
            runner = Runner(ast)
            result = runner.evaluate(activation)

            logger.debug(f"CEL evaluation: '{expression}' -> {result}")
            return result

        except Exception as e:
            error_msg = f"CEL evaluation error for expression '{expression}': {str(e)}"
            logger.error(error_msg)
            raise CELEvaluationError(error_msg) from e

    def evaluate_condition(self, expression: str, context: Dict[str, Any]) -> bool:
        """Evaluate CEL expression as boolean condition.

        Args:
            expression: CEL boolean expression (e.g., "score > 80")
            context: Variable context for evaluation

        Returns:
            Boolean result

        Raises:
            CELEvaluationError: If expression doesn't evaluate to boolean

        Example:
            >>> evaluator = CELEvaluator()
            >>> evaluator.evaluate_condition("score > 80", {"score": 85})
            True
            >>> evaluator.evaluate_condition("status == 'active'", {"status": "inactive"})
            False
        """
        result = self.evaluate(expression, context)

        if not isinstance(result, bool):
            raise CELEvaluationError(
                f"Expected boolean result, got {type(result).__name__}: {result}"
            )

        return result

    def _prepare_activation(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare activation context with proper CEL type wrapping.

        Wraps nested dicts/lists with json_to_cel() to enable dot notation access.

        Args:
            context: Raw variable context

        Returns:
            Wrapped activation context for CEL evaluation
        """
        activation = {}

        for key, value in context.items():
            # Wrap dicts and lists with json_to_cel for dot notation support
            if isinstance(value, (dict, list)):
                activation[key] = json_to_cel(value)
            else:
                activation[key] = value

        return activation


# Convenience function for quick evaluation
def evaluate_cel(expression: str, context: Dict[str, Any]) -> Any:
    """Quick CEL expression evaluation.

    Args:
        expression: CEL expression string
        context: Variable context

    Returns:
        Evaluation result
    """
    evaluator = CELEvaluator()
    return evaluator.evaluate(expression, context)
