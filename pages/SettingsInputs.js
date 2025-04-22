import React from 'react';

export default function SettingsInputs({ 
  githubRepo, 
  setGithubRepo, 
  githubKey, 
  setGithubKey, 
  openaiKey, 
  setOpenaiKey, 
  branch, 
  setBranch 
}) {
  return (
    <div>
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
    </div>
  );
}
