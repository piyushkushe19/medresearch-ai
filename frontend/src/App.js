import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ChatInterface from './components/ChatInterface';
import ResultsPanel from './components/ResultsPanel';
import Sidebar from './components/Sidebar';
import './App.css';

function App() {
  const [sessionId] = useState(() => uuidv4());
  const [messages, setMessages] = useState([]);
  const [currentResult, setCurrentResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('papers');
  const [sessionContext, setSessionContext] = useState(null);

  const handleNewResult = useCallback((result) => {
    setCurrentResult(result);
    if (result?.query) {
      const disease = typeof result.query.disease === 'string' ? result.query.disease : '';
      setSessionContext({ disease, intent: result.query.intent });
    }
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-icon">
            <svg viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M16 8v8l5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="16" cy="16" r="2" fill="currentColor"/>
              <path d="M10 6l1.5 2M22 6l-1.5 2M26 16h2M4 16h2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-name">MedResearch</span>
            <span className="brand-tag">AI Research System</span>
          </div>
        </div>
        <div className="header-meta">
          {sessionContext?.disease && (
            <div className="context-chip">
              <span className="context-dot"/>
              <span>{sessionContext.disease}</span>
            </div>
          )}
          <div className="header-badges">
            <span className="badge">PubMed</span>
            <span className="badge">OpenAlex</span>
            <span className="badge">ClinicalTrials</span>
          </div>
        </div>
      </header>
      <main className="app-body">
        <Sidebar messages={messages} sessionContext={sessionContext} />
        <div className="center-column">
          <ChatInterface
            sessionId={sessionId}
            messages={messages}
            setMessages={setMessages}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            onResult={handleNewResult}
          />
        </div>
        <ResultsPanel
          result={currentResult}
          isLoading={isLoading}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </main>
    </div>
  );
}
export default App;
