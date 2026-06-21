import { useState } from 'react';
import { getPracticePlan } from '../api/ai.js';

export default function PracticePlan() {
  const [goal, setGoal] = useState('');
  const [weeks, setWeeks] = useState(3);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGenerate() {
    if (!goal.trim()) return;
    setLoading(true);
    setError('');
    setPlan(null);

    try {
      const result = await getPracticePlan(goal, weeks);
      setPlan(result);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate plan');
    } finally {
      setLoading(false);
    }
  }

  const parsed = plan?.parsed;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.aiTag}>AI Powered</div>
        <h2 style={styles.title}>Practice Plan Generator</h2>
      </div>

      <div style={styles.inputRow}>
        <input
          type="text"
          placeholder="e.g. prepare for DE Shaw in 3 weeks"
          value={goal}
          onChange={e => setGoal(e.target.value)}
          style={styles.input}
        />
        <select
          value={weeks}
          onChange={e => setWeeks(parseInt(e.target.value))}
          style={styles.select}
        >
          {[1,2,3,4,6,8].map(w => (
            <option key={w} value={w}>{w} week{w > 1 ? 's' : ''}</option>
          ))}
        </select>
        <button
          onClick={handleGenerate}
          disabled={loading || !goal.trim()}
          style={styles.btn}
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      {parsed && (
        <div style={styles.plan}>
          <p style={styles.planGoal}>Plan: {parsed.goal}</p>

          {parsed.weeklyPlan?.map(week => (
            <div key={week.week} style={styles.weekCard}>
              <div style={styles.weekHeader}>
                <span style={styles.weekNum}>Week {week.week}</span>
                <span style={styles.weekFocus}>{week.focus}</span>
              </div>
              <div style={styles.topics}>
                {week.topics?.map(t => (
                  <span key={t} style={styles.topicTag}>{t}</span>
                ))}
              </div>
              <p style={styles.daily}>Daily: {week.dailyTarget}</p>
              <p style={styles.milestone}>Goal: {week.milestone}</p>
            </div>
          ))}

          {parsed.generalTips && (
            <div style={styles.tips}>
              <p style={styles.tipsTitle}>General Tips</p>
              {parsed.generalTips.map((tip, i) => (
                <p key={i} style={styles.tip}>{tip}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {plan && !parsed && (
        <p style={styles.rawText}>{plan.text}</p>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: '#1e293b',
    borderRadius: '12px',
    padding: '1.25rem',
    marginBottom: '1.5rem',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '1rem',
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
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '1rem',
  },
  input: {
    flex: 1,
    minWidth: '200px',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #334155',
    background: '#0f172a',
    color: '#f1f5f9',
    fontSize: '13px',
    outline: 'none',
  },
  select: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #334155',
    background: '#0f172a',
    color: '#f1f5f9',
    fontSize: '13px',
    cursor: 'pointer',
  },
  btn: {
    padding: '8px 18px',
    borderRadius: '8px',
    border: 'none',
    background: '#6366f1',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: {
    color: '#f87171',
    fontSize: '13px',
    margin: '0 0 1rem',
  },
  plan: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  planGoal: {
    color: '#94a3b8',
    fontSize: '13px',
    margin: 0,
    fontStyle: 'italic',
  },
  weekCard: {
    background: '#0f172a',
    borderRadius: '8px',
    padding: '12px',
    borderLeft: '3px solid #6366f1',
  },
  weekHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
  },
  weekNum: {
    color: '#6366f1',
    fontWeight: 700,
    fontSize: '13px',
  },
  weekFocus: {
    color: '#f1f5f9',
    fontSize: '13px',
    fontWeight: 500,
  },
  topics: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '5px',
    marginBottom: '8px',
  },
  topicTag: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '20px',
    background: '#1e293b',
    color: '#94a3b8',
    border: '1px solid #334155',
  },
  daily: {
    color: '#64748b',
    fontSize: '12px',
    margin: '0 0 4px',
  },
  milestone: {
    color: '#22c55e',
    fontSize: '12px',
    margin: 0,
  },
  tips: {
    background: '#0f172a',
    borderRadius: '8px',
    padding: '12px',
  },
  tipsTitle: {
    color: '#94a3b8',
    fontSize: '12px',
    fontWeight: 600,
    margin: '0 0 8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tip: {
    color: '#64748b',
    fontSize: '12px',
    margin: '0 0 4px',
    lineHeight: 1.5,
  },
  rawText: {
    color: '#cbd5e1',
    fontSize: '14px',
    lineHeight: 1.7,
    margin: 0,
  },
};