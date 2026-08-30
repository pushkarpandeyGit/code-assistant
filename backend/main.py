from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CodeRequest(BaseModel):
    code: str
    language: str
    task: str


@app.get("/")
def home():
    return {"message": "Hello from FastAPI"}


@app.post("/analyze")
def analyze(request: CodeRequest):
    return {
        "message": "I received your code!",
        "code": request.code,
        "language": request.language,
        "task": request.task
    }