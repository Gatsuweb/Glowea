"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const data = [
  { name: 'Lun', value: 400 },
  { name: 'Mar', value: 300 },
  { name: 'Mer', value: 500 },
  { name: 'Jeu', value: 450 },
  { name: 'Ven', value: 200 },
  { name: 'Sam', value: 550 },
];

export default function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
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
        />
        <Bar dataKey="value" radius={[5, 5, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill="#FCD7D1" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
