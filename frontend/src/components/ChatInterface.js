import React, { useState, useRef, useEffect } from 'react';
import { chatAPI } from '../services/api';

const SUGGESTIONS = [
  "Parkinson's disease deep brain stimulation",
  "lung cancer immunotherapy clinical trials",
  "Alzheimer's disease biomarkers diagnosis",
  "type 2 diabetes treatment outcomes",
  "breast cancer BRCA gene therapy",
  "multiple sclerosis latest research 2024",
];

const THINKING_STEPS = [
  { id: 'understand', label: 'Understanding query & extracting intent...' },
  { id: 'pubmed', label: 'Searching PubMed (up to 100 papers)...' },
  { id: 'openalex', label: 'Searching OpenAlex research database...' },
  { id: 'trials', label: 'Fetching ClinicalTrials.gov data...' },
  { id: 'rank', label: 'Ranking & deduplicating results...' },
  { id: 'llm', label: 'Generating AI-grounded insights...' },
];

export default function ChatInterface({ sessionId, messages, setMessages, isLoading, setIsLoading, onResult }) {
  const [input, setInput] = useState('');
  const [thinkingStep, setThinkingStep] = useState(0);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const thinkingIntervalRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const startThinkingAnimation = () => {
    setThinkingStep(0);
    let step = 0;
    thinkingIntervalRef.current = setInterval(() => {
      step = Math.min(step + 1, THINKING_STEPS.length - 1);
      setThinkingStep(step);
    }, 2800);
  };

  const stopThinkingAnimation = () => {
    if (thinkingIntervalRef.current) {
      clearInterval(thinkingIntervalRef.current);
      thinkingIntervalRef.current = null;
    }
  };

  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg, ts: Date.now() }]);
    setIsLoading(true);
    startThinkingAnimation();

    try {
      const response = await chatAPI.sendMessage(msg, sessionId);
      const result = response.data?.result;
      const meta = result?.metadata || {};

      stopThinkingAnimation();
      setIsLoading(false);

      const assistantMsg = {
        role: 'assistant',
        content: result?.aiSummary || 'Research complete. See results panel →',
        ts: Date.now(),
        meta: {
          papers: meta.finalPapers || 0,
          trials: meta.finalTrials || 0,
          model: meta.llmModel || 'unknown',
          rawPapers: meta.totalRawPapers || 0,
          timeMs: meta.totalTimeMs || 0,
        },
      };
      setMessages(prev => [...prev, assistantMsg]);
      onResult(result);
    } catch (err) {
      stopThinkingAnimation();
      setIsLoading(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err.message}. Please check that the backend server is running.`,
        ts: Date.now(),
        isError: true,
      }]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="chat-container">
      {!hasMessages ? (
        <div className="chat-welcome">
          <div className="welcome-hero">
            <div className="welcome-glow" />
            <h1 className="welcome-title">Medical Research<br/>Intelligence</h1>
            <p className="welcome-sub">
              Ask about any disease, treatment, or clinical trial. The system retrieves and reasons over hundreds of real research papers grounded in PubMed, OpenAlex, and ClinicalTrials.gov.
            </p>
          </div>
          <div className="welcome-pills">
            {SUGGESTIONS.map(s => (
              <button key={s} className="suggestion-pill" onClick={() => handleSend(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              <div className="msg-avatar">{m.role === 'user' ? 'YOU' : 'AI'}</div>
              <div>
                <div className={`msg-bubble ${m.isError ? 'error' : ''}`} style={m.isError ? { borderColor: 'rgba(248,113,113,0.3)', color: 'var(--accent-red)' } : {}}>
                  {m.content.length > 200
                    ? m.content.slice(0, 200) + '… (see AI Summary tab →)'
                    : m.content}
                </div>
                {m.meta && (
                  <div className="msg-meta">
                    <span className="msg-stat">📄 {m.meta.papers} papers</span>
                    <span className="msg-stat">🧪 {m.meta.trials} trials</span>
                    <span>from {m.meta.rawPapers} raw results</span>
                    <span>{(m.meta.timeMs / 1000).toFixed(1)}s</span>
                    <span>via {m.meta.model}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="message assistant">
              <div className="msg-avatar">AI</div>
              <div>
                <div className="thinking-indicator">
                  <div className="thinking-dots">
                    <span/><span/><span/>
                  </div>
                  <span>Researching...</span>
                </div>
                <div className="thinking-steps">
                  {THINKING_STEPS.map((step, i) => (
                    <div
                      key={step.id}
                      className={`thinking-step ${i < thinkingStep ? 'done' : i === thinkingStep ? 'active' : ''}`}
                    >
                      {step.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      <div className="chat-input-area">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about a disease, treatment, or clinical trial..."
            rows={1}
            disabled={isLoading}
          />
          <button className="send-button" onClick={() => handleSend()} disabled={!input.trim() || isLoading}>
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M2 8h12M8 2l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <p className="input-hint">Enter to send · Shift+Enter for new line · Results appear in right panel</p>
      </div>
    </div>
  );
}
