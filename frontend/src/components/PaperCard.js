import React, { useState } from 'react';
export default function PaperCard({ paper, index }) {
  const [expanded, setExpanded] = useState(false);
  const sourceClass = paper.source === 'PubMed' ? 'source-pubmed' : 'source-openalex';
  return (
    <div className="paper-card" style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="paper-header">
        <span className={`paper-source-badge ${sourceClass}`}>{paper.source}</span>
        {paper.isOpenAccess && <span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-green)', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', padding: '1px 6px', borderRadius: 4 }}>Open Access</span>}
      </div>
      <div className="paper-title"><a href={paper.url} target="_blank" rel="noreferrer">{paper.title}</a></div>
      <div className="paper-meta">
        {paper.authors?.length > 0 && <span className="paper-authors">{paper.authors.slice(0, 3).join(', ')}{paper.authors.length > 3 ? ' et al.' : ''}</span>}
        {paper.year > 0 && <span className="paper-year">{paper.year}</span>}
        {paper.journal && <span className="paper-journal">{paper.journal}</span>}
        {paper.citedBy > 0 && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{paper.citedBy} citations</span>}
      </div>
      {paper.abstract && <div className={`paper-abstract ${expanded ? 'expanded' : ''}`}>{paper.abstract}</div>}
      <div className="paper-footer">
        <div className="paper-tags">{paper.keywords?.slice(0, 4).map(kw => <span key={kw} className="paper-tag">{kw}</span>)}</div>
        <div className="paper-actions">
          <div className="relevance-bar">
            <span className="relevance-label">rel.</span>
            <div className="relevance-track"><div className="relevance-fill" style={{ width: `${paper.relevanceScore || 0}%` }} /></div>
          </div>
          {paper.abstract?.length > 200 && <button className="expand-btn" onClick={() => setExpanded(!expanded)}>{expanded ? '↑' : '↓'}</button>}
          <a href={paper.url} target="_blank" rel="noreferrer" className="link-btn">↗ View</a>
        </div>
      </div>
    </div>
  );
}
