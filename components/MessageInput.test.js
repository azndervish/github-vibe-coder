import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import MessageInput from './MessageInput';

// Mock functions
describe('MessageInput Component', () => {
  const mockSetInput = jest.fn();
  const mockSendMessage = jest.fn();
  const mockOnRevert = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with initial props', () => {
    render(
      <MessageInput
        input=""
        setInput={mockSetInput}
        sendMessage={mockSendMessage}
        isLoading={false}
        onRevert={mockOnRevert}
        canRevert={true}
      />
    );

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /revert/i })).toBeInTheDocument();
  });

  it('should change input value', () => {
    render(
      <MessageInput
        input=""
        setInput={mockSetInput}
        sendMessage={mockSendMessage}
        isLoading={false}
        onRevert={mockOnRevert}
        canRevert={true}
      />
    );

    const inputElement = screen.getByRole('textbox');
    fireEvent.change(inputElement, { target: { value: 'Test message' } });
    expect(mockSetInput).toHaveBeenCalledWith('Test message');
  });

  it('should call sendMessage on Send button click', () => {
    render(
      <MessageInput
        input=""
        setInput={mockSetInput}
        sendMessage={mockSendMessage}
        isLoading={false}
        onRevert={mockOnRevert}
        canRevert={true}
      />
    );

    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);
    expect(mockSendMessage).toHaveBeenCalled();
  });

  it('should call onRevert on Revert button click', () => {
    render(
      <MessageInput
        input=""
        setInput={mockSetInput}
        sendMessage={mockSendMessage}
        isLoading={false}
        onRevert={mockOnRevert}
        canRevert={true}
      />
    );

    const revertButton = screen.getByRole('button', { name: /revert/i });
    fireEvent.click(revertButton);
    expect(mockOnRevert).toHaveBeenCalled();
  });

  it('should disable buttons based on isLoading and canRevert', () => {
    render(
      <MessageInput
        input=""
        setInput={mockSetInput}
        sendMessage={mockSendMessage}
        isLoading={true}
        onRevert={mockOnRevert}
        canRevert={false}
      />
    );

    const sendButton = screen.getByRole('button', { name: /send/i });
    const revertButton = screen.getByRole('button', { name: /revert/i });

    expect(sendButton).toBeDisabled();
    expect(revertButton).toBeDisabled();
  });
});