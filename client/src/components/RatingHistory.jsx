import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
} from 'chart.js';
import api from '../api/client.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export default function RatingHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/user/rating-history')
      .then(r => setHistory(r.data.history || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={cardStyle}>
      <h2 style={titleStyle}>Rating History</h2>
      <p style={{ color: '#64748b', fontSize: '13px' }}>Loading...</p>
    </div>
  );

  if (history.length === 0) return (
    <div style={cardStyle}>
      <h2 style={titleStyle}>Rating History</h2>
      <p style={{ color: '#64748b', fontSize: '13px' }}>
        No rated contests found. Participate in a Codeforces round to see your rating history.
      </p>
    </div>
  );

  const labels = history.map(h =>
    new Date(h.timestamp).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
  );
  const ratings = history.map(h => h.newRating);
  const currentRating = ratings[ratings.length - 1];
  const peakRating = Math.max(...ratings);

  const data = {
    labels,
    datasets: [{
      label: 'Rating',
      data: ratings,
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99, 102, 241, 0.08)',
      borderWidth: 2,
      fill: true,
      tension: 0.3,
      pointRadius: history.map((h, i) => {
        // Make points bigger for contests where rating changed significantly
        return Math.abs(h.ratingChange) >= 100 ? 5 : 3;
      }),
      pointBackgroundColor: history.map(h =>
        h.ratingChange >= 0 ? '#22c55e' : '#ef4444'
      ),
      pointBorderColor: history.map(h =>
        h.ratingChange >= 0 ? '#22c55e' : '#ef4444'
      ),
    }]
  };

  const options = {
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => {
            const idx = items[0].dataIndex;
            return history[idx].contestName;
          },
          label: (item) => {
            const h = history[item.dataIndex];
            const sign = h.ratingChange >= 0 ? '+' : '';
            return [
              `Rating: ${h.newRating}`,
              `Change: ${sign}${h.ratingChange}`,
              `Rank: #${h.rank}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { size: 10 }, maxTicksLimit: 8 },
        grid: { color: '#1e293b' },
      },
      y: {
        ticks: { color: '#64748b' },
        grid: { color: '#1e293b' },
      }
    }
  };

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>Rating History</h2>
          <p style={subStyle}>{history.length} contests</p>
        </div>
        <div style={statsStyle}>
          <div style={statItemStyle}>
            <span style={statNumStyle}>{currentRating}</span>
            <span style={statLabelStyle}>Current</span>
          </div>
          <div style={statItemStyle}>
            <span style={{ ...statNumStyle, color: '#f59e0b' }}>{peakRating}</span>
            <span style={statLabelStyle}>Peak</span>
          </div>
        </div>
      </div>
      <Line data={data} options={options} />
    </div>
  );
}

const cardStyle = {
  background: '#1e293b',
  borderRadius: '12px',
  padding: '1.25rem',
};
const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '1rem',
};
const titleStyle = {
  color: '#f1f5f9',
  fontSize: '16px',
  fontWeight: 700,
  margin: '0 0 2px',
};
const subStyle = {
  color: '#64748b',
  fontSize: '12px',
  margin: 0,
};
const statsStyle = {
  display: 'flex',
  gap: '1.5rem',
};
const statItemStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};
const statNumStyle = {
  color: '#6366f1',
  fontSize: '20px',
  fontWeight: 700,
};
const statLabelStyle = {
  color: '#64748b',
  fontSize: '11px',
};