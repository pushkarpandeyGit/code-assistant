from typing import Annotated, Optional, TypedDict

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages

from model import model


# =========================================================
# State
# =========================================================

class CodeState(TypedDict):
    code: str
    language: str
    task: str                 # explain | debug | optimize | test | complexity | analyze
    question: Optional[str]   # only used by "analyze"
    result: str
    messages: Annotated[list, add_messages]  # only used by "analyze"


# =========================================================
# Helper
# =========================================================

def get_text(response) -> str:
    content = response.content
    if isinstance(content, list):
        content = "".join(
            item["text"]
            for item in content
            if item.get("type") == "text"
        )
    return content


# =========================================================
# Task Nodes
# =========================================================

def explain_node(state: CodeState):
    prompt = f"""You are an expert programming instructor explaining code to a developer.

**Language:** {state['language']}

**Your task:** Explain the following code clearly using this exact structure:

## Overview
One paragraph summary of what this code does and its purpose.

## Step-by-Step Breakdown
Walk through the code block by block or line by line, explaining:
- What each section does
- Why it works that way
- Any important language features or patterns used

## Key Concepts
List 2–5 important programming concepts this code demonstrates (e.g., recursion, list comprehension, closures).

## Beginner Summary
In 2–3 simple sentences, explain what this code does as if talking to someone new to programming.

---

**Code:**
```{state['language']}
{state['code']}
```

Use markdown formatting throughout. Be precise, educational, and thorough."""

    response = model.invoke(prompt)
    return {"result": get_text(response)}


def debug_node(state: CodeState):
    prompt = f"""You are an expert software debugger performing a thorough code review.

**Language:** {state['language']}

**Your task:** Analyze the following code for bugs using this exact structure:

## Verdict
State clearly: **Bugs Found** or **No Bugs Found**.

## Bugs Identified
For each bug found, provide:

### Bug N — [Short Bug Name]
- **Location:** Line number(s) or function name
- **Severity:** 🔴 Critical | 🟡 Warning | 🔵 Minor
- **What is wrong:** Clear explanation of the problem
- **Why it occurs:** Root cause explanation
- **Fix:** Exact corrected code in a code block

## Corrected Code
If bugs were found, provide the complete corrected version of the code.

## Additional Observations
Note any code smells, style issues, or potential improvements even if not bugs.

---

**Code:**
```{state['language']}
{state['code']}
```

Be precise about line numbers. Do not invent bugs that don't exist."""

    response = model.invoke(prompt)
    return {"result": get_text(response)}


def optimize_node(state: CodeState):
    prompt = f"""You are a senior software engineer performing a performance and quality review.

**Language:** {state['language']}

**Your task:** Optimize the following code using this exact structure:

## Complexity Analysis (Before)
| Metric | Value | Notes |
|--------|-------|-------|
| Time Complexity | O(?) | Explain why |
| Space Complexity | O(?) | Explain why |

## Identified Improvements
List each optimization opportunity:

### Improvement N — [Name]
- **Category:** Performance | Readability | Maintainability | Memory
- **Issue:** What is suboptimal and why
- **Solution:** How to fix it

## Optimized Code
```{state['language']}
[improved code here]
```

## Complexity Analysis (After)
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Time Complexity | O(?) | O(?) | Description |
| Space Complexity | O(?) | O(?) | Description |

## Summary of Changes
Brief bullet list of every change made and why.

---

**Code:**
```{state['language']}
{state['code']}
```

Always provide concrete improved code. Quantify improvements wherever possible."""

    response = model.invoke(prompt)
    return {"result": get_text(response)}


def test_node(state: CodeState):
    # Map language to test framework
    framework_map = {
        "python": "pytest",
        "javascript": "Jest",
        "typescript": "Jest",
        "java": "JUnit 5",
        "c++": "Google Test (gtest)",
        "c": "Unity Test Framework",
        "go": "Go testing package (testing.T)",
        "rust": "Rust built-in #[cfg(test)]",
        "ruby": "RSpec",
        "php": "PHPUnit",
        "csharp": "xUnit",
        "c#": "xUnit",
        "kotlin": "JUnit 5 with Kotlin",
        "swift": "XCTest",
    }

    lang_lower = state["language"].lower().strip()
    framework = framework_map.get(lang_lower, f"the standard test framework for {state['language']}")

    prompt = f"""You are an expert QA engineer and testing specialist.

**Language:** {state['language']}
**Test Framework:** {framework}

**Your task:** Generate comprehensive test cases using this exact structure:

## Test Plan Overview
Brief description of what is being tested and the testing strategy.

## Test Cases

### Normal Cases
Test with typical, expected inputs:
```{state['language']}
[test code using {framework}]
```

### Edge Cases
Test with unusual but valid inputs (empty inputs, single elements, zeros, negatives, etc.):
```{state['language']}
[test code using {framework}]
```

### Boundary Cases
Test at the exact boundaries of valid input ranges:
```{state['language']}
[test code using {framework}]
```

### Error / Exception Cases
Test invalid inputs and expected exceptions:
```{state['language']}
[test code using {framework}]
```

## Test Summary Table
| Test Case | Input | Expected Output | Category | Status |
|-----------|-------|-----------------|----------|--------|
| ... | ... | ... | Normal/Edge/Boundary | ✅ Pass |

## How to Run
```bash
[command to run the tests]
```

---

**Code to test:**
```{state['language']}
{state['code']}
```

Write actual executable test code, not pseudocode. Use {framework} syntax correctly."""

    response = model.invoke(prompt)
    return {"result": get_text(response)}


def complexity_node(state: CodeState):
    prompt = f"""You are an expert algorithms and data structures engineer.

**Language:** {state['language']}

**Your task:** Perform a thorough complexity analysis using this exact structure:

## Overall Complexity

| Metric | Complexity | Rating |
|--------|------------|--------|
| Time Complexity (Best) | O(?) | 🟢 Excellent / 🟡 Fair / 🔴 Poor |
| Time Complexity (Average) | O(?) | |
| Time Complexity (Worst) | O(?) | |
| Space Complexity | O(?) | |

## Function-by-Function Breakdown

For each function or major code block:

### `function_name()` or [Block N]
| Metric | Value |
|--------|-------|
| Time Complexity | O(?) |
| Space Complexity | O(?) |

**Why:** Explanation of what drives this complexity (loop structure, recursion depth, data structure operations, etc.)

## Complexity Drivers
Explain the key factors that determine the overall complexity:
- What causes the dominant time complexity term
- What causes the dominant space complexity term
- Any hidden costs (sorting, hashing, string operations, etc.)

## Optimization Potential
| Current | Achievable | How |
|---------|-----------|-----|
| O(?) time | O(?) time | Brief description |
| O(?) space | O(?) space | Brief description |

## Verdict
Is this complexity **acceptable**, **needs improvement**, or **critical to fix** for production use? Explain briefly.

---

**Code:**
```{state['language']}
{state['code']}
```

Be mathematically precise. Show your reasoning, not just the answer."""

    response = model.invoke(prompt)
    return {"result": get_text(response)}


def analyze_node(state: CodeState):
    """
    Code Chat / Analyze — uses conversation memory via LangGraph MemorySaver.
    On first turn: seeds with a strong SystemMessage framing the code context.
    On follow-up turns: checkpointer auto-loads prior messages.
    """
    question = state.get("question") or "Explain this code."

    if not state.get("messages"):
        # First turn: build full context
        system_msg = SystemMessage(content=f"""You are an expert programming assistant specialized in {state['language']}.

The user has provided the following code for analysis. All your answers must be grounded in this code.
Do not invent information, functions, or behavior that is not present in the code below.
When referencing specific lines or functions, be precise.
Use markdown formatting with headers, bullet points, and code blocks where appropriate.

**Language:** {state['language']}

**Code:**
```{state['language']}
{state['code']}
```""")
        question_msg = HumanMessage(content=question)
        history = [system_msg, question_msg]
    else:
        # Follow-up turn: prior messages already loaded by checkpointer
        question_msg = HumanMessage(content=question)
        history = state["messages"] + [question_msg]

    response = model.invoke(history)
    ai_msg = AIMessage(content=get_text(response))

    return {
        "result": get_text(response),
        "messages": [question_msg, ai_msg] if state.get("messages") else history + [ai_msg],
    }


# =========================================================
# Router
# =========================================================

def router(state: CodeState) -> str:
    task = (state.get("task") or "").strip().lower()
    valid_tasks = {"explain", "debug", "optimize", "test", "complexity", "analyze"}
    if task not in valid_tasks:
        raise ValueError(f"Unknown task '{task}'. Must be one of: {sorted(valid_tasks)}")
    return task


# =========================================================
# Build Graph
# =========================================================

graph = StateGraph(CodeState)

graph.add_node("explain",    explain_node)
graph.add_node("debug",      debug_node)
graph.add_node("optimize",   optimize_node)
graph.add_node("test",       test_node)
graph.add_node("complexity", complexity_node)
graph.add_node("analyze",    analyze_node)

graph.add_conditional_edges(
    START,
    router,
    {
        "explain":    "explain",
        "debug":      "debug",
        "optimize":   "optimize",
        "test":       "test",
        "complexity": "complexity",
        "analyze":    "analyze",
    },
)

for node_name in ["explain", "debug", "optimize", "test", "complexity", "analyze"]:
    graph.add_edge(node_name, END)

checkpointer = MemorySaver()
app = graph.compile(checkpointer=checkpointer)
