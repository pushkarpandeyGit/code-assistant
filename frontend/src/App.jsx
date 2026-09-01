
import { useState } from "react";

function App() {
  const [code, setCode] = useState("");
  const [task, setTask] = useState("explain");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  async function analyzeCode() {
    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code,
          language: "python",
          task: task,
        }),
      });

      const data = await res.json();

      setResponse(data.response);
    } catch (error) {
      console.error(error);
      setResponse("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Code Assistant</h1>

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Paste your code here..."
        rows="10"
        cols="60"
      />

      <br />
      <br />

      <select
        value={task}
        onChange={(e) => setTask(e.target.value)}
      >
        <option value="explain">Explain Code</option>
        <option value="debug">Debug Code</option>
        <option value="optimize">Optimize Code</option>
      </select>

      <br />
      <br />

      <button onClick={analyzeCode} disabled={loading}>
        {loading ? "Analyzing..." : "Analyze Code"}
      </button>

      <h2>AI Response</h2>

      <pre>
        {response}
      </pre>
    </div>
  );
}

export default App;
