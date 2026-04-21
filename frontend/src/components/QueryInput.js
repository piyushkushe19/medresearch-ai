import React, { useState, useRef, useCallback } from 'react';

const SUGGESTED_QUERIES = [
  'NSCLC immunotherapy recent trials',
  "Alzheimer's biomarkers blood diagnosis 2024",
  'deep brain stimulation Parkinson outcomes',
  'BRCA2 breast cancer targeted therapy',
  'Type 2 diabetes GLP-1 receptor agonists',
  'COVID-19 long COVID neurological mechanisms',
];

export default function QueryInput({ onSubmit, disabled }) {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = useCallback(() => {
    const q = value.trim();
    if (!q || disabled) return;
    onSubmit(q);
    setValue('');
  }, [value, disabled, onSubmit]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestion = (q) => {
    if (disabled) return;
    onSubmit(q);
  };

  return (
    <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
      {value === '' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {SUGGESTED_QUERIES.slice(0, 4).map(q => (
            <button
              key={q}
              onClick={() => handleSuggestion(q)}
              disabled={disabled}
              style={{
                padding: '3px 10px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                transition: 'all 0.15s',
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}
      <div className="input-wrapper">
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about a disease, treatment, or clinical trial..."
          rows={1}
          disabled={disabled}
        />
        <button className="send-button" onClick={handleSubmit} disabled={!value.trim() || disabled}>
          <svg viewBox="0 0 16 16" fill="none">
            <path d="M2 8h12M8 2l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
