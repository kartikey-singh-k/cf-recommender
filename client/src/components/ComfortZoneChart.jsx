import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, Tooltip
} from 'chart.js';
import { getComfortZone } from '../api/analytics.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export default function ComfortZoneChart() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getComfortZone().then(setData).catch(console.error);
  }, []);

  if (!data) return (
    <div style={cardStyle}>
      <h2 style={titleStyle}>Rating Distribution</h2>
      <p style={{ color: '#64748b', fontSize: '13px' }}>Loading...</p>
    </div>
  );

  const { distribution, comfortZoneRating, recommendationFloor, stretchRating } = data;

  const chartData = {
    labels: distribution.map(d => d.bucket),
    datasets: [{
      label: 'Problems Solved',
      data: distribution.map(d => d.solved),
      backgroundColor: distribution.map(d => {
        if (parseInt(d.bucket) === comfortZoneRating) return '#6366f1';
        if (parseInt(d.bucket) === recommendationFloor) return '#22c55e';
        return '#334155';
      }),
      borderRadius: 4,
    }]
  };

  return (
    <div style={cardStyle}>
      <h2 style={titleStyle}>Rating Distribution</h2>
      <p style={subStyle}>
        Comfort zone: {comfortZoneRating} | Target: {recommendationFloor}-{stretchRating}
      </p>
      <Bar data={chartData} options={{
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { color: '#64748b', font: { size: 10 } },
            grid: { color: '#1e293b' },
          },
          y: { ticks: { color: '#64748b' } }
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