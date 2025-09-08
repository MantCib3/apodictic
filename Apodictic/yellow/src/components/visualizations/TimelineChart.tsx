tcf import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
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

interface TimelineProps {
  data: Array<{
    date: string;
    value: number;
  }>;
  title: string;
}

export const TimelineChart: React.FC<TimelineProps> = ({ data, title }) => {
  const [chartData, setChartData] = useState<any>({});

  useEffect(() => {
    setChartData({
      labels: data.map(item => item.date),
      datasets: [{
        label: title,
        data: data.map(item => item.value),
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }]
    });
  }, [data, title]);

  return <Line data={chartData} />;
};
