import { useEffect, useState } from 'react';

const functions = [
  {
    name: "get_file_content",
    description: "Retrieve the content of a specific file from a GitHub repository.",
    parameters: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "The path to the file within the repository (e.g., 'src/app.js')."
        }
      },
      required: ["file_path"]
    }
  },
  {
    name: "commit_file",
    description: "Commit and push changes to a specific file in a GitHub repository.",
    parameters: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "The path to the file being updated."
        },
        new_content: {
          type: "string",
          description: "The updated content of the file."
        },
        commit_message: {
          type: "string",
          description: "A short message describing the change."
        }
      },
      required: ["file_path", "new_content", "commit_message"]
    }
  }
];

export default function Home() {
  const [githubRepo, setGithubRepo] = useState('');
  const [githubKey, setGithubKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [branch, setBranch] = useState('main');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [isFirstSend, setIsFirstSend] = useState(true);

  useEffect(() => {
    const storedRepo = localStorage.getItem('githubRepo');
    const storedGitHubKey = localStorage.getItem('githubKey');
    const storedOpenAIKey = localStorage.getItem('openaiKey');
    const storedBranch = localStorage.getItem('branch');

    if (storedRepo) setGithubRepo(storedRepo);
    if (storedGitHubKey) setGithubKey(storedGitHubKey);
    if (storedOpenAIKey) setOpenaiKey(storedOpenAIKey);
    if (storedBranch) {
      setBranch(storedBranch);
    } else {
      setBranch('main');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('githubRepo', githubRepo);
    localStorage.setItem('githubKey', githubKey);
    localStorage.setItem('openaiKey', openaiKey);
    localStorage.setItem('branch', branch);
  }, [githubRepo, githubKey, openaiKey, branch]);

  const fetchRepoFileList = async (repoUrl, token) => {
    const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/');
    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    const res = await fetch(treeUrl, {
      headers: { Authorization: `token ${token}` },
    });
    const data = await res.json();
    return data.tree?.filter(item => item.type === 'blob').map(item => item.path) || [];
  };

  const fetchFileContent = async (repoUrl, filePath, token) => {
    const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/');
    const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
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
    const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;

    try {
      // Attempt to retrieve the file details to get the SHA
      const getRes = await fetch(fileUrl, {
        headers: { Authorization: `token ${token}` },
      });

      const getData = getRes.ok ? await getRes.json() : null;
      const sha = getData ? getData.sha : null;

      // Create the request body
      const body = JSON.stringify({
        message: commitMessage,
        content: btoa(newContent),
        // Include the SHA only if the file already exists
        ...sha && { sha },
        branch: branch,
      });

      // Send the request to commit the file
      const res = await fetch(fileUrl, {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json',
        },
        body: body,
      });

      if (!res.ok) {
        throw new Error(`Failed to commit ${filePath}: ${res.status} ${res.statusText}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        console.error(`The file ${filePath} does not exist, creating a new file.`);
      } else {
        throw error;
      }
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
          functions: functions
        })
      });

      const initialData = await initialRes.json();
      if (!initialData.choices) {
        throw new Error(`OpenAI API returned an unexpected response:\n\n${JSON.stringify(initialData, null, 2)}`);
      }

      const message = initialData.choices[0].message;

      if (message.function_call) {
        const { name: functionName, arguments: functionArgsRaw } = message.function_call;
        const functionArgs = JSON.parse(functionArgsRaw);
        const timestamp = new Date().toLocaleTimeString();

        setMessages(prev => [
          ...prev,
          {
            role: 'function',
            content: `Function called: ${functionName} @ ${timestamp}\nArguments:\n${Object.entries(functionArgs)
              .filter(([key]) => functionName === 'commit_file' ? key !== 'new_content' : true)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\n')}`
          }
        ]);

        if (functionName === 'get_file_content') {
          const fileContent = await fetchFileContent(githubRepo, functionArgs.file_path, githubKey);
          const functionMsg = {
            role: 'function',
            name: functionName,
            content: fileContent
          };
          const finalHistory = [...updatedHistory, message, functionMsg];

          const finalRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: modelId,
              messages: finalHistory,
            })
          });

          const finalData = await finalRes.json();
          if (!finalData.choices) {
            throw new Error(`OpenAI API returned an unexpected response:\n\n${JSON.stringify(finalData, null, 2)}`);
          }
          const reply = finalData.choices[0].message.content;
          setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
          setChatHistory(finalHistory.concat({ role: 'assistant', content: reply }));
        } else if (functionName === 'commit_file') {
          await commitAndPushFile(
            githubRepo,
            functionArgs.file_path,
            functionArgs.new_content,
            functionArgs.commit_message,
            githubKey
          );
          setMessages(prev => [...prev, { role: 'assistant', content: 'File committed successfully.' }]);
          setChatHistory(updatedHistory.concat(message, {
            role: 'function',
            name: functionName,
            content: 'File committed successfully.'
          }, {
            role: 'assistant',
            content: 'File committed successfully.'
          }));
        }
      } else {
        const reply = message.content;
        setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
        setChatHistory(updatedHistory.concat({ role: 'assistant', content: reply }));
      }
    } catch (err) {
      const message = err instanceof Error
        ? `${err.message}\n\n${err.stack}`
        : JSON.stringify(err, null, 2);
      setError(message);
    }
  };

  const branchEnv = process.env.NEXT_PUBLIC_BRANCH;
  const commitHashEnv = process.env.NEXT_PUBLIC_COMMIT_HASH;

  return (
    <div style={{ padding: '1rem', fontFamily: 'sans-serif', backgroundColor: '#121212', color: '#ffffff' }}>
      <input
        placeholder="GitHub Repo URL"
        value={githubRepo}
        onChange={e => setGithubRepo(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: '8px', backgroundColor: '#333333', color: '#ffffff', border: '1px solid #555555' }}
      />
      <input
        placeholder="GitHub API Key"
        type="text"
        value={githubKey}
        onChange={e => setGithubKey(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: '8px', backgroundColor: '#333333', color: '#ffffff', border: '1px solid #555555' }}
      />
      <input
        placeholder="OpenAI API Key"
        type="text"
        value={openaiKey}
        onChange={e => setOpenaiKey(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: '8px', backgroundColor: '#333333', color: '#ffffff', border: '1px solid #555555' }}
      />
      <input
        placeholder="Branch"
        value={branch}
        onChange={e => setBranch(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: '8px', backgroundColor: '#333333', color: '#ffffff', border: '1px solid #555555' }}
      />
      <div style={{ border: '1px solid #555555', backgroundColor: '#1e1e1e', padding: '1rem', marginTop: '1rem', height: '300px', overflowY: 'scroll' }}>
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
        style={{ width: '100%', marginTop: '1rem', backgroundColor: '#333333', color: '#ffffff', border: '1px solid #555555' }}
      />
      <button onClick={sendMessage} style={{ marginTop: '0.5rem', backgroundColor: '#333333', color: '#ffffff', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer' }}>Send</button>

      {error && (
        <div style={{ backgroundColor: '#ff4d4d', color: '#ffffff', padding: '1rem', marginTop: '1rem', whiteSpace: 'pre-wrap' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', color: '#cccccc' }}>
        {branchEnv} ({commitHashEnv?.substring(0, 6)})
      </div>
    </div>
  );
}
