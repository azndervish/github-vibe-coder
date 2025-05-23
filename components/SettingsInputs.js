import React from 'react';
import { createBranch } from '../src/services/githubService';

export default function SettingsInputs({ 
  githubRepo, 
  setGithubRepo, 
  githubKey, 
  setGithubKey, 
  openaiKey, 
  setOpenaiKey, 
  branch, 
  setBranch, 
  onError, 
  onSuccess 
}) {
  
  const handleCreateBranch = async () => {
    if (githubRepo && githubKey && branch) {
      try {
        await createBranch(githubRepo, branch, githubKey);
        onSuccess(`Branch "${branch}" created successfully.`);
      } catch (error) {
        onError(`Failed to create branch: ${error.message}`);
      }
    } else {
      onError("Please fill in all the required fields: GitHub Repo URL, API Key, and Branch.");
    }
  };

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
      <button
        onClick={handleCreateBranch}
        style={{
          backgroundColor: '#333333',
          color: '#ffffff',
          border: 'none',
          width: '100%',
          padding: '0.5rem 1rem',
          marginTop: '16px',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Create Branch
      </button>
    </div>
  );
}
