"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

type RevenueChartPoint = {
  name: string;
  val: number;
};

type RevenueChartProps = {
  data?: RevenueChartPoint[];
};

const euroFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export default function RevenueChart({ data = [] }: RevenueChartProps) {
  const chartData = data.length ? data : [{ name: '-', val: 0 }];
  const hasRevenue = chartData.some((entry) => entry.val > 0);

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
      <BarChart
        data={chartData}
        margin={{
          top: 5,
          right: 0,
          left: -20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEE" />
        <XAxis 
          dataKey="name" 
          axisLine={true} 
          tickLine={false} 
          tick={{ fontSize: 10, fill: '#888' }} 
        />
        <YAxis 
          axisLine={true} 
          tickLine={false} 
          tick={{ fontSize: 10, fill: '#888' }} 
        />
        <Tooltip 
          cursor={{fill: 'transparent'}}
          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
          formatter={(value) => [euroFormatter.format(Number(value)), 'Revenus']}
        />
        <Bar dataKey="val" radius={[5, 5, 0, 0]} minPointSize={hasRevenue ? 2 : 0}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.val > 0 ? "#FCD7D1" : "#F3F3F3"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
