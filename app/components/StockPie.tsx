"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface StockPieProps {
  current: number;
  total: number;
  label: string;
  color: string;
  emptyColor: string;
}

export default function StockPie({ current, total, label, color, emptyColor }: StockPieProps) {
  // Calcul du pourcentage pour affichage ou couleur dynamique
  const percentage = Math.round((current / total) * 100);
  
  // Si le stock est faible (moins de 25%), on force la couleur en rouge (optionnel, pour l'UX)
  const isLowStock = percentage <= 25;
  const activeColor = isLowStock ? '#E53E3E' : color;

  const data = [
    { name: 'Rempli', value: current },
    { name: 'Vide', value: total - current > 0 ? total - current : 0 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ position: 'relative', width: '85px', height: '85px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={0}
              outerRadius={40}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              stroke="none"
              isAnimationActive={true}
            >
              <Cell key="cell-0" fill={activeColor} />
              <Cell key="cell-1" fill={emptyColor} opacity={0.5} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Label sous le camembert */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#333' }}>{label}</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#666' }}>
          {current} / {total}
        </span>
        {isLowStock && (
          <span style={{ fontSize: '0.65rem', color: '#E53E3E', fontWeight: 600, textTransform: 'uppercase' }}>
            Stock bas
          </span>
        )}
      </div>
    </div>
  );
}
