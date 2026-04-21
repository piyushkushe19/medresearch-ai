import React from 'react';
export default function Sidebar({ messages, sessionContext }) {
  const userMessages = messages.filter(m => m.role === 'user');
  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-label">Session Context</div>
        {sessionContext?.disease ? (
          <div className="sidebar-context-card">
            <div className="context-disease">{sessionContext.disease}</div>
            <div className="context-intent">{sessionContext.intent || 'general'} intent</div>
          </div>
        ) : (
          <div className="sidebar-empty">No active context</div>
        )}
      </div>
      <div className="sidebar-divider" />
      <div className="sidebar-section">
        <div className="sidebar-label">History ({userMessages.length})</div>
      </div>
      <div className="sidebar-history">
        {userMessages.length === 0 ? (
          <div className="sidebar-empty">Queries appear here as you research</div>
        ) : (
          userMessages.map((m, i) => (
            <div key={i} className="history-item">
              <div className="history-role">Query {i + 1}</div>
              <div className="history-msg">{m.content}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
