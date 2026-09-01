
from typing import TypedDict

from langgraph.graph import StateGraph, START, END

from model import model


# -------------------------
# State
# -------------------------

class CodeState(TypedDict):
    code: str
    language: str
    task: str
    result: str


# -------------------------
# Helper
# -------------------------

def get_text(response):

    content = response.content

    if isinstance(content, list):
        content = "".join(
            item["text"]
            for item in content
            if item.get("type") == "text"
        )

    return content


# -------------------------
# Router
# -------------------------

def router(state: CodeState):

    if state["task"] == "explain":
        return "explain"

    elif state["task"] == "debug":
        return "debug"

    else:
        return "optimize"


# -------------------------
# Explain Node
# -------------------------

def explain_node(state: CodeState):

    prompt = f"""
    You are an expert programming assistant.

    Explain the following {state["language"]} code
    clearly and step by step.

    Code:
    {state["code"]}
    """

    response = model.invoke(prompt)

    return {
        "result": get_text(response)
    }


# -------------------------
# Debug Node
# -------------------------

def debug_node(state: CodeState):

    prompt = f"""
    You are an expert programming assistant.

    Find bugs or errors in the following {state["language"]} code.

    Explain:
    1. What is wrong
    2. Why it is wrong
    3. How to fix it

    Code:
    {state["code"]}
    """

    response = model.invoke(prompt)

    return {
        "result": get_text(response)
    }


# -------------------------
# Optimize Node
# -------------------------

def optimize_node(state: CodeState):

    prompt = f"""
    You are an expert programming assistant.

    Suggest improvements for this {state["language"]} code.

    Focus on:
    - readability
    - efficiency
    - performance
    - good coding practices

    Code:
    {state["code"]}
    """

    response = model.invoke(prompt)

    return {
        "result": get_text(response)
    }


# -------------------------
# Build Graph
# -------------------------

graph = StateGraph(CodeState)


graph.add_node("explain", explain_node)
graph.add_node("debug", debug_node)
graph.add_node("optimize", optimize_node)


# START → Router → Selected Node

graph.add_conditional_edges(
    START,
    router,
    {
        "explain": "explain",
        "debug": "debug",
        "optimize": "optimize"
    }
)


# Selected Node → END

graph.add_edge("explain", END)
graph.add_edge("debug", END)
graph.add_edge("optimize", END)


# Compile graph

app = graph.compile()


# -------------------------
# Test
# -------------------------

if __name__ == "__main__":

    result = app.invoke({
        "code": "def add(a, b): return a + b",
        "language": "python",
        "task": "debug",
        "result": ""
    })

    print("\nAI RESPONSE:\n")
    print(result["result"])

