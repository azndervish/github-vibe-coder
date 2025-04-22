import { useEffect, useState } from 'react';

const functions = [ { name: "get_file_content", description: "Retrieve the content of a specific file from a GitHub repository.", parameters: { type: "object", properties: { file_path: { type: "string", description: "The path to the file within the repository (e.g., 'src/app.js')." } }, required: ["file_path"] } }, { name: "commit_file_update", description: "Commit new content to an existing file in a GitHub repository.", parameters: { type: "object", properties: { file_path: { type: "string", description: "The path to the file in the repository." }, new_content: { type: "string", description: "The new content to commit to the file." }, commit_message: { type: "string", description: "The commit message to use." } }, required: ["file_path", "new_content", "commit_message"] } } ];

export default function Home() { const [githubRepo, setGithubRepo] = useState(''); const [githubKey, setGithubKey] = useState(''); const [openaiKey, setOpenaiKey] = useState(''); const [input, setInput] = useState(''); const [messages, setMessages] = useState([]); const [error, setError] = useState(null); const [chatHistory, setChatHistory] = useState([]); const [isFirstSend, setIsFirstSend] = useState(true);

useEffect(() => { const storedRepo = localStorage.getItem('githubRepo'); const storedGitHubKey = localStorage.getItem('githubKey'); const storedOpenAIKey = localStorage.getItem('openaiKey');

if (storedRepo) setGithubRepo(storedRepo);
if (storedGitHubKey) setGithubKey(storedGitHubKey);
if (storedOpenAIKey) setOpenaiKey(storedOpenAIKey);

}, []);

useEffect(() => { localStorage.setItem('githubRepo', githubRepo); localStorage.setItem('githubKey', githubKey); localStorage.setItem('openaiKey', openaiKey); }, [githubRepo, githubKey, openaiKey]);

const fetchRepoFileList = async (repoUrl, token) => { const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/'); const treeUrl = https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1; const res = await fetch(treeUrl, { headers: { Authorization: token ${token} }, }); const data = await res.json(); return data.tree?.filter(item => item.type === 'blob').map(item => item.path) || []; };

const fetchFileContent = async (repoUrl, filePath, token) => { const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/'); const fileUrl = https://api.github.com/repos/${owner}/${repo}/contents/${filePath}; const res = await fetch(fileUrl, { headers: { Authorization: token ${token} }, });

if (!res.ok) throw new Error(`Error reading ${filePath}: ${res.status} ${res.statusText}`);

const data = await res.json();
if (data.encoding === 'base64') {
  return atob(data.content);
} else {
  return data.content;
}

};

const commitAndPushFile = async (repoUrl, filePath, newContent, commitMessage, token) => { const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/'); const fileUrl = https://api.github.com/repos/${owner}/${repo}/contents/${filePath};

const getRes = await fetch(fileUrl, {
  headers: { Authorization: `token ${token}` },
});
const getData = await getRes.json();
const sha = getData.sha;

const putRes = await fetch(fileUrl, {
  method: 'PUT',
  headers: {
    Authorization: `token ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: commitMessage,
    content: btoa(newContent),
    sha
  })
});
const putData = await putRes.json();
return JSON.stringify(putData, null, 2);

};

const sendMessage = async () => { try { setError(null); const userMsg = { role: 'user', content: input }; setMessages(prev => [...prev, userMsg]); setInput('');

const fileList = await fetchRepoFileList(githubRepo, githubKey);
  const fileListPrompt = `Here's all the files in the repository:\n${fileList.join('\n')}`;
  const modelId = "gpt-4o-2024-08-06";

  let updatedChatHistory = [...chatHistory];

  if (isFirstSend) {
    updatedChatHistory = [
      { role: 'system', content: 'You are a helpful coding assistant.' },
      { role: 'user', content: fileListPrompt }
    ];
    setMessages(prev => [
      ...prev,
      { role: 'system', content: `\u{1F552} ${new Date().toLocaleTimeString()} | Repository File List:\n${fileList.join('\n')}` }
    ]);
    setIsFirstSend(false);
  }

  updatedChatHistory.push(userMsg);

  const initialRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelId,
      messages: updatedChatHistory,
      functions
    })
  });

  const initialData = await initialRes.json();
  if (!initialData.choices) {
    throw new Error(`OpenAI API returned an unexpected response:\n\n${JSON.stringify(initialData, null, 2)}`);
  }

  const message = initialData.choices[0].message;

  if (message.function_call) {
    const functionName = message.function_call.name;
    const functionArgs = JSON.parse(message.function_call.arguments);

    const cleanArgs = { ...functionArgs };
    if (functionName === 'commit_file_update') {
      delete cleanArgs.new_content;
    }

    setMessages(prev => [
      ...prev,
      {
        role: 'system',
        content: `\u{1F552} ${new Date().toLocaleTimeString()} | Calling function: ${functionName}\nArguments:\n${JSON.stringify(cleanArgs, null, 2)}`
      }
    ]);

    updatedChatHistory.push(message);

    if (functionName === 'get_file_content') {
      const fileContent = await fetchFileContent(githubRepo, functionArgs.file_path, githubKey);
      const functionResult = {
        role: 'function',
        name: functionName,
        content: fileContent
      };
      updatedChatHistory.push(functionResult);

      const finalRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          messages: updatedChatHistory
        })
      });

      const finalData = await finalRes.json();
      const reply = finalData.choices[0].message.content;
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      updatedChatHistory.push({ role: 'assistant', content: reply });
    } else if (functionName === 'commit_file_update') {
      const result = await commitAndPushFile(
        githubRepo,
        functionArgs.file_path,
        functionArgs.new_content,
        functionArgs.commit_message,
        githubKey
      );

      const functionResult = {
        role: 'function',
        name: functionName,
        content: result
      };
      updatedChatHistory.push(functionResult);

      const finalRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          messages: updatedChatHistory
        })
      });

      const finalData = await finalRes.json();
      const reply = finalData.choices?.[0]?.message?.content || 'Committed successfully.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      updatedChatHistory.push({ role: 'assistant', content: reply });
    }
  } else {
    const reply = message.content;
    setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    updatedChatHistory.push({ role: 'assistant', content: reply });
  }

  setChatHistory(updatedChatHistory);
} catch (err) {
  const message = err instanceof Error ? `${err.message}\n\n${err.stack}` : JSON.stringify(err, null, 2);
  setError(message);
}

};

return ( <div style={{ padding: '1rem', fontFamily: 'sans-serif' }}> <h1 style={{ fontWeight: 'bold' }}>Vibe Code Assistant</h1> <input placeholder="GitHub Repo URL" value={githubRepo} onChange={e => setGithubRepo(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: '8px' }} /> <input placeholder="GitHub API Key" type="password" value={githubKey} onChange={e => setGithubKey(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: '8px' }} /> <input placeholder="OpenAI API Key" type="password" value={openaiKey} onChange={e => setOpenaiKey(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: '8px' }} /> <div style={{ border: '1px solid #ccc', padding: '1rem', marginTop: '1rem', height: '300px', overflowY: 'scroll' }}> {messages.map((m, i) => ( <div key={i} style={{ marginBottom: '1rem' }}> <strong>{m.role}:</strong> <pre style={{ whiteSpace: 'pre-wrap' }}>{m.content}</pre> </div> ))} </div> <textarea rows={3} value={input} onChange={e => setInput(e.target.value)} style={{ width: '100%', marginTop: '1rem' }} /> <button onClick={sendMessage} style={{ marginTop: '0.5rem' }}>Send</button> {error && ( <div style={{ backgroundColor: '#fee', color: '#900', padding: '1rem', marginTop: '1rem', whiteSpace: 'pre-wrap' }}> <strong>Error:</strong> {error} </div> )} </div> ); }

