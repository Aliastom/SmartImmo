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

interface PointRentabiliteGraphProps {
  cashflows: number[];
  years: number[];
}

const PointRentabiliteGraph: React.FC<PointRentabiliteGraphProps> = ({ cashflows, years }) => {
  const chartData = {
    labels: years,
    datasets: [
      {
        label: 'Cashflow cumulé (€)',
        data: cashflows,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
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
          title: { display: true, text: 'Évolution du cashflow cumulé' },
        },
        scales: {
          y: { beginAtZero: false, ticks: { callback: (v: any) => v.toLocaleString('fr-FR') } },
        },
      }} />
    </div>
  );
};

export default PointRentabiliteGraph;
