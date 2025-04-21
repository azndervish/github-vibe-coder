import { useState, useEffect, useRef } from 'react'; import { Input } from "@/components/ui/input"; import { Button } from "@/components/ui/button"; import { Card, CardContent } from "@/components/ui/card";

export default function Home() { const [githubRepo, setGithubRepo] = useState(''); const [githubKey, setGithubKey] = useState(''); const [openaiKey, setOpenaiKey] = useState(''); const [messages, setMessages] = useState([]); const [userInput, setUserInput] = useState(''); const chatEndRef = useRef(null);

const scrollToBottom = () => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };

useEffect(() => { scrollToBottom(); }, [messages]);

const handleSend = async () => { if (!userInput.trim()) return; const newMessages = [...messages, { role: 'user', content: userInput }]; setMessages(newMessages); setUserInput('');

const fileList = await fetchRepoFileList(githubRepo, githubKey);
const toolPrompt = `Repo file list:\n${fileList.join('\n')}\n\nUser prompt: ${userInput}`;

const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${openaiKey}`,
  },
  body: JSON.stringify({
    model: "gpt-4",
    messages: [
      { role: "system", content: "You are a coding assistant that can navigate and edit code repositories." },
      ...newMessages,
      { role: "user", content: toolPrompt },
    ],
    temperature: 0.2,
  }),
});

const data = await response.json();
const botMessage = data.choices[0].message;
setMessages([...newMessages, botMessage]);

};

const fetchRepoFileList = async (repoUrl, token) => { const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/'); const treeUrl = https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1; const res = await fetch(treeUrl, { headers: { Authorization: token ${token}, }, }); const data = await res.json(); return data.tree?.filter(item => item.type === 'blob').map(item => item.path) || []; };

return ( <div className="min-h-screen bg-gray-100 p-4 flex flex-col"> <Card className="mb-4 p-4"> <CardContent className="flex flex-col gap-2"> <Input placeholder="GitHub Repo URL" value={githubRepo} onChange={e => setGithubRepo(e.target.value)} /> <Input placeholder="GitHub API Key" type="password" value={githubKey} onChange={e => setGithubKey(e.target.value)} /> <Input placeholder="OpenAI API Key" type="password" value={openaiKey} onChange={e => setOpenaiKey(e.target.value)} /> </CardContent> </Card>

<div className="flex-1 overflow-y-auto space-y-2">
    {messages.map((msg, idx) => (
      <div key={idx} className={`p-2 rounded-xl max-w-[90%] ${msg.role === 'user' ? 'bg-blue-100 self-end' : 'bg-white self-start'}`}>
        <pre className="whitespace-pre-wrap text-sm">{msg.content}</pre>
      </div>
    ))}
    <div ref={chatEndRef} />
  </div>

  <div className="mt-4 flex gap-2">
    <Input
      placeholder="Type your prompt..."
      value={userInput}
      onChange={(e) => setUserInput(e.target.value)}
      className="flex-1"
      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
    />
    <Button onClick={handleSend}>Send</Button>
  </div>
</div>

); }

