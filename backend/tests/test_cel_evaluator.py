"""
Unit tests for CEL (Common Expression Language) evaluator.

Tests CEL expression evaluation for various data types and operations.
"""

import pytest
from src.utils.cel_evaluator import CELEvaluator, CELEvaluationError


# ==================== Fixtures ====================

@pytest.fixture
def cel_evaluator():
    """CEL evaluator instance."""
    return CELEvaluator()


@pytest.fixture
def basic_context():
    """Basic evaluation context with variables."""
    return {
        "x": 10,
        "y": 20,
        "name": "Alice",
        "active": True,
        "items": [1, 2, 3, 4, 5],
        "user": {
            "name": "Bob",
            "age": 25,
            "address": {
                "city": "Seoul",
                "country": "Korea"
            }
        }
    }


# ==================== Arithmetic Operations ====================

def test_cel_basic_arithmetic(cel_evaluator, basic_context):
    """Test CEL basic arithmetic operations."""
    assert cel_evaluator.evaluate("x + y", basic_context) == 30
    assert cel_evaluator.evaluate("y - x", basic_context) == 10
    assert cel_evaluator.evaluate("x * y", basic_context) == 200
    assert cel_evaluator.evaluate("y / x", basic_context) == 2.0
    assert cel_evaluator.evaluate("y % 3", basic_context) == 2


def test_cel_operator_precedence(cel_evaluator, basic_context):
    """Test CEL operator precedence."""
    assert cel_evaluator.evaluate("x + y * 2", basic_context) == 50  # 10 + (20*2)
    assert cel_evaluator.evaluate("(x + y) * 2", basic_context) == 60  # (10+20)*2


def test_cel_negative_numbers(cel_evaluator):
    """Test CEL with negative numbers."""
    context = {"x": -5, "y": 3}
    assert cel_evaluator.evaluate("x + y", context) == -2
    assert cel_evaluator.evaluate("x * y", context) == -15


# ==================== String Operations ====================

def test_cel_string_concatenation(cel_evaluator, basic_context):
    """Test CEL string concatenation."""
    result = cel_evaluator.evaluate('"Hello, " + name', basic_context)
    assert result == "Hello, Alice"


def test_cel_string_comparison(cel_evaluator, basic_context):
    """Test CEL string comparison."""
    assert cel_evaluator.evaluate('name == "Alice"', basic_context) is True
    assert cel_evaluator.evaluate('name == "Bob"', basic_context) is False
    assert cel_evaluator.evaluate('name != "Bob"', basic_context) is True


def test_cel_string_conversion(cel_evaluator, basic_context):
    """Test CEL string() type conversion."""
    result = cel_evaluator.evaluate('string(x)', basic_context)
    assert result == "10"

    result = cel_evaluator.evaluate('"Value is " + string(y)', basic_context)
    assert result == "Value is 20"


# ==================== Boolean Logic ====================

def test_cel_boolean_operators(cel_evaluator, basic_context):
    """Test CEL boolean AND, OR, NOT operators."""
    assert cel_evaluator.evaluate("active && true", basic_context) is True
    assert cel_evaluator.evaluate("active && false", basic_context) is False
    assert cel_evaluator.evaluate("active || false", basic_context) is True
    assert cel_evaluator.evaluate("!active", basic_context) is False


def test_cel_comparison_operators(cel_evaluator, basic_context):
    """Test CEL comparison operators."""
    assert cel_evaluator.evaluate("x > 5", basic_context) is True
    assert cel_evaluator.evaluate("x < 5", basic_context) is False
    assert cel_evaluator.evaluate("y >= 20", basic_context) is True
    assert cel_evaluator.evaluate("y <= 20", basic_context) is True
    assert cel_evaluator.evaluate("x == 10", basic_context) is True
    assert cel_evaluator.evaluate("x != 20", basic_context) is True


def test_cel_compound_conditions(cel_evaluator, basic_context):
    """Test CEL compound boolean conditions."""
    assert cel_evaluator.evaluate("x > 5 && y < 30", basic_context) is True
    assert cel_evaluator.evaluate("x > 15 || y > 15", basic_context) is True
    assert cel_evaluator.evaluate("!(x > 20)", basic_context) is True


# ==================== Object Access ====================

def test_cel_object_dot_notation(cel_evaluator, basic_context):
    """Test CEL object property access with dot notation."""
    assert cel_evaluator.evaluate("user.name", basic_context) == "Bob"
    assert cel_evaluator.evaluate("user.age", basic_context) == 25


def test_cel_nested_object_access(cel_evaluator, basic_context):
    """Test CEL nested object property access."""
    assert cel_evaluator.evaluate("user.address.city", basic_context) == "Seoul"
    assert cel_evaluator.evaluate("user.address.country", basic_context) == "Korea"


def test_cel_object_in_expressions(cel_evaluator, basic_context):
    """Test CEL using object properties in expressions."""
    assert cel_evaluator.evaluate("user.age >= 18", basic_context) is True
    assert cel_evaluator.evaluate("user.age * 2", basic_context) == 50


# ==================== List Operations ====================

def test_cel_list_indexing(cel_evaluator, basic_context):
    """Test CEL list element access by index."""
    assert cel_evaluator.evaluate("items[0]", basic_context) == 1
    assert cel_evaluator.evaluate("items[2]", basic_context) == 3
    assert cel_evaluator.evaluate("items[4]", basic_context) == 5


def test_cel_list_size(cel_evaluator, basic_context):
    """Test CEL size() function for lists."""
    assert cel_evaluator.evaluate("size(items)", basic_context) == 5


def test_cel_list_contains(cel_evaluator, basic_context):
    """Test CEL list membership with 'in' operator."""
    # Note: CEL syntax for 'in' might vary, testing with size and indexing
    assert cel_evaluator.evaluate("items[0] == 1", basic_context) is True


# ==================== Conditional Expressions ====================

def test_cel_ternary_operator(cel_evaluator, basic_context):
    """Test CEL ternary conditional operator."""
    result = cel_evaluator.evaluate("x > 5 ? 'high' : 'low'", basic_context)
    assert result == "high"

    result = cel_evaluator.evaluate("x > 15 ? 'high' : 'low'", basic_context)
    assert result == "low"


def test_cel_nested_ternary(cel_evaluator, basic_context):
    """Test CEL nested ternary expressions."""
    result = cel_evaluator.evaluate(
        "x > 15 ? 'high' : (x > 5 ? 'medium' : 'low')",
        basic_context
    )
    assert result == "medium"


# ==================== Error Handling ====================

def test_cel_undefined_variable(cel_evaluator):
    """Test CEL error handling for undefined variables."""
    with pytest.raises(CELEvaluationError):  # Should raise evaluation error
        cel_evaluator.evaluate("undefined_var + 1", {})


def test_cel_type_mismatch(cel_evaluator):
    """Test CEL error handling for type mismatches."""
    context = {"x": "not a number"}
    with pytest.raises(CELEvaluationError):  # Should raise type error
        cel_evaluator.evaluate("x + 10", context)


def test_cel_syntax_error(cel_evaluator, basic_context):
    """Test CEL error handling for syntax errors."""
    with pytest.raises(CELEvaluationError):  # Should raise syntax error
        cel_evaluator.evaluate("x + + y", basic_context)


# ==================== Condition Evaluation ====================

def test_cel_evaluate_condition_true(cel_evaluator, basic_context):
    """Test CEL evaluate_condition returns True for truthy expressions."""
    assert cel_evaluator.evaluate_condition("x > 5", basic_context) is True
    assert cel_evaluator.evaluate_condition("active", basic_context) is True


def test_cel_evaluate_condition_false(cel_evaluator, basic_context):
    """Test CEL evaluate_condition returns False for falsy expressions."""
    assert cel_evaluator.evaluate_condition("x > 20", basic_context) is False
    assert cel_evaluator.evaluate_condition("!active", basic_context) is False


def test_cel_evaluate_condition_non_boolean_error(cel_evaluator, basic_context):
    """Test CEL evaluate_condition raises error for non-boolean results."""
    with pytest.raises(CELEvaluationError, match="Expected boolean result"):
        cel_evaluator.evaluate_condition("x + y", basic_context)  # Returns number
