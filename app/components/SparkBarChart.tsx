"use client";

import { BarChart, Bar, ResponsiveContainer, Cell, Tooltip, XAxis } from 'recharts';

interface SparkBarChartProps {
  data: { value: number; label?: string }[];
  color?: string;
}

export default function SparkBarChart({ data, color = "#FCD7D1" }: SparkBarChartProps) {
  const chartData = data.map((entry, index) => ({
    ...entry,
    label: entry.label || `Point ${index + 1}`,
  }));

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
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <XAxis dataKey="label" hide />
            <Tooltip
              cursor={{ fill: "rgba(139, 75, 84, 0.08)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const value = Number(payload[0]?.value || 0);
                return (
                  <div style={{
                    background: "rgba(255, 255, 255, 0.98)",
                    border: "1px solid rgba(139, 75, 84, 0.16)",
                    borderRadius: "10px",
                    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
                    padding: "8px 10px",
                    fontSize: "12px",
                    color: "#333",
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: "4px" }}>{String(label || "")}</div>
                    <div>{value.toFixed(2)} €</div>
                  </div>
                );
              }}
            />
            <Bar dataKey="value" radius={[5, 5, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
