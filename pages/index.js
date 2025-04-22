import { useEffect, useState } from 'react';
import SettingsInputs from './SettingsInputs';

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
  const [totalTokens, setTotalTokens] = useState(0);
  const [isLoading, setIsLoading] = useState(false); // New loading state

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

    let sha = null;

    // First try-catch block for GET request to check if file exists
    try {
      const getRes = await fetch(fileUrl, {
        headers: { Authorization: `token ${token}` },
      });

      if (getRes.ok) {
        const getData = await getRes.json();
        sha = getData.sha;
      } else if (getRes.status === 404) {
        console.log(`File ${filePath} does not exist, it will be created.`);
      } else {
        throw new Error(`Failed to fetch file details: ${getRes.status} ${getRes.statusText}`);
      }
    } catch (error) {
      console.error(`Error fetching file details for ${filePath}: ${error.message}`);
      return; // Exiting early as GET failed for unknown reason
    }

    // Second try-catch block for PUT request to commit file
    try {
      const headers = {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
      };

      const body = JSON.stringify({
        message: commitMessage,
        content: btoa(newContent),
        ...(sha ? { sha } : {}),
        branch: branch,
      });

      const res = await fetch(fileUrl, {
        method: 'PUT',
        headers: headers,
        body: body,
      });

      if (!res.ok) {
        throw new Error(`Failed to commit ${filePath}: ${res.status} ${res.statusText}`);
      } else {
        console.info(`File ${filePath} committed successfully.`);
      }
    } catch (error) {
      console.error(`Error committing file ${filePath}: ${error.message}`);
    }
  };

  const sendMessage = async () => {
    try {
      setError(null);
      setIsLoading(true); // Set loading to true at the start of the function
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
          messages: updatedHistory
        })
      });

      const initialData = await initialRes.json();
      if (!initialData.choices) {
        throw new Error(`OpenAI API returned an unexpected response:\n\n${JSON.stringify(initialData, null, 2)}`);
      }

      const message = initialData.choices[0].message;

      const tokenUsage = initialData.usage.total_tokens || 0;
      setTotalTokens((prev) => prev + tokenUsage);

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
          const finalTokenUsage = finalData.usage.total_tokens || 0;
          setTotalTokens((prev) => prev + finalTokenUsage);

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
    } finally {
      setIsLoading(false); // Set loading to false at the end of the function
    }
  };

  const branchEnv = process.env.NEXT_PUBLIC_BRANCH;
  const commitHashEnv = process.env.NEXT_PUBLIC_COMMIT_HASH;

  return (
    <div style={{ padding: '1rem', fontFamily: 'sans-serif', backgroundColor: '#121212', color: '#ffffff' }}>
      <div style={{ border: '1px solid #555555', backgroundColor: '#1e1e1e', padding: '1rem', marginTop: '1rem', height: '500px', overflowY: 'scroll' }}>
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
        style={{ width: '100%', marginTop: '1rem', backgroundColor: '#333333', color: '#ffffff', border: '1px solid #555555', marginBottom: '1rem' }}
      />

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
        {isLoading ? (
          <div style={{ color: '#ffffff', padding: '0.5rem 1rem' }}>Loading...</div>
        ) : (
          <button onClick={sendMessage} disabled={isLoading} style={{ marginTop: '0.5rem', backgroundColor: '#333333', color: '#ffffff', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer' }}>Send</button>
        )}
        <span style={{ marginLeft: '0.5rem', color: '#ffffff' }}>Tokens used: {totalTokens}</span>
      </div>

      {error && (
        <div style={{ backgroundColor: '#ff4d4d', color: '#ffffff', padding: '1rem', marginTop: '1rem', whiteSpace: 'pre-wrap' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <SettingsInputs 
        githubRepo={githubRepo}
        setGithubRepo={setGithubRepo}
        githubKey={githubKey}
        setGithubKey={setGithubKey}
        openaiKey={openaiKey}
        setOpenaiKey={setOpenaiKey}
        branch={branch}
        setBranch={setBranch}
      />
      <div style={{ marginTop: '2rem', padding: '1rem', color: '#cccccc' }}>
        {branchEnv} ({commitHashEnv?.substring(0, 6)})
      </div>
    </div>
  );
}
