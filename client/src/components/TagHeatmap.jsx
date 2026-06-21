import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, Tooltip, Legend
} from 'chart.js';
import { getTagStats } from '../api/analytics.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function TagHeatmap() {
  const [tags, setTags] = useState([]);

  useEffect(() => {
    getTagStats().then(d => setTags(d.tags)).catch(console.error);
  }, []);

  const weakest = tags.slice(0, 15);

  if (weakest.length === 0) return (
    <div style={cardStyle}>
      <h2 style={titleStyle}>Weakest Tags</h2>
      <p style={{ color: '#64748b', fontSize: '13px' }}>
        Sync your submissions to see tag analytics.
      </p>
    </div>
  );

  const data = {
    labels: weakest.map(t => t.tag),
    datasets: [{
      label: 'Success Rate %',
      data: weakest.map(t => Math.round(t.success_rate * 100)),
      backgroundColor: weakest.map(t => {
        const r = t.success_rate;
        if (r < 0.4) return '#ef4444';
        if (r < 0.7) return '#f59e0b';
        return '#22c55e';
      }),
      borderRadius: 4,
    }]
  };

  return (
    <div style={cardStyle}>
      <h2 style={titleStyle}>Weakest Tags</h2>
      <p style={subStyle}>Focus on red tags first</p>
      <Bar data={data} options={{
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: {
            min: 0, max: 100,
            ticks: { color: '#64748b' },
            grid: { color: '#1e293b' },
          },
          y: { ticks: { color: '#94a3b8', font: { size: 11 } } }
        }
      }} />
    </div>
  );
}

const cardStyle = {
  background: '#1e293b',
  borderRadius: '12px',
  padding: '1.25rem',
};
const titleStyle = {
  color: '#f1f5f9',
  fontSize: '16px',
  fontWeight: 700,
  margin: '0 0 4px',
};
const subStyle = {
  color: '#64748b',
  fontSize: '12px',
  margin: '0 0 1rem',
};