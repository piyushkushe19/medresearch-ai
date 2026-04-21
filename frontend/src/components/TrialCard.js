import React, { useState } from 'react';
export default function TrialCard({ trial, index }) {
  const [showEligibility, setShowEligibility] = useState(false);
  const statusClass = `status-${trial.status?.replace(/\s+/g, '_')}`;
  return (
    <div className="trial-card" style={{ animationDelay: `${index * 0.06}s` }}>
      <div className="trial-header">
        <div className="trial-title"><a href={trial.url} target="_blank" rel="noreferrer">{trial.title}</a></div>
        <span className={`status-badge ${statusClass} status-default`}>{trial.status?.replace(/_/g, ' ')}</span>
      </div>
      <div className="trial-meta">
        {trial.phase && trial.phase !== 'N/A' && <span className="trial-meta-item"><strong>Phase</strong> {trial.phase}</span>}
        {trial.sponsor && <span className="trial-meta-item"><strong>Sponsor</strong> {trial.sponsor.slice(0, 30)}</span>}
        {trial.startDate && <span className="trial-meta-item"><strong>Start</strong> {trial.startDate}</span>}
        {trial.eligibility?.minAge && <span className="trial-meta-item"><strong>Age</strong> {trial.eligibility.minAge}–{trial.eligibility.maxAge || 'N/A'}</span>}
        {trial.eligibility?.sex && trial.eligibility.sex !== 'All' && <span className="trial-meta-item"><strong>Sex</strong> {trial.eligibility.sex}</span>}
      </div>
      {trial.summary && <div className="trial-summary">{trial.summary.slice(0, 240)}{trial.summary.length > 240 ? '…' : ''}</div>}
      {trial.locations?.length > 0 && (
        <div>
          <div className="trial-section-label">Location</div>
          {trial.locations.slice(0, 2).map((loc, i) => (
            <div key={i} className="trial-location">
              📍 {[loc.facility, loc.city, loc.country].filter(Boolean).join(', ')}
            </div>
          ))}
        </div>
      )}
      {trial.eligibility?.criteria && (
        <div style={{ marginTop: 8 }}>
          <button className="expand-btn" onClick={() => setShowEligibility(!showEligibility)} style={{ marginBottom: 6 }}>
            {showEligibility ? '↑ Hide' : '↓ Eligibility'}
          </button>
          {showEligibility && <div className="trial-eligibility">{trial.eligibility.criteria.slice(0, 500)}</div>}
        </div>
      )}
      {(trial.contact?.email || trial.contact?.phone || trial.contact?.name) && (
        <div className="trial-contact" style={{ marginTop: 8 }}>
          <div className="trial-section-label">Contact</div>
          {trial.contact.name && <div>{trial.contact.name}</div>}
          {trial.contact.email && <div><a href={`mailto:${trial.contact.email}`}>{trial.contact.email}</a></div>}
          {trial.contact.phone && <div>{trial.contact.phone}</div>}
        </div>
      )}
      <div className="trial-footer">
        <span className="trial-nct">{trial.nctId}</span>
        <a href={trial.url} target="_blank" rel="noreferrer" className="link-btn">↗ ClinicalTrials.gov</a>
      </div>
    </div>
  );
}
