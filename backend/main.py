# ─────────────────────────────────────────────────────────────
# main.py — FastAPI Backend for AI Code Assistant
#
# This file is the entry point of our backend server.
# It receives requests from the React frontend, passes them
# to our LangGraph AI pipeline, and sends the results back.
#
# Here's the full flow:
#   React (frontend)
#     → POST /analyze or /chat  (this file)
#       → LangGraph graph        (graph_gemini.py)
#         → Gemini AI model      (model.py)
#           → back to this file
#             → back to React
# ─────────────────────────────────────────────────────────────


# ─────────────────────────────────────────────────────────────
# Standard library imports
# These come built into Python — no installation needed.
# - logging : print structured logs to the terminal
# - time    : measure how long each request takes
# - uuid    : generate unique IDs for each conversation thread
# ─────────────────────────────────────────────────────────────
import json
import logging
import time
import uuid
from typing import Optional


# ─────────────────────────────────────────────────────────────
# FastAPI imports
# FastAPI is the web framework that handles HTTP requests.
# - FastAPI        : the main app class
# - HTTPException  : lets us return proper error responses (like 404, 503)
# - Request        : gives us info about the incoming HTTP request
# - CORSMiddleware : allows the React frontend (different port) to talk to this server
# - StreamingResponse : used for the /stream endpoint (token-by-token streaming)
# ─────────────────────────────────────────────────────────────
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse


# ─────────────────────────────────────────────────────────────
# Pydantic imports
# Pydantic handles request validation automatically.
# When the frontend sends JSON, Pydantic checks that all the
# required fields are present and valid before our code runs.
# - BaseModel      : base class for defining what a request should look like
# - field_validator: lets us write custom validation rules per field
# ─────────────────────────────────────────────────────────────
from pydantic import BaseModel, field_validator


# ─────────────────────────────────────────────────────────────
# slowapi — Rate Limiter
# This prevents a single user from spamming our API and
# running up our Gemini API costs.
# Example: "max 20 requests per minute per IP address"
# ─────────────────────────────────────────────────────────────
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address


# ─────────────────────────────────────────────────────────────
# Our own modules
# - graph_app   : the compiled LangGraph pipeline (START → Router → Node → END)
# - checkpointer: the MemorySaver that stores conversation history in RAM
# - model       : the Gemini AI model (used directly in /stream for token streaming)
# ─────────────────────────────────────────────────────────────
from graph_gemini import app as graph_app, checkpointer
from model import model


# ─────────────────────────────────────────────────────────────
# Set up logging
# Every time a request comes in or something goes wrong,
# we print a timestamped log line to the terminal.
# Example output:
#   2026-09-03 11:20:01 | INFO | POST /analyze | task=debug | lang=python | 2.3s
# ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# Set up the rate limiter
# key_func=get_remote_address means we rate-limit by IP address.
# default_limits=["30/minute"] means: max 30 requests per minute per IP.
# Individual endpoints can override this with their own limits.
# ─────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["30/minute"])


# ─────────────────────────────────────────────────────────────
# Create the FastAPI app
# This is the main object that handles all HTTP routes.
# The title and description show up in Swagger UI at /docs.
# ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Code Assistant API",
    description="LangGraph + Gemini powered code analysis backend",
    version="1.0.0",
)

# Attach the rate limiter to the app so it runs on every request
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ─────────────────────────────────────────────────────────────
# CORS — Cross-Origin Resource Sharing
# By default, browsers block requests from one origin (e.g. localhost:5173)
# to a different origin (e.g. localhost:8000).
# This middleware tells the browser: "Yes, the React app is allowed to talk to us."
# We allow both port 3000 and 5173 since Vite uses 5173 and Create React App uses 3000.
# ─────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],   # allow GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],   # allow any headers
)


# ─────────────────────────────────────────────────────────────
# Constants
# These are values we use in multiple places and don't want to
# hard-code repeatedly throughout the file.
# ─────────────────────────────────────────────────────────────

# All valid task names our LangGraph router understands
VALID_TASKS = ["explain", "debug", "optimize", "test", "complexity", "analyze"]

# Max code size we accept — roughly 300 lines of code.
# Anything bigger risks hitting Gemini token limits.
MAX_CODE_LENGTH = 12_000


# ─────────────────────────────────────────────────────────────
# Task Metadata
# This is a list of all 6 features our app supports.
# The /tasks endpoint returns this list so the frontend can
# build its task selector dynamically — no hardcoding on the React side.
# ─────────────────────────────────────────────────────────────
TASK_METADATA = [
    {
        "id": "explain",
        "label": "Explain Code",
        "description": "Step-by-step explanation of what the code does, key concepts, and beginner summary.",
        "icon": "📖",
    },
    {
        "id": "debug",
        "label": "Debug Code",
        "description": "Identify bugs, explain why they occur, rate severity, and provide corrected code.",
        "icon": "🐛",
    },
    {
        "id": "optimize",
        "label": "Optimize Code",
        "description": "Improve time/space complexity, performance, readability, and maintainability.",
        "icon": "⚡",
    },
    {
        "id": "test",
        "label": "Generate Tests",
        "description": "Generate normal, edge, boundary, and error test cases using the correct framework for your language.",
        "icon": "🧪",
    },
    {
        "id": "complexity",
        "label": "Complexity Analysis",
        "description": "Determine time and space complexity per function with best/worst/average cases.",
        "icon": "📊",
    },
    {
        "id": "analyze",
        "label": "Code Chat",
        "description": "Ask open-ended questions about your code with multi-turn conversation memory.",
        "icon": "💬",
    },
]


# ─────────────────────────────────────────────────────────────
# Request Models (Pydantic)
# These define exactly what JSON body each endpoint expects.
# Pydantic automatically:
#   1. Parses the incoming JSON
#   2. Runs our validators below
#   3. Returns a 422 error with a clear message if anything is wrong
# ─────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    """
    What the frontend sends when clicking "Analyze Code".
    Example JSON:
        { "code": "def add(a, b): return a + b", "language": "python", "task": "explain" }
    """
    code: str       # the code the user pasted
    language: str   # e.g. "python", "javascript", "c++"
    task: str       # which of the 6 features to run

    # Validator: make sure code is not empty or just whitespace
    @field_validator("code")
    @classmethod
    def code_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Code must not be empty.")
        if len(v) > MAX_CODE_LENGTH:
            raise ValueError(f"Code exceeds maximum length of {MAX_CODE_LENGTH} characters.")
        return v

    # Validator: make sure the task is one of our 6 known tasks
    @field_validator("task")
    @classmethod
    def task_must_be_valid(cls, v):
        if v.strip().lower() not in VALID_TASKS:
            raise ValueError(f"Invalid task '{v}'. Must be one of: {VALID_TASKS}")
        return v.strip().lower()

    # Validator: make sure language is not blank
    @field_validator("language")
    @classmethod
    def language_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Language must not be empty.")
        return v.strip()


class ChatRequest(BaseModel):
    """
    What the frontend sends for the Code Chat feature.
    The key difference from AnalyzeRequest is:
    - it has a `question` field (the user's message)
    - it has an optional `thread_id` field

    thread_id logic:
    - First message → don't send thread_id (or send null) → backend creates one
    - Follow-up messages → send the same thread_id → LangGraph loads memory from it
    - New chat → don't send thread_id again → fresh conversation

    Example JSON (first message):
        { "code": "...", "language": "python", "question": "What does this loop do?" }

    Example JSON (follow-up):
        { "code": "...", "language": "python", "question": "Can it be optimized?", "thread_id": "abc-123" }
    """
    code: str
    language: str
    question: str
    thread_id: Optional[str] = None  # None = start new conversation

    @field_validator("code")
    @classmethod
    def code_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Code must not be empty.")
        if len(v) > MAX_CODE_LENGTH:
            raise ValueError(f"Code exceeds maximum length of {MAX_CODE_LENGTH} characters.")
        return v

    @field_validator("question")
    @classmethod
    def question_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Question must not be empty.")
        return v.strip()

    @field_validator("language")
    @classmethod
    def language_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Language must not be empty.")
        return v.strip()


class StreamRequest(BaseModel):
    """
    What the frontend sends when using the /stream endpoint.
    Same as AnalyzeRequest but without the `analyze` task
    (streaming chat has its own flow via /chat).
    """
    code: str
    language: str
    task: str

    @field_validator("code")
    @classmethod
    def code_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Code must not be empty.")
        if len(v) > MAX_CODE_LENGTH:
            raise ValueError(f"Code exceeds maximum length of {MAX_CODE_LENGTH} characters.")
        return v

    @field_validator("task")
    @classmethod
    def task_must_be_valid(cls, v):
        if v.strip().lower() not in VALID_TASKS:
            raise ValueError(f"Invalid task '{v}'. Must be one of: {VALID_TASKS}")
        return v.strip().lower()


# ─────────────────────────────────────────────────────────────
# Helper: build_prompt_for_task()
# The /stream endpoint bypasses LangGraph and calls the Gemini
# model directly (so it can stream tokens one by one).
# This helper builds the same structured prompt that each
# LangGraph node would use — so the output quality is identical.
# ─────────────────────────────────────────────────────────────
def build_prompt_for_task(task: str, language: str, code: str) -> str:
    prompt_map = {
        "explain": f"""You are an expert programming instructor explaining code to a developer.

**Language:** {language}

**Your task:** Explain the following code clearly using this exact structure:

## Overview
One paragraph summary of what this code does and its purpose.

## Step-by-Step Breakdown
Walk through the code block by block or line by line.

## Key Concepts
List 2–5 important programming concepts this code demonstrates.

## Beginner Summary
In 2–3 simple sentences, explain what this code does to someone new to programming.

---

**Code:**
```{language}
{code}
```""",

        "debug": f"""You are an expert software debugger.

**Language:** {language}

## Verdict
State clearly: **Bugs Found** or **No Bugs Found**.

## Bugs Identified
For each bug: Location, Severity (🔴 Critical / 🟡 Warning / 🔵 Minor), What is wrong, Why it occurs, Fix.

## Corrected Code
If bugs were found, provide the complete corrected version.

## Additional Observations

---

**Code:**
```{language}
{code}
```""",

        "optimize": f"""You are a senior software engineer doing a performance review.

**Language:** {language}

## Complexity Analysis (Before)
| Metric | Value | Notes |
|--------|-------|-------|
| Time Complexity | O(?) | |
| Space Complexity | O(?) | |

## Identified Improvements
For each: Category, Issue, Solution.

## Optimized Code
```{language}
[improved code]
```

## Complexity Analysis (After)
| Metric | Before | After | Improvement |

## Summary of Changes

---

**Code:**
```{language}
{code}
```""",

        "test": f"""You are an expert QA engineer.

**Language:** {language}

Generate comprehensive test cases with Normal, Edge, Boundary, and Error cases.
Use the correct test framework for {language}.
Include a test summary table and how-to-run instructions.

---

**Code:**
```{language}
{code}
```""",

        "complexity": f"""You are an expert algorithms engineer.

**Language:** {language}

## Overall Complexity Table (Best / Average / Worst time + Space)
## Function-by-Function Breakdown
## Complexity Drivers
## Optimization Potential
## Verdict

---

**Code:**
```{language}
{code}
```""",
    }

    # If somehow we get an unknown task, fall back to a generic prompt
    return prompt_map.get(task, f"Analyze this {language} code:\n\n{code}")


# ─────────────────────────────────────────────────────────────
# GET /health
# A simple "is the server alive?" check.
# The React frontend calls this on load to show a green/red status dot.
# Also useful for deployment platforms (Render, Railway) to verify the server is up.
# ─────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": "gemini-3.5-flash-lite",
        "version": "1.0.0",
        "endpoints": ["/health", "/tasks", "/analyze", "/chat", "/stream", "/history/{thread_id}"],
    }


# ─────────────────────────────────────────────────────────────
# GET /tasks
# Returns the list of all 6 tasks with their labels, descriptions, and icons.
# The React frontend fetches this once on load to dynamically build
# the task selector dropdown — so if we ever add a new task,
# the frontend updates automatically without any code change.
# ─────────────────────────────────────────────────────────────
@app.get("/tasks")
def get_tasks():
    return {"tasks": TASK_METADATA}


# ─────────────────────────────────────────────────────────────
# POST /analyze
# The main one-shot analysis endpoint.
# Used for: Explain, Debug, Optimize, Generate Tests, Complexity Analysis.
#
# How it works:
# 1. Pydantic validates the request (empty code? bad task? → reject with 422)
# 2. We generate a fresh random thread_id (so each call has no memory)
# 3. We pass the request to LangGraph — it routes to the right node
# 4. LangGraph calls Gemini and returns the result
# 5. We return { "result": "...", "task": "...", "language": "..." }
#
# Rate limit: 20 requests per minute per IP
# ─────────────────────────────────────────────────────────────
@app.post("/analyze")
@limiter.limit("20/minute")
def analyze(req: AnalyzeRequest, request: Request):
    # Track how long this takes so we can log it
    start = time.time()

    # Generate a fresh unique ID for this request.
    # A new thread_id every time = no conversation memory = clean one-shot analysis.
    config = {"configurable": {"thread_id": str(uuid.uuid4())}}

    logger.info(f"POST /analyze | task={req.task} | lang={req.language} | code_len={len(req.code)}")

    try:
        # Send everything to LangGraph.
        # LangGraph's router reads `task` and decides which node to run.
        result = graph_app.invoke(
            {
                "code": req.code,
                "language": req.language,
                "task": req.task,
                "question": None,   # not needed for one-shot tasks
                "result": "",       # will be filled in by the task node
                "messages": [],     # not used by non-chat tasks
            },
            config=config,
        )
    except ValueError as e:
        # This catches invalid task errors from the router
        logger.warning(f"Validation error in /analyze: {e}")
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        # This catches Gemini API errors, network errors, etc.
        logger.error(f"Error in /analyze: {e}")
        raise HTTPException(
            status_code=503,
            detail={
                "error": "gemini_error",
                "message": "The AI model failed to respond. Please try again.",
            },
        )

    elapsed = round(time.time() - start, 2)
    logger.info(f"POST /analyze | done | {elapsed}s")

    return {
        "result": result["result"],
        "task": req.task,
        "language": req.language,
    }


# ─────────────────────────────────────────────────────────────
# POST /chat
# The Code Chat endpoint — the only endpoint with memory.
# Used for the "Code Chat" feature where users ask follow-up questions.
#
# How memory works:
# - LangGraph's MemorySaver stores conversation history in RAM
# - Each conversation is identified by a unique thread_id
# - When we invoke LangGraph with the same thread_id, it automatically
#   loads the previous messages and the AI "remembers" the context
# - A different thread_id = a completely fresh conversation
#
# The frontend is responsible for:
# 1. Saving the thread_id returned in the first response
# 2. Sending that same thread_id in all follow-up messages
# 3. NOT generating a new thread_id for each message (that breaks memory!)
#
# Rate limit: 30 requests per minute per IP (slightly higher since chat is interactive)
# ─────────────────────────────────────────────────────────────
@app.post("/chat")
@limiter.limit("30/minute")
def chat(req: ChatRequest, request: Request):
    start = time.time()

    # If the frontend sends a thread_id, reuse it (= continue conversation).
    # If not (first message or new chat), create a fresh one.
    thread_id = req.thread_id or str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    logger.info(f"POST /chat | thread={thread_id} | lang={req.language} | code_len={len(req.code)}")

    try:
        # Always route to the "analyze" node for chat.
        # The analyze node is the only one that reads/writes the messages list,
        # which is how LangGraph's memory checkpointing works.
        result = graph_app.invoke(
            {
                "code": req.code,
                "language": req.language,
                "task": "analyze",      # always "analyze" for chat
                "question": req.question,
                "result": "",
                "messages": [],         # LangGraph will merge in saved messages automatically
            },
            config=config,
        )
    except Exception as e:
        logger.error(f"Error in /chat: {e}")
        raise HTTPException(
            status_code=503,
            detail={
                "error": "gemini_error",
                "message": "The AI model failed to respond. Please try again.",
            },
        )

    elapsed = round(time.time() - start, 2)
    logger.info(f"POST /chat | done | thread={thread_id} | {elapsed}s")

    # IMPORTANT: we return thread_id so the frontend can store it
    # and send it back in the next message to continue this conversation.
    return {
        "result": result["result"],
        "thread_id": thread_id,
    }


# ─────────────────────────────────────────────────────────────
# POST /stream
# Streaming version of /analyze using Server-Sent Events (SSE).
#
# Normal /analyze: waits 3–5 seconds, returns everything at once.
# /stream: sends tokens one by one as Gemini generates them (like ChatGPT typing).
#
# How SSE works:
# 1. Frontend opens a connection to /stream
# 2. Backend keeps the connection open and sends "data: <token>\n\n" for each chunk
# 3. When done, we send "data: [DONE]\n\n" as a signal to close
# 4. Frontend reads these events and appends each token to the UI in real-time
#
# We bypass LangGraph here and call the Gemini model directly with model.astream()
# because LangGraph doesn't support streaming out of the box.
#
# Rate limit: 20 requests per minute per IP
# ─────────────────────────────────────────────────────────────
@app.post("/stream")
@limiter.limit("20/minute")
async def stream(req: StreamRequest, request: Request):
    logger.info(f"POST /stream | task={req.task} | lang={req.language} | code_len={len(req.code)}")

    # Build the same prompt that the LangGraph node would use
    prompt = build_prompt_for_task(req.task, req.language, req.code)

    # This is an async generator — it yields one token at a time
    async def token_generator():
        try:
            async for chunk in model.astream(prompt):
                # Extract text content from the chunk
                # (Gemini sometimes returns content as a list of parts)
                content = chunk.content
                if isinstance(content, list):
                    content = "".join(
                        item["text"] for item in content if item.get("type") == "text"
                    )
                if content:
                    # We JSON-encode the token so that newlines inside the
                    # AI response don't break the SSE format.
                    # SSE uses \n\n as a message delimiter, so raw newlines
                    # inside content would cause parsing bugs on the frontend.
                    # JSON.stringify escapes them safely: "\n" → "\\n"
                    yield f"data: {json.dumps({'t': content})}\n\n"
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield f"data: {json.dumps({'t': '[ERROR] AI model failed to respond.'})}\n\n"
        finally:
            # Always send [DONE] so the frontend knows streaming is complete
            yield f"data: {json.dumps({'t': '[DONE]'})}\n\n"

    return StreamingResponse(
        token_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",       # don't cache SSE responses
            "X-Accel-Buffering": "no",          # tell nginx not to buffer (important for streaming)
        },
    )


# ─────────────────────────────────────────────────────────────
# GET /history/{thread_id}
# Retrieves the full conversation history for a given chat session.
#
# LangGraph's MemorySaver stores all messages in RAM keyed by thread_id.
# This endpoint reads that stored state and returns the messages
# in a simple format the frontend can display.
#
# Example: GET /history/abc-123
# Returns:
# {
#   "thread_id": "abc-123",
#   "message_count": 4,
#   "messages": [
#     { "role": "system", "content": "You are an expert..." },
#     { "role": "user", "content": "What does this loop do?" },
#     { "role": "assistant", "content": "This loop iterates..." },
#     { "role": "user", "content": "Can it be optimized?" },
#     ...
#   ]
# }
# ─────────────────────────────────────────────────────────────
@app.get("/history/{thread_id}")
def get_history(thread_id: str):
    logger.info(f"GET /history/{thread_id}")

    try:
        config = {"configurable": {"thread_id": thread_id}}

        # Ask LangGraph to load the saved state for this thread
        state = graph_app.get_state(config)

        # If nothing was found, return an empty history (don't error)
        if state is None or not state.values:
            return {"thread_id": thread_id, "message_count": 0, "messages": []}

        raw_messages = state.values.get("messages", [])

        # Convert LangChain message objects into plain dicts the frontend understands
        messages = []
        for msg in raw_messages:
            cls_name = msg.__class__.__name__

            # Map LangChain class names to simple role strings
            if cls_name == "HumanMessage":
                role = "user"
            elif cls_name == "AIMessage":
                role = "assistant"
            elif cls_name == "SystemMessage":
                role = "system"
            else:
                role = "unknown"

            # Content can sometimes be a list of parts — flatten it to a single string
            content = msg.content
            if isinstance(content, list):
                content = "".join(
                    item["text"] for item in content if item.get("type") == "text"
                )

            messages.append({"role": role, "content": content})

        return {
            "thread_id": thread_id,
            "message_count": len(messages),
            "messages": messages,
        }

    except Exception as e:
        logger.error(f"Error retrieving history for thread {thread_id}: {e}")
        raise HTTPException(
            status_code=404,
            detail={
                "error": "thread_not_found",
                "message": f"No conversation found for thread_id: {thread_id}",
            },
        )