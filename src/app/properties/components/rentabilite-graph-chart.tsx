import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface RentabiliteGraphChartProps {
  purchasePrice: number;
  purchaseDate: string;
  durationYears: number;
}

const RentabiliteGraphChart: React.FC<RentabiliteGraphChartProps> = ({ purchasePrice, purchaseDate, durationYears }) => {
  const startYear = purchaseDate ? new Date(purchaseDate).getFullYear() : new Date().getFullYear();
  const amortPerYear = purchasePrice / durationYears;
  const data = Array.from({ length: durationYears + 1 }, (_, i) => ({
    year: startYear + i,
    amortized: Math.min(amortPerYear * i, purchasePrice),
    remaining: Math.max(purchasePrice - amortPerYear * i, 0),
  }));

  const chartData = {
    labels: data.map((row) => row.year),
    datasets: [
      {
        label: 'Montant amorti (€)',
        data: data.map((row) => row.amortized),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        fill: true,
      },
      {
        label: 'Valeur nette (€)',
        data: data.map((row) => row.remaining),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        fill: true,
      },
    ],
  };

  return (
    <div className="my-6">
      <Line data={chartData} options={{
        responsive: true,
        plugins: {
          legend: { position: 'top' as const },
          title: { display: true, text: 'Rentabilité du bien (linéaire)' },
        },
        scales: {
          y: { beginAtZero: true, ticks: { callback: (v: any) => v.toLocaleString('fr-FR') } },
        },
      }} />
    </div>
  );
};

export default RentabiliteGraphChart;
