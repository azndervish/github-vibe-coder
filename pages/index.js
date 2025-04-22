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

  const fetchRepoFileList = async (repoUrl, token) => {
    const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/');
    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
    const res = await fetch(treeUrl, {
      headers: { Authorization: `token ${token}` },
    });
    const data = await res.json();
    return data.tree?.filter(item => item.type === 'blob').map(item => item.path) || [];
  };

  const fetchFileContent = async (repoUrl, filePath, token) => {
    const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/');
    const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const res = await fetch(fileUrl, {
      headers: { Authorization: `token ${token}` },
    });

    if (!res.ok) throw new Error(`Error reading ${filePath}: ${res.status} ${res.statusText}`);

    const data = await res.json();
    if (data.encoding === 'base64') {
      return atob(data.content);
    } else {
      return data.content;
    }
  };

  const commitAndPushFile = async (repoUrl, filePath, newContent, commitMessage, token) => {
    const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/');
    const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

    const getRes = await fetch(fileUrl, {
      headers: { Authorization: `token ${token}` },
    });
    const getData = await getRes.json();

    const res = await fetch(fileUrl, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: commitMessage,
        content: btoa(newContent),
        sha: getData.sha,
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to commit ${filePath}: ${res.status} ${res.statusText}`);
    }
  };

  const sendMessage = async () => {
    try {
      setError(null);
      const userMsg = { role: 'user', content: input };
      setMessages(prev => [...prev, userMsg]);
      setInput('');

      let updatedHistory = [...chatHistory, userMsg];

      let fileListPrompt = '';
      if (isFirstSend) {
        const fileList = await fetchRepoFileList(githubRepo, githubKey);
        fileListPrompt = `Here's all the files in the repository:\n${fileList.join('\n')}`;
        const systemPrompt = { role: 'system', content: 'You are a helpful coding assistant.' };
        const fileListMessage = { role: 'user', content: fileListPrompt };

        updatedHistory = [systemPrompt, fileListMessage, userMsg];
        setMessages(prev => [...prev, { role: 'system', content: fileListPrompt }]);
        setIsFirstSend(false);
      }

      const modelId = "gpt-4o-2024-08-06";
      const initialRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          messages: updatedHistory,
        })
      });

      const initialData = await initialRes.json();
      if (!initialData.choices) {
        throw new Error(`OpenAI API returned an unexpected response:\n\n${JSON.stringify(initialData, null, 2)}`);
      }

      const message = initialData.choices[0].message;

      const reply = message.content;
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      setChatHistory(updatedHistory.concat({ role: 'assistant', content: reply }));

    } catch (err) {
      const message = err instanceof Error
        ? `${err.message}\n\n${err.stack}`
        : JSON.stringify(err, null, 2);
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 font-sans">
      <h1 className="text-3xl font-bold mb-4">Vibe Code Assistant</h1>

      <input
        placeholder="GitHub Repo URL"
        value={githubRepo}
        onChange={e => setGithubRepo(e.target.value)}
        className="block w-full mb-2 p-2 bg-gray-800 text-white border border-gray-700 rounded"
      />

      <input
        placeholder="GitHub API Key"
        type="password"
        value={githubKey}
        onChange={e => setGithubKey(e.target.value)}
        className="block w-full mb-2 p-2 bg-gray-800 text-white border border-gray-700 rounded"
      />

      <input
        placeholder="OpenAI API Key"
        type="password"
        value={openaiKey}
        onChange={e => setOpenaiKey(e.target.value)}
        className="block w-full mb-2 p-2 bg-gray-800 text-white border border-gray-700 rounded"
      />

      <div className="border border-gray-700 bg-gray-800 p-4 rounded mb-4 overflow-y-scroll h-64">
        {messages.map((m, i) => (
          <div key={i} className="mb-3">
            <strong className="block">{m.role}:</strong>
            <pre className="whitespace-pre-wrap">{m.content}</pre>
          </div>
        ))}
      </div>

      <textarea
        rows={3}
        value={input}
        onChange={e => setInput(e.target.value)}
        className="w-full p-2 mb-2 bg-gray-800 text-white border border-gray-700 rounded"
      />

      <button
        onClick={sendMessage}
        className="mt-2 bg-teal-600 text-white py-2 px-4 rounded hover:bg-teal-500"
      >
        Send
      </button>

      {error && (
        <div className="bg-red-600 text-white p-4 mt-4 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
