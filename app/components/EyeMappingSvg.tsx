export default function EyeMappingSvg({ eyeLabel }: { eyeLabel: "G" | "D" }) {
  // Une illustration simple de mapping de cils
  return (
    <div style={{ width: '100%', maxWidth: '250px', margin: '0 auto', textAlign: 'center' }}>
      <svg viewBox="0 0 200 120" style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* Base de l'œil (arc) */}
        <path d="M 20 90 Q 100 20 180 90" fill="none" stroke="#D9A8A8" strokeWidth="3" strokeLinecap="round" />
        
        {/* Cils (lignes) avec nombres */}
        <g stroke="#8B4B54" strokeWidth="1.5" strokeLinecap="round">
          {/* Centre (13) */}
          <path d="M 100 50 Q 100 30 100 15" />
          <text x="100" y="10" fontSize="10" fill="#333" textAnchor="middle" fontWeight="bold">13</text>
          
          {/* Gauche de 13 */}
          <path d="M 85 52 Q 80 32 75 18" />
          <text x="75" y="13" fontSize="10" fill="#333" textAnchor="middle" fontWeight="bold">12</text>
          
          <path d="M 70 56 Q 60 36 55 24" />
          <text x="55" y="19" fontSize="10" fill="#333" textAnchor="middle" fontWeight="bold">11</text>
          
          <path d="M 55 64 Q 40 46 35 34" />
          <text x="35" y="29" fontSize="10" fill="#333" textAnchor="middle" fontWeight="bold">10</text>
          
          <path d="M 40 74 Q 25 60 20 50" />
          <text x="20" y="45" fontSize="10" fill="#333" textAnchor="middle" fontWeight="bold">9</text>

          {/* Droite de 13 */}
          <path d="M 115 52 Q 120 32 125 18" />
          <text x="125" y="13" fontSize="10" fill="#333" textAnchor="middle" fontWeight="bold">12</text>
          
          <path d="M 130 56 Q 140 36 145 24" />
          <text x="145" y="19" fontSize="10" fill="#333" textAnchor="middle" fontWeight="bold">11</text>
          
          <path d="M 145 64 Q 160 46 165 34" />
          <text x="165" y="29" fontSize="10" fill="#333" textAnchor="middle" fontWeight="bold">10</text>
          
          <path d="M 160 74 Q 175 60 180 50" />
          <text x="180" y="45" fontSize="10" fill="#333" textAnchor="middle" fontWeight="bold">9</text>
        </g>

        {/* Lettre centrale G ou D */}
        <text x="100" y="110" fontSize="18" fill="#333" textAnchor="middle" fontWeight="bold">
          {eyeLabel}
        </text>
      </svg>
    </div>
  );
}
