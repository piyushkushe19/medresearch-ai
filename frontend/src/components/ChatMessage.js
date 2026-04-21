import React from 'react';

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const meta = message.meta;

  return (
    <div className={`message ${message.role}`}>
      <div className="msg-avatar">{isUser ? 'YOU' : 'AI'}</div>
      <div>
        <div className={`msg-bubble ${message.isError ? 'error' : ''}`}
          style={message.isError ? { borderColor: 'rgba(248,113,113,0.3)', color: 'var(--accent-red)' } : {}}>
          {message.content?.length > 220
            ? message.content.slice(0, 220) + '… (see AI Summary tab →)'
            : message.content}
        </div>
        {meta && (
          <div className="msg-meta">
            <span className="msg-stat">📄 {meta.papers} papers</span>
            <span className="msg-stat">🧪 {meta.trials} trials</span>
            {meta.rawPapers > 0 && <span>from {meta.rawPapers} raw</span>}
            {meta.timeMs > 0 && <span>{(meta.timeMs / 1000).toFixed(1)}s</span>}
            {meta.model && <span>via {meta.model}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
