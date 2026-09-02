
from typing import Annotated, Optional, TypedDict

from langchain_core.messages import AIMessage, HumanMessage
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
    messages: Annotated[list, add_messages]  # only populated/used by "analyze"


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
# Task Nodes — unchanged from before. No tool calling, no agent decisions.
# =========================================================

def explain_node(state: CodeState):
    prompt = f"""
You are an expert programming assistant.

Explain this {state['language']} code clearly and step by step.

Code:
{state['code']}
"""
    response = model.invoke(prompt)
    return {"result": get_text(response)}


def debug_node(state: CodeState):
    prompt = f"""
You are an expert programming debugger.

Analyze this {state['language']} code.

Find:
1. What is wrong
2. Why it is wrong
3. How to fix it
4. Corrected code when appropriate

Do not invent bugs if the code is correct.

Code:
{state['code']}
"""
    response = model.invoke(prompt)
    return {"result": get_text(response)}


def optimize_node(state: CodeState):
    prompt = f"""
You are an expert software engineer.

Improve this {state['language']} code.

Focus on:
- Time complexity
- Space complexity
- Performance
- Readability
- Maintainability

Provide improved code when useful.

Code:
{state['code']}
"""
    response = model.invoke(prompt)
    return {"result": get_text(response)}


def test_node(state: CodeState):
    prompt = f"""
You are an expert testing engineer.

Generate useful test cases for this {state['language']} code.

Include:
1. Normal cases
2. Edge cases
3. Boundary cases
4. Expected outputs

Code:
{state['code']}
"""
    response = model.invoke(prompt)
    return {"result": get_text(response)}


def complexity_node(state: CodeState):
    prompt = f"""
You are an expert algorithms engineer.

Analyze this {state['language']} code.

Determine:
1. Time complexity
2. Space complexity
3. Why those complexities occur
4. Best/worst case when relevant

Code:
{state['code']}
"""
    response = model.invoke(prompt)
    return {"result": get_text(response)}


def analyze_node(state: CodeState):
    """
    Code Chat / Analyze — the only node that reads/writes `messages`.
    With the checkpointer attached, `state["messages"]` here already
    contains the full prior history for this thread_id, loaded
    automatically by LangGraph before this node ran. We just append
    the new question + answer; add_messages merges them in.
    """

    question = state.get("question") or "Explain this code."

    if not state.get("messages"):
        # First turn for this thread_id: seed with framing + question.
        framing = f"""
You are an expert programming assistant.

Programming language:
{state['language']}

Code:
{state['code']}

Answer the user's questions specifically using the supplied code.
Do not invent information that is not present in the code.
"""
        seed = HumanMessage(content=framing)
        question_msg = HumanMessage(content=question)
        history = [seed, question_msg]
    else:
        # Follow-up turn: prior messages were auto-loaded by the checkpointer.
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
        raise ValueError(
            f"Unknown task '{task}'. Must be one of: {sorted(valid_tasks)}"
        )

    return task


# =========================================================
# Build Graph
# =========================================================

graph = StateGraph(CodeState)

graph.add_node("explain", explain_node)
graph.add_node("debug", debug_node)
graph.add_node("optimize", optimize_node)
graph.add_node("test", test_node)
graph.add_node("complexity", complexity_node)
graph.add_node("analyze", analyze_node)

graph.add_conditional_edges(
    START,
    router,
    {
        "explain": "explain",
        "debug": "debug",
        "optimize": "optimize",
        "test": "test",
        "complexity": "complexity",
        "analyze": "analyze",
    },
)

for node_name in ["explain", "debug", "optimize", "test", "complexity", "analyze"]:
    graph.add_edge(node_name, END)


checkpointer = MemorySaver()
app = graph.compile(checkpointer=checkpointer)

