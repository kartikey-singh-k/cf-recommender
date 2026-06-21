export default function OverviewCards({ data }) {
  if (!data) return (
    <div style={styles.grid}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={styles.skeleton} />
      ))}
    </div>
  );

  const cards = [
    { label: 'Problems Solved', value: data.problems_solved || 0 },
    { label: 'Attempted', value: data.problems_attempted || 0 },
    { label: 'Submissions', value: data.total_submissions || 0 },
    { label: 'Success Rate', value: `${data.overall_success_rate || 0}%` },
    { label: 'Hardest Solved', value: data.hardest_solved || 'N/A' },
  ];

  return (
    <div style={styles.grid}>
      {cards.map(card => (
        <div key={card.label} style={styles.card}>
          <p style={styles.value}>{card.value}</p>
          <p style={styles.label}>{card.label}</p>
        </div>
      ))}
    </div>
  );
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '10px',
    marginBottom: '1.5rem',
  },
  card: {
    background: '#1e293b',
    borderRadius: '12px',
    padding: '1rem',
    textAlign: 'center',
  },
  skeleton: {
    background: '#1e293b',
    borderRadius: '12px',
    height: '80px',
    animation: 'pulse 1.5s infinite',
  },
  value: {
    color: '#6366f1',
    fontSize: '24px',
    fontWeight: 700,
    margin: '0 0 4px',
  },
  label: {
    color: '#64748b',
    fontSize: '12px',
    margin: 0,
  },
};