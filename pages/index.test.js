import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import Home from './index';

// Mock services
jest.mock('../src/services/githubService', () => ({
  fetchRepoFileList: jest.fn().mockResolvedValue(['file1.js', 'file2.js']),
  fetchFileContent: jest.fn().mockResolvedValue('file content'),
  commitAndPushFile: jest.fn(),
  deleteFile: jest.fn(),
  revertToPreviousCommit: jest.fn().mockResolvedValue('commit-hash')
}));

jest.mock('../src/services/openAIService', () => ({
  sendOpenAIMessage: jest.fn().mockResolvedValue({
    choices: [{ message: { content: 'AI response', function_call: null } }],
    usage: { total_tokens: 10 }
  })
}));

jest.mock('../src/prompts/systemPrompt', () => 'System prompt content');

// Test suite
describe('Home Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should render without crashing', async () => {
    await act(async () => {
      render(<Home />);
    });
    expect(screen.getByText(/tokens used: 0/i)).toBeInTheDocument();
  });

  it('should initialize state from localStorage', async () => {
    localStorage.setItem('githubRepo', 'mockRepo');
    localStorage.setItem('githubKey', 'mockKey');
    localStorage.setItem('openaiKey', 'mockOpenAIKey');
    localStorage.setItem('branch', 'mockBranch');

    await act(async () => {
      render(<Home />);
    });

    expect(screen.getByText(/tokens used: 0/i)).toBeInTheDocument();
  });

  it('should call sendMessage on Send button click', async () => {
    await act(async () => {
      render(<Home />);
    });
    const sendButton = screen.getByRole('button', { name: /send/i });

    await act(async () => {
      fireEvent.click(sendButton);
    });

    await waitFor(() => expect(screen.getByText(/ai response/i)).toBeInTheDocument());
    expect(screen.getByText(/tokens used: 10/i)).toBeInTheDocument();
  });

  it('should call onRevert when Revert button is clicked', async () => {
    await act(async () => {
      render(<Home />);
    });
    const revertButton = screen.getByRole('button', { name: /revert/i });

    await act(async () => {
      fireEvent.click(revertButton);
    });

    await waitFor(() => expect(screen.getByText(/reverted to commit: commit-hash/i)).toBeInTheDocument());
  });

  it('should display error when fetch calls fail', async () => {
    jest.mock('../src/services/githubService', () => ({
      fetchRepoFileList: jest.fn().mockRejectedValue(new Error('Network Error'))
    }));

    await act(async () => {
      render(<Home />);
    });

    const sendButton = screen.getByRole('button', { name: /send/i });

    await act(async () => {
      fireEvent.click(sendButton);
    });

    await waitFor(() => expect(screen.getByText(/error:/i)).toBeInTheDocument());
  });
});
