import { useState } from 'react';

export default function Home() {
  const [githubRepo, setGithubRepo] = useState('');
  const [githubKey, setGithubKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const fetchRepoFileList = async (repoUrl, token) => {
    const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/');
    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
    const res = await fetch(treeUrl, {
      headers: { Authorization: `token ${token}` },
    });
    const data = await res.json();
    return data.tree?.filter(item => item.type === 'blob').map(item => item.path) || [];
  };

  const sendMessage = async () => {
    setMessages([...messages, { role: 'user', content: input }]);
    setInput('');

    const fileList = await fetchRepoFileList(githubRepo, githubKey);

    // Simulate OpenAI response
    const botReply = `You asked: "${input}". I found ${fileList.length} files in the repo.`;

    setMessages(prev => [...prev, { role: 'assistant', content: botReply }]);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col">
      <div className="bg-white shadow-md rounded p-4 mb-4 space-y-2">
        <input
          className="w-full p-2 border rounded"
          placeholder="GitHub Repo URL"
          value={githubRepo}
          onChange={e => setGithubRepo(e.target.value)}
        />
        <input
          className="w-full p-2 border rounded"
          placeholder="GitHub API Key"
          type="password"
          value={githubKey}
          onChange={e => setGithubKey(e.target.value)}
        />
        <input
          className="w-full p-2 border rounded"
          placeholder="OpenAI API Key"
          type="password"
          value={openaiKey}
          onChange={e => setOpenaiKey(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-auto mb-4 space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className={`p-2 rounded ${msg.role === 'user' ? 'bg-blue-100 text-right' : 'bg-gray-200 text-left'}`}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 p-2 border rounded"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask something..."
        />
        <button onClick={sendMessage} className="bg-blue-500 text-white px-4 py-2 rounded">
          Send
        </button>
      </div>
    </div>
  );
}
