
import os

from graph_gemini import app as graph_app
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


# Load environment variables from .env
load_dotenv()


# Create FastAPI app
app = FastAPI()


# Allow React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request structure
class CodeRequest(BaseModel):
    code: str
    language: str
    task: str



# Home route
@app.get("/")
def home():
    return {
        "message": "Hello from FastAPI"
    }


# Code analysis route
@app.post("/analyze")
def analyze(data: CodeRequest):

    result = graph_app.invoke({
        "code": data.code,
        "language": data.language,
        "task": data.task,
        "result": ""
    })

    return {
        "response": result["result"]
    }
    