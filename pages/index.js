import { useEffect, useState } from 'react';

export default function Home() {
  const [githubRepo, setGithubRepo] = useState('');
  const [githubKey, setGithubKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [isFirstSend, setIsFirstSend] = useState(true);
  const [darkMode, setDarkMode] = useState(false); // New state for dark mode

  useEffect(() => {
    const storedRepo = localStorage.getItem('githubRepo');
    const storedGitHubKey = localStorage.getItem('githubKey');
    const storedOpenAIKey = localStorage.getItem('openaiKey');

    if (storedRepo) setGithubRepo(storedRepo);
    if (storedGitHubKey) setGithubKey(storedGitHubKey);
    if (storedOpenAIKey) setOpenaiKey(storedOpenAIKey);
  }, []);

  useEffect(() => {
    localStorage.setItem('githubRepo', githubRepo);
    localStorage.setItem('githubKey', githubKey);
    localStorage.setItem('openaiKey', openaiKey);
  }, [githubRepo, githubKey, openaiKey]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const containerStyle = {
    padding: '1rem',
    fontFamily: 'sans-serif',
    backgroundColor: darkMode ? '#121212' : '#fff',
    color: darkMode ? '#f0f0f0' : '#000',
    minHeight: '100vh'
  };

  const inputStyle = {
    display: 'block',
    width: '100%',
    marginBottom: '8px',
    backgroundColor: darkMode ? '#333' : '#fff',
    color: darkMode ? '#f0f0f0' : '#000',
    border: darkMode ? '1px solid #555' : '1px solid #ccc'
  };

  const buttonStyle = {
    marginTop: '0.5rem',
    backgroundColor: darkMode ? '#444' : '#eee',
    color: darkMode ? '#fff' : '#000',
  };

  const messageBoxStyle = {
    border: '1px solid #ccc',
    padding: '1rem',
    marginTop: '1rem',
    height: '300px',
    overflowY: 'scroll',
    backgroundColor: darkMode ? '#222' : '#fff',
    color: darkMode ? '#f0f0f0' : '#000',
  };

  const errorStyle = {
    backgroundColor: '#fee',
    color: '#900',
    padding: '1rem',
    marginTop: '1rem',
    whiteSpace: 'pre-wrap'
  };

  // (other methods like sendMessage, fetchRepoFileList, fetchFileContent, commitAndPushFile, etc. remain unchanged)

  return (
    <div style={containerStyle}>
      <h1 style={{ fontWeight: 'bold' }}>Vibe Code Assistant</h1>
      
      <button onClick={toggleDarkMode} style={buttonStyle}>
        Toggle Dark Mode
      </button>
      
      <input
        placeholder="GitHub Repo URL"
        value={githubRepo}
        onChange={e => setGithubRepo(e.target.value)}
        style={inputStyle}
      />
      <input
        placeholder="GitHub API Key"
        type="password"
        value={githubKey}
        onChange={e => setGithubKey(e.target.value)}
        style={inputStyle}
      />
      <input
        placeholder="OpenAI API Key"
        type="password"
        value={openaiKey}
        onChange={e => setOpenaiKey(e.target.value)}
        style={inputStyle}
      />
      <div style={messageBoxStyle}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: '1rem' }}>
            <strong>{m.role}:</strong> <pre style={{ whiteSpace: 'pre-wrap' }}>{m.content}</pre>
          </div>
        ))}
      </div>
      <textarea
        rows={3}
        value={input}
        onChange={e => setInput(e.target.value)}
        style={{ width: '100%', marginTop: '1rem', ...inputStyle }}
      />
      <button onClick={sendMessage} style={buttonStyle}>Send</button>

      {error && (
        <div style={errorStyle}>
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
