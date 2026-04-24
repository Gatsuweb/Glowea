"use client";

import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';

interface SparkBarChartProps {
  data: { value: number }[];
  color?: string;
}

export default function SparkBarChart({ data, color = "#FCD7D1" }: SparkBarChartProps) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Custom Axes with arrows */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '1px',
        backgroundColor: '#888',
        zIndex: 10
      }}>
        {/* Right Arrow */}
        <div style={{
          position: 'absolute',
          right: '-4px',
          top: '-4px',
          width: 0,
          height: 0,
          borderTop: '4px solid transparent',
          borderBottom: '4px solid transparent',
          borderLeft: '6px solid #888'
        }} />
      </div>
      
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        top: 0,
        width: '1px',
        backgroundColor: '#888',
        zIndex: 10
      }}>
        {/* Top Arrow */}
        <div style={{
          position: 'absolute',
          top: '-4px',
          left: '-4px',
          width: 0,
          height: 0,
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderBottom: '6px solid #888'
        }} />
      </div>

      <div style={{ width: '100%', height: '100%', paddingLeft: '5px', paddingBottom: '2px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <Bar dataKey="value" radius={[5, 5, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
