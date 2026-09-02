import uuid

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from graph_gemini import app as graph_app

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# Request models
# =========================================================

class AnalyzeRequest(BaseModel):
    code: str
    language: str
    task: str  # explain | debug | optimize | test | complexity


class ChatRequest(BaseModel):
    code: str
    language: str
    question: str
    thread_id: str | None = None  # omit on first message, reuse afterwards


# =========================================================
# /analyze — unchanged behavior: one-shot, no memory.
# =========================================================

@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    # Fresh random thread_id every call = no history ever loaded =
    # identical behavior to before the checkpointer was added.
    config = {"configurable": {"thread_id": str(uuid.uuid4())}}

    result = graph_app.invoke(
        {
            "code": req.code,
            "language": req.language,
            "task": req.task,
            "question": None,
            "result": "",
            "messages": [],
        },
        config=config,
    )

    return {"result": result["result"]}


# =========================================================
# /chat — the Analyze/Code Chat feature, WITH short-term memory.
# =========================================================

@app.post("/chat")
def chat(req: ChatRequest):
    thread_id = req.thread_id or str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    result = graph_app.invoke(
        {
            "code": req.code,
            "language": req.language,
            "task": "analyze",
            "question": req.question,
            "result": "",
            "messages": [],
        },
        config=config,
    )

    return {
        "result": result["result"],
        "thread_id": thread_id,
    }