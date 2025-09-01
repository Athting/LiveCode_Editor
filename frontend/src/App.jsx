import { useEffect, useState } from "react";
import "./App.css";
import io from "socket.io-client";
import Editor from "@monaco-editor/react";

const socket = io("http://localhost:5000");

const defaultCode = {
  javascript: "// start your code here\nconsole.log('Hello World');",
  python: "# start your code here\nprint('Hello World')",
  java: `class Main {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}`,
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n cout << \"Hello World\"; return 0; }",
};

export default function App() {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(defaultCode.javascript);
  const [copySuccess, setCopySuccess] = useState("");
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    socket.on("userJoined", setUsers);
    socket.on("codeUpdate", setCode);
    socket.on("userTyping", (user) => {
      setTyping(`${user.slice(0, 8)}... is typing`);
      setTimeout(() => setTyping(""), 2000);
    });
    socket.on("languageUpdate", (newLang) => {
      setLanguage(newLang);
      setCode(defaultCode[newLang]);
    });
    socket.on("codeResponse", (run) => {
      console.log("Response from server:", run);
      setOutput(run.stdout || run.stderr || run.output || "No output");
      setLoading(false);
    });

    return () => {
      socket.off("userJoined");
      socket.off("codeUpdate");
      socket.off("userTyping");
      socket.off("languageUpdate");
      socket.off("codeResponse");
    };
  }, []);

  const joinRoom = () => {
    if (!roomId || !userName) return;
    socket.emit("join", { roomId, userName });
    setJoined(true);
    setCode(defaultCode[language]);
  };

  const leaveRoom = () => {
    socket.emit("leaveRoom");
    setJoined(false);
    setRoomId("");
    setUserName("");
    setCode(defaultCode.javascript);
    setOutput("");
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit("codeChange", { roomId, code: newCode });
    socket.emit("typing", { roomId, userName });
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    setCode(defaultCode[newLang]);
    socket.emit("languageChange", { roomId, language: newLang });
  };

  const runCode = () => {
    setLoading(true);
    socket.emit("compileCode", { code, roomId, language });
  };

  if (!joined)
    return (
      <div className="join-container">
        <div className="join-form">
          <h1>Join a Code Room</h1>
          <input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Room ID"
          />
          <input
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Your Name"
          />
          <button onClick={joinRoom}>Join Room</button>
        </div>
      </div>
    );

  return (
    <div className="editor-container">
      <div className="sidebar">
        <div className="room-info">
          <h2>
            Room: <span className="room-id">{roomId}</span>
          </h2>
          <button
            className="copy-button"
            onClick={() => {
              navigator.clipboard.writeText(roomId);
              setCopySuccess("Copied!");
              setTimeout(() => setCopySuccess(""), 2000);
            }}
          >
            📋 Copy Room ID
          </button>
          {copySuccess && <span className="copy-success">{copySuccess}</span>}
        </div>

        <div className="user-list-section">
          <h3>👥 Users:</h3>
          <ul>
            {users.map((u, i) => (
              <li key={i}>{u.slice(0, 8)}</li>
            ))}
          </ul>
        </div>

        <p className="typing-indicator">{typing}</p>

        <select
          className="language-selector"
          value={language}
          onChange={handleLanguageChange}
        >
          <option value="javascript">JavaScript (Node)</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
        </select>

        <button className="leave-button" onClick={leaveRoom}>
          🚪 Leave Room
        </button>
      </div>

      <div className="editor-wrapper">
        <Editor
          height="60%"
          language={language}
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"
          options={{ minimap: { enabled: false } }}
        />
        <button className="run-btn" onClick={runCode} disabled={loading}>
          {loading ? "Running..." : "Execute"}
        </button>
        <textarea
          className="output-console"
          value={output}
          readOnly
          placeholder="Output will appear here..."
        />
      </div>
    </div>
  );
}
