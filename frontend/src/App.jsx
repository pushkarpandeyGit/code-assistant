import { useState } from "react";

function App() {
  const [response, setResponse] = useState("");

  const testBackend = async () => {
    const res = await fetch("http://localhost:8000/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: "print('Hello')",
        language: "python",
        task: "explain",
      }),
    });

    const data = await res.json();

    setResponse(JSON.stringify(data, null, 2));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white gap-6">
      <h1 className="text-4xl font-bold">
        Code Assistant
      </h1>

      <button
        onClick={testBackend}
        className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700"
      >
        Test Backend
      </button>

      <pre className="bg-gray-800 p-4 rounded-lg">
        {response}
      </pre>
    </div>
  );
}

export default App;