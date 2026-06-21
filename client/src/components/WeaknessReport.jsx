import { useState, useEffect } from 'react';
import { getWeaknessReport } from '../api/ai.js';

export default function WeaknessReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWeaknessReport()
      .then(setReport)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.aiTag}>AI Analysis</div>
        <h2 style={styles.title}>Weakness Report</h2>
        {report?.cached && (
          <span style={styles.cached}>Cached</span>
        )}
        {report?.rateLimited && (
          <span style={styles.rateLimited}>Rate Limited</span>
        )}
      </div>

      {loading && (
        <p style={styles.loading}>Analyzing your submission history...</p>
      )}

      {!loading && report && (
        <>
          <p style={{
            ...styles.reportText,
            color: report.rateLimited ? '#f59e0b' : '#cbd5e1'
          }}>
            {report.text}
          </p>

          {!report.rateLimited && (
            <p style={styles.timestamp}>
              Generated: {new Date(report.generatedAt).toLocaleDateString()}
              {' '} — refreshes daily after new submissions
            </p>
          )}

          {report.rateLimited && (
            <p style={styles.retryHint}>
              Quota resets daily — try again tomorrow or create a new API key
            </p>
          )}
        </>
      )}

      {!loading && !report && (
        <p style={styles.loading}>No report available yet.</p>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: 'linear-gradient(135deg, #1e1b4b 0%, #1e293b 100%)',
    border: '1px solid #3730a3',
    borderRadius: '12px',
    padding: '1.25rem',
    marginBottom: '1.5rem',
    width: '100%',
    boxSizing: 'border-box',
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
    flexWrap: 'wrap',
  },
  aiTag: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '20px',
    background: '#4f46e5',
    color: '#fff',
  },
  title: {
    color: '#f1f5f9',
    fontSize: '15px',
    fontWeight: 700,
    margin: 0,
    flex: 1,
  },
  cached: {
    fontSize: '11px',
    color: '#64748b',
    padding: '2px 6px',
    border: '1px solid #334155',
    borderRadius: '4px',
  },
  rateLimited: {
    fontSize: '11px',
    color: '#f59e0b',
    padding: '2px 6px',
    border: '1px solid #854d0e',
    borderRadius: '4px',
  },
  loading: {
    color: '#64748b',
    fontSize: '13px',
    margin: 0,
    fontStyle: 'italic',
  },
  reportText: {
    fontSize: '14px',
    lineHeight: 1.7,
    margin: '0 0 8px',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    display: 'block',
    width: '100%',
  },
  timestamp: {
    color: '#475569',
    fontSize: '11px',
    margin: 0,
  },
  retryHint: {
    color: '#92400e',
    fontSize: '11px',
    margin: 0,
    fontStyle: 'italic',
  },
};