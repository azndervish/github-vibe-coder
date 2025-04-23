import React from 'react';

export default function MessageInput({
  input,
  setInput,
  sendMessage,
  isLoading,
  onRevert,
  canRevert
}) {
  return (
    <div>
      <textarea
        rows={3}
        value={input}
        onChange={e => setInput(e.target.value)}
        style={{
          width: '100%',
          marginTop: '1rem',
          backgroundColor: '#333333',
          color: '#ffffff',
          border: '1px solid #555555',
          marginBottom: '1rem'
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <button
          onClick={onRevert}
          disabled={isLoading || !canRevert}
          style={{
            backgroundColor: '#333333',
            color: '#ffffff',
            border: 'none',
            padding: '0.5rem 1rem',
            cursor: isLoading || !canRevert ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Loading...' : 'Revert'}
        </button>

        <button
          onClick={sendMessage}
          disabled={isLoading}
          style={{
            backgroundColor: '#333333',
            color: '#ffffff',
            border: 'none',
            padding: '0.5rem 1rem',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
