import React from 'react';
import { useEffect, useState } from 'react';
import SettingsInputs from '../components/SettingsInputs'; // Updated import path
import {
  fetchRepoFileList,
  fetchFileContent,
  commitAndPushFile,
  deleteFile,  // Import the deleteFile function
  revertToPreviousCommit
} from '../src/services/githubService';
import { sendOpenAIMessage } from '../src/services/openAIService';
import MessageInput from '../components/MessageInput';  // Import MessageInput Component
import { systemPrompt } from '../src/prompts/systemPrompt'; // Import system prompt


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
  const [isLoading, setIsLoading] = useState(false);
  const [lastOpenAIResponse, setLastOpenAIResponse] = useState(''); // New state for last OpenAI response

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

  const sendMessage = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const userMsg = { role: 'user', content: input };
      setMessages(prev => [...prev, userMsg]);
      setInput('');

      let updatedHistory = [...chatHistory, userMsg];

      if (isFirstSend) {
        const fileList = await fetchRepoFileList(githubRepo, githubKey, branch);
        const fileListPrompt = `Here's all the files in the repository:\n${fileList.join('\n')}`;
        const systemPromptMessage = { role: 'system', content: systemPrompt };
        updatedHistory = [systemPromptMessage, { role: 'user', content: fileListPrompt }, userMsg];
        setMessages(prev => [...prev, { role: 'system', content: fileListPrompt }]);
        setIsFirstSend(false);
      }

      let data;
      do {
        data = await sendOpenAIMessage(openaiKey, updatedHistory, "gpt-4o-2024-08-06");
        const message = data.choices[0].message;
        setLastOpenAIResponse(JSON.stringify(data, null, 2));

        const tokenUsage = data.usage.total_tokens || 0;
        setTotalTokens(prev => prev + tokenUsage);

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
            const fileContent = await fetchFileContent(githubRepo, functionArgs.file_path, githubKey, branch);
            const functionMsg = {
              role: 'function',
              name: functionName,
              content: fileContent
            };
            updatedHistory.push(message, functionMsg);
          } else if (functionName === 'commit_file') {
            await commitAndPushFile(
              githubRepo,
              functionArgs.file_path,
              functionArgs.new_content,
              functionArgs.commit_message,
              githubKey,
              branch
            );
            const functionMsg = {
              role: 'function',
              name: functionName,
              content: 'File committed successfully.'
            };
            setMessages(prev => [...prev, { role: 'assistant', content: 'File committed successfully.' }]);
            updatedHistory.push(message, functionMsg);
          } else if (functionName === 'delete_file') {
            await deleteFile(
              githubRepo,
              functionArgs.file_path,
              functionArgs.commit_message,
              githubKey,
              branch
            );
            const functionMsg = {
              role: 'function',
              name: functionName,
              content: 'File deleted successfully.'
            };
            setMessages(prev => [...prev, { role: 'assistant', content: 'File deleted successfully.' }]);
            updatedHistory.push(message, functionMsg);
          }

        } else {
          const reply = message.content;
          setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
          setChatHistory(updatedHistory.concat({ role: 'assistant', content: reply }));
          break;
        }
      } while (data.choices[0].message.function_call);
    } catch (err) {
      const message = err instanceof Error
        ? `${err.message}\n\n${err.stack}`
        : JSON.stringify(err, null, 2);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevert = async () => {
    setIsLoading(true);
    try {
      const previousCommitHash = await revertToPreviousCommit(githubRepo, githubKey, branch);
      setMessages(prev => [...prev, { role: 'system', content: `Reverted to commit: ${previousCommitHash}` }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'system', content: `Error during revert: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const canRevert = branch !== 'main'; // You might need to adjust this based on actual logic

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

      <MessageInput
        input={input}
        setInput={setInput}
        sendMessage={sendMessage}
        isLoading={isLoading}
        onRevert={handleRevert}
        canRevert={canRevert}
      />

      <div style={{ marginTop: '0.5rem', color: '#ffffff' }}>
        Tokens used: {totalTokens}
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

      <div style={{ backgroundColor: '#2e2e2e', padding: '1rem', marginTop: '1rem', borderRadius: '0.5rem' }}>
        <strong>Last OpenAI Response:</strong>
        <pre style={{ whiteSpace: 'pre-wrap', color: '#ffffff', maxHeight: '200px', overflowY: 'auto' }}>{lastOpenAIResponse}</pre>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', color: '#cccccc' }}>
        {branchEnv} ({commitHashEnv?.substring(0, 6)})
      </div>
    </div>
  );
}
