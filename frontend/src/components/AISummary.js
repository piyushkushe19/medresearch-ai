import React from 'react';

function parseSection(text, heading) {
  const regex = new RegExp(`##\\s*${heading}([\\s\\S]*?)(?=##|$)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

const SECTIONS = [
  { id: 'overview', heading: 'CONDITION OVERVIEW', label: 'Condition Overview' },
  { id: 'findings', heading: 'KEY RESEARCH FINDINGS', label: 'Key Research Findings' },
  { id: 'trials', heading: 'CLINICAL TRIAL INSIGHTS', label: 'Clinical Trial Insights' },
  { id: 'analysis', heading: 'AI REASONED ANALYSIS', label: 'AI Reasoned Analysis' },
];

export default function AISummary({ result }) {
  const summaryText = result?.aiSummary || '';
  const meta = result?.metadata || {};

  return (
    <div className="summary-content">
      <div className="llm-badge">
        <span className={`llm-badge-dot ${meta.usedLLM ? 'llm-active' : 'llm-fallback'}`} />
        {meta.usedLLM ? `LLM: ${meta.llmModel}` : 'Structured fallback (Ollama offline)'}
      </div>

      {SECTIONS.map(section => {
        const content = parseSection(summaryText, section.heading);
        if (!content) return null;
        return (
          <div key={section.id} className="summary-section">
            <div className="summary-section-head">{section.label}</div>
            <div className="summary-text">
              {content.split('\n').map((line, i) => {
                if (line.startsWith('- ') || line.startsWith('• ')) {
                  return <div key={i} style={{ paddingLeft: 12, marginBottom: 4 }}>{line}</div>;
                }
                if (line.startsWith('[PAPER') || line.startsWith('[TRIAL')) {
                  return <div key={i} style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', marginBottom: 2 }}>{line}</div>;
                }
                return line ? <div key={i} style={{ marginBottom: 6 }}>{line}</div> : <div key={i} style={{ height: 4 }} />;
              })}
            </div>
          </div>
        );
      })}

      {/* Fallback: render full text if no sections parsed */}
      {!SECTIONS.some(s => parseSection(summaryText, s.heading)) && (
        <div className="summary-section">
          <div className="summary-text">{summaryText}</div>
        </div>
      )}

      <div className="disclaimer-box">
        ⚠️ This analysis is generated from retrieved research literature for informational purposes only.
        It does not constitute medical advice. Always consult a qualified healthcare provider.
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="summary-section-head">Sources</div>
        {result?.papers?.slice(0, 8).map((p, i) => (
          <div key={i} style={{ marginBottom: 8, fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: 'var(--accent-cyan)' }}>[{i + 1}]</span>{' '}
            <a href={p.url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              {p.title?.slice(0, 70)}{p.title?.length > 70 ? '…' : ''}
            </a>
            <span style={{ color: 'var(--text-muted)' }}> — {p.authors?.[0] || 'Unknown'}, {p.year} · {p.source}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
