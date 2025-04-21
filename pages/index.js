import { useState, useEffect } from 'react';

export default function Home() {
  const [githubRepo, setGithubRepo] = useState('');
  const [githubKey, setGithubKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  // Load from localStorage on first render
  useEffect(() => {
    setGithubRepo(localStorage.getItem('githubRepo') || '');
    setGithubKey(localStorage.getItem('githubKey') || '');
    setOpenaiKey(localStorage.getItem('openaiKey') || '');
  }, []);

  // Save to localStorage when values change
  useEffect(() => {
    localStorage.setItem('githubRepo', githubRepo);
  }, [githubRepo]);

  useEffect(() => {
    localStorage.setItem('githubKey', githubKey);
  }, [githubKey]);

  useEffect(() => {
    localStorage.setItem('openaiKey', openaiKey);
  }, [openaiKey]);

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
  const userMsg = { role: 'user', content: input };
  setMessages(prev => [...prev, userMsg]);
  setInput('');

  const fileList = await fetchRepoFileList(githubRepo, githubKey);

  const prompt = `Here's all the files in a repository:\n${fileList.join('\n')}\n\nWhen working on the user prompt, first figure out which file they're referring to, open it up, then work on the user's prompt.\n\n${input}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'system', content: 'You are a helpful coding assistant.' }, { role: 'user', content: prompt }],
    })
  });

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content || 'Sorry, something went wrong.';

  setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
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
