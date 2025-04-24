import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsInputs from './SettingsInputs';
import { createBranch } from '../src/services/githubService';

// Mock the createBranch function
jest.mock('../src/services/githubService', () => ({
  createBranch: jest.fn(),
}));

describe('SettingsInputs Component', () => {
  it('renders input fields with correct placeholders', () => {
    render(<SettingsInputs 
      githubRepo="" 
      setGithubRepo={() => {}} 
      githubKey="" 
      setGithubKey={() => {}} 
      openaiKey="" 
      setOpenaiKey={() => {}} 
      branch="" 
      setBranch={() => {}} 
    />);

    expect(screen.getByPlaceholderText('GitHub Repo URL')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('GitHub API Key')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('OpenAI API Key')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Branch')).toBeInTheDocument();
  });

  it('allows input changes', () => {
    const setGithubRepo = jest.fn();
    const setGithubKey = jest.fn();
    const setOpenaiKey = jest.fn();
    const setBranch = jest.fn();

    render(<SettingsInputs 
      githubRepo="" 
      setGithubRepo={setGithubRepo} 
      githubKey="" 
      setGithubKey={setGithubKey} 
      openaiKey="" 
      setOpenaiKey={setOpenaiKey} 
      branch="" 
      setBranch={setBranch} 
    />);

    fireEvent.change(screen.getByPlaceholderText('GitHub Repo URL'), { target: { value: 'https://github.com' } });
    fireEvent.change(screen.getByPlaceholderText('GitHub API Key'), { target: { value: '123' } });
    fireEvent.change(screen.getByPlaceholderText('OpenAI API Key'), { target: { value: 'abc' } });
    fireEvent.change(screen.getByPlaceholderText('Branch'), { target: { value: 'main' } });

    expect(setGithubRepo).toHaveBeenCalledWith('https://github.com');
    expect(setGithubKey).toHaveBeenCalledWith('123');
    expect(setOpenaiKey).toHaveBeenCalledWith('abc');
    expect(setBranch).toHaveBeenCalledWith('main');
  });

  it('calls createBranch with correct arguments when button is clicked', async () => {
    const githubRepo = 'https://github.com/owner/repo';
    const githubKey = 'ghp_fakeToken123';
    const branch = 'new-feature-branch';
    
    render(<SettingsInputs 
      githubRepo={githubRepo} 
      setGithubRepo={() => {}} 
      githubKey={githubKey} 
      setGithubKey={() => {}} 
      openaiKey="" 
      setOpenaiKey={() => {}} 
      branch={branch} 
      setBranch={() => {}} 
    />);

    const createButton = screen.getByText('Create Branch');
    fireEvent.click(createButton);

    expect(createBranch).toHaveBeenCalledWith(githubRepo, branch, githubKey);
  });
});
