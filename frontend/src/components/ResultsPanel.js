import React, { useState } from 'react';
import PaperCard from './PaperCard';
import TrialCard from './TrialCard';
import AISummary from './AISummary';

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-line w-3/4" style={{ height: 12 }} />
      <div className="skeleton skeleton-line w-full" style={{ height: 9 }} />
      <div className="skeleton skeleton-line w-full" style={{ height: 9 }} />
      <div className="skeleton skeleton-line w-1/2" style={{ height: 9 }} />
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <div className="skeleton skeleton-line" style={{ width: 48, height: 18, borderRadius: 10 }} />
        <div className="skeleton skeleton-line" style={{ width: 60, height: 18, borderRadius: 10 }} />
      </div>
    </div>
  );
}

export default function ResultsPanel({ result, isLoading, activeTab, setActiveTab }) {
  const papers = result?.papers || [];
  const trials = result?.trials || [];
  const meta = result?.metadata || {};

  const tabs = [
    { id: 'summary', label: 'AI Summary', count: null },
    { id: 'papers', label: 'Papers', count: papers.length },
    { id: 'trials', label: 'Trials', count: trials.length },
  ];

  return (
    <div className="results-panel">
      <div className="panel-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`panel-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.count !== null && (
              <span className="tab-count">{isLoading ? '…' : tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {result && !isLoading && (
        <div className="meta-bar">
          <div className="meta-item">Scanned <strong>{meta.totalRawPapers || 0}</strong> raw papers</div>
          <div className="meta-item">Model <strong>{meta.llmModel || 'N/A'}</strong></div>
          <div className="meta-item"><strong>{((meta.totalTimeMs || 0) / 1000).toFixed(1)}s</strong> total</div>
          <div className="meta-item">Intent <strong>{result.query?.intent || 'N/A'}</strong></div>
        </div>
      )}

      <div className="panel-content">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : !result ? (
          <div className="panel-empty">
            <svg className="empty-icon" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M16 24h16M24 16v16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p className="empty-title">No results yet</p>
            <p className="empty-sub">Ask a medical research question to see papers, trials, and AI insights here.</p>
          </div>
        ) : (
          <>
            {activeTab === 'papers' && (
              papers.length === 0 ? (
                <div className="panel-empty">
                  <p className="empty-title">No papers found</p>
                  <p className="empty-sub">Try broadening your query or checking API connectivity.</p>
                </div>
              ) : (
                papers.map((paper, i) => (
                  <PaperCard key={paper.id || i} paper={paper} index={i} />
                ))
              )
            )}
            {activeTab === 'trials' && (
              trials.length === 0 ? (
                <div className="panel-empty">
                  <p className="empty-title">No trials found</p>
                  <p className="empty-sub">No matching clinical trials at this time. Try a different condition or location.</p>
                </div>
              ) : (
                trials.map((trial, i) => (
                  <TrialCard key={trial.id || i} trial={trial} index={i} />
                ))
              )
            )}
            {activeTab === 'summary' && (
              <AISummary result={result} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
