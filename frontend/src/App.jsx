
import { useState } from "react";

function App() {
  const [code, setCode] = useState("");
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
          task: "explain",
        }),
      });

      const data = await res.json();

      setResponse(data.response);
    } catch (error) {
      setResponse("Something went wrong.");
      console.error(error);
    }

    setLoading(false);
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

      <button onClick={analyzeCode}>
        {loading ? "Analyzing..." : "Analyze Code"}
      </button>

      <h2>AI Response</h2>

      <p>{response}</p>
    </div>
  );
}

export default App;