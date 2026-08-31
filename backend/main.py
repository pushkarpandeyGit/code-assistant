
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_google_genai import ChatGoogleGenerativeAI


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


# Create Gemini model through LangChain
model = ChatGoogleGenerativeAI(
    model="gemini-3.7-flash",
    google_api_key=os.getenv("GEMINI_API_KEY")
)


# Home route
@app.get("/")
def home():
    return {
        "message": "Hello from FastAPI"
    }


# Code analysis route
@app.post("/analyze")
def analyze(data: CodeRequest):

    if data.task == "explain":
        instruction = "Explain the code clearly and step by step."

    elif data.task == "debug":
        instruction = "Find possible bugs or errors in the code and explain how to fix them."

    elif data.task == "optimize":
        instruction = "Suggest ways to improve the code's efficiency, readability, or performance."

    else:
        instruction = "Analyze the code and provide useful feedback."

    prompt = f"""
        You are an expert programming assistant.

        {instruction}

        Language: {data.language}

        Code:
        {data.code}
        """

    response = model.invoke(prompt)

    content = response.content

    if isinstance(content, list):
        content = "".join(
            item["text"]
            for item in content
            if item.get("type") == "text"
        )

    return {
        "response": content
    }

    