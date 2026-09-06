# <c> coedass — AI Code Assistant

> A full-stack AI coding workspace for explaining, debugging, optimizing, testing, and analyzing code.

[![Live Demo](https://img.shields.io/badge/Live-Demo-success)](https://coedass.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-black)](https://github.com/pushkarpandeyGit/code-assistant)

---

## 🚀 Live Demo

- **Try coedass:** [codeassistant-7y40vv1f5-pushkar24.vercel.app](https://coedass.vercel.app/)

---

## 📸 Screenshots

### 1. Main Workspace

<img width="1903" height="907" alt="image" src="https://github.com/user-attachments/assets/d26ea7ed-4f7d-4f61-b10a-7460294a107e" />


---

### 2. AI Code Explanation

<img width="1898" height="908" alt="image" src="https://github.com/user-attachments/assets/08efc0d1-4035-43bc-ba49-976f3fa041d3" />


---

### 3. Debugging

<img width="1897" height="908" alt="image" src="https://github.com/user-attachments/assets/888d0ca7-ccce-455a-b8fa-8764142de786" />


---

### 4. Code Chat

<img width="1901" height="907" alt="image" src="https://github.com/user-attachments/assets/8a8d489f-fe46-4b5b-ba26-01f1deaedc50" />


---

##  What is coedass?

coedass is a full-stack AI-powered coding assistant that allows developers to work with code directly inside a browser-based development workspace. Instead of copying code into a general-purpose chatbot, users can enter code into a Monaco-based editor and choose a specific engineering task.

### Current Capabilities
- 🔍 **Explain Code** — Understand code step by step with clear overviews and line-by-line breakdowns
- 🐛 **Debug** — Identify logic flaws, locate line numbers, and suggest concrete fixes
- ⚡ **Optimize** — Improve code efficiency and compare Before vs. After Big-O complexity
- 🧪 **Generate Tests** — Create framework-specific unit test suites (pytest, Jest, JUnit, etc.)
- 📊 **Complexity Analysis** — Analyze time and space complexity and dominant algorithmic drivers
- 💬 **Code Chat** — Ask multi-turn follow-up questions grounded directly in the active code context

---

##  Architecture
<img width="412" height="816" alt="image" src="https://github.com/user-attachments/assets/6c0f2719-7b95-455b-809f-4831311254c7" />




### Production Deployment Pipeline

```text
Browser ──> Vercel (React Frontend Edge)
                 │
                 │ HTTPS / SSE
                 ▼
            Railway (FastAPI Container)
                 │
                 ▼
            LangGraph Router
                 │
                 ▼
            Google Gemini API
                 │
                 ▼
            FastAPI (StreamingResponse)
                 │
                 ▼
            Browser (Progressive UI Render)
```

---

##  How It Works

1. **User enters code:** Code is typed or pasted directly into the Monaco Editor.
2. **User selects a task:** The selected task determines what type of analysis should be performed.
3. **React sends the request:** The frontend sends `code`, `language`, and `task` to the FastAPI backend via HTTP POST.
4. **FastAPI receives the request:** FastAPI validates the request using Pydantic schemas and passes the data to the AI workflow.
5. **LangGraph routes the task:** The conditional router determines which analysis node should execute:
   ```text
   task
     ├── explain    ──> explain_node
     ├── debug      ──> debug_node
     ├── optimize   ──> optimize_node
     ├── test       ──> test_node
     ├── complexity ──> complexity_node
     └── analyze    ──> analyze_node
   ```
6. **Gemini generates the response:** The selected node constructs the structured prompt and sends it to Gemini.
7. **Response reaches the frontend:** The backend sends the generated result back to the browser. For streaming responses, the frontend reads incoming data progressively and updates the response panel in real time.

---

##  Technology Stack

| Technology | Purpose |
|---|---|
| **React 19** | Frontend UI component architecture |
| **Vite** | Frontend development and build tooling |
| **Tailwind CSS v4** | Responsive workspace styling |
| **Monaco Editor** | In-browser code editing experience |
| **FastAPI** | High-performance asynchronous backend API |
| **Pydantic** | Request data parsing and validation |
| **LangGraph** | AI workflow orchestration and conditional task routing |
| **LangChain** | LLM model integration and message abstractions |
| **Google Gemini 3.5 Flash** | AI code analysis and generation |
| **Vercel** | Frontend edge deployment and hosting |
| **Railway** | Backend containerized deployment |

---

##  AI Workflow

coedass uses a task-based LangGraph workflow:
<img width="1085" height="747" alt="image" src="https://github.com/user-attachments/assets/130906ac-517b-42c8-a833-fea06ba814c2" />



---

##  Stateful Code Chat

The **Code Chat** feature supports multi-turn follow-up questions about the active code. Each conversation is associated with a unique `thread_id`:

```text
User Question
     │
     ▼
 thread_id
     │
     ▼
 LangGraph
     │
     ▼
Conversation History (MemorySaver)
     │
     ▼
   Gemini
     │
     ▼
   Answer
```

The current implementation uses `MemorySaver` for in-memory checkpointing, preserving conversation context across multiple messages during an active session.

---

## Streaming

coedass supports streamed responses for one-shot analysis using Server-Sent Events (SSE):

```text
Gemini ──> Backend ──> SSE Events ──> Browser ReadableStream ──> TextDecoder ──> JSON Parsing ──> React State ──> ResponsePanel
```

The frontend reads the stream using:
```javascript
const reader = response.body.getReader();
```
and progressively updates the displayed result as tokens arrive.

---

##  Project Structure

```text
code-assistant/
├── backend/
│   ├── main.py              # FastAPI app, endpoints, rate limiting, and SSE
│   ├── model.py             # Gemini model initialization via LangChain
│   ├── graph_gemini.py      # LangGraph state definition, router, and task nodes
│   ├── requirements.txt     # Backend Python dependencies
│   ├── test_smoke.py        # Smoke tests for endpoint and graph validation
│   └── .env.example         # Environment template for backend
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components (Editor, Panels, Header, Sidebar)
│   │   ├── context/         # AppContext for global state
│   │   ├── config.js        # Dynamic API_BASE and markdown helpers
│   │   ├── App.jsx          # Root layout and workspace routing
│   │   └── main.jsx         # Vite React entry point
│   ├── public/              # Static assets
│   ├── index.html           # HTML template
│   ├── package.json         # Frontend dependencies and build scripts
│   ├── vite.config.js       # Vite configuration with Tailwind CSS plugin
│   └── .env.example         # Environment template for frontend
├── .gitignore
└── README.md
```

---

##  Running Locally

### 1. Prerequisites
- **Node.js** (v18+) and **npm**
- **Python** (3.10+)
- **Google Gemini API Key** (from [Google AI Studio](https://aistudio.google.com/))

### 2. Backend Setup
```bash
cd backend

# Create and activate a virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate
# macOS / Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env     # Windows
```

Add your Gemini API key in `backend/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Start the FastAPI server:
```bash
uvicorn main:app --reload
```
Backend API will be live at: `http://localhost:8000` (Interactive docs at `http://localhost:8000/docs`).

### 3. Frontend Setup
Open a new terminal window:
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
Frontend will be live at: `http://localhost:5173`.

For local development, ensure `frontend/.env` (or default fallback) points to:
```env
VITE_API_URL=http://localhost:8000
```

---

##  Environment Variables

### Backend (`backend/.env`)
```env
GEMINI_API_KEY=your_api_key_here
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:8000
```

> **Security Note:** Never commit your actual API keys to version control. The repository uses `.env.example` templates for reference.

---

##  Deployment

- **Frontend:** Deployed to **Vercel** connected directly to the GitHub repository.
- **Backend:** Deployed to **Railway** running FastAPI inside a managed container.
- The frontend communicates with the Railway backend using the `VITE_API_URL` environment variable configured in Vercel's dashboard.

---

##  A Real Deployment Issue I Solved

During production deployment, the application worked smoothly locally but failed in production with browser fetch errors:
```text
Access to fetch at Railway from origin Vercel has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### Debugging & Resolution Flow
```text
Production Frontend
       │
       ▼ (POST /stream)
  CORS Error
       │
       ▼
Browser DevTools (Inspected preflight OPTIONS request)
       │
       ▼
Identified Dynamic Vercel Origin (e.g. https://codeassistant-*.vercel.app)
       │
       ▼
Updated FastAPI CORSMiddleware with regex pattern (allow_origin_regex=r"https?://.*")
       │
       ▼
Redeployed Backend to Railway
       │
       ▼
Preflight Succeeded & Communication Verified
```

This resolved the issue across both production domains and ephemeral Vercel preview branch URLs.

---

##  Possible Future Improvements

- [ ] Persistent database-backed conversation history (PostgreSQL / Redis)
- [ ] User authentication and saved code sessions
- [ ] Multi-file repository ingestion
- [ ] In-browser code execution sandbox
- [ ] GitHub repository import integration

---

##  Key Engineering Concepts Demonstrated

- **Component-Based Frontend:** Clean React component hierarchy and separation of concerns
- **State Management:** React Context API for global state without prop-drilling
- **Asynchronous APIs:** FastAPI endpoints with non-blocking I/O
- **Streaming Architecture:** Real-time Server-Sent Events (SSE) token consumption
- **Data Validation:** Pydantic schemas for runtime payload safety
- **Agentic Workflows:** LangGraph conditional routing and task graphs
- **Stateful Memory:** Checkpointing multi-turn conversations
- **DevOps & Cloud Deployment:** Decoupled frontend/backend deployment on Vercel and Railway

---

##  Author

**Pushkar Kumar Pandey**  
B.Tech — Electronics & Communication Engineering  
VIT Chennai  


---

## Project Links

- **Live Demo:** [coedass](https://coedass.vercel.app/)
- **GitHub Repository:** [github.com/pushkarpandeyGit/code-assistant](https://github.com/pushkarpandeyGit/code-assistant)
