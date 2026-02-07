export default function LevelCrest({ levelIndex, size = 40, locked = false }) {
  const color = locked ? '#9AA0A6' : '#00FF66';
  const opacity = locked ? 0.4 : 1;

  const crests = {
    1: ( // Iniciado - raio simples
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" fill={color} opacity={opacity} />
      </svg>
    ),
    2: ( // Líder - raio + chevron
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 2L8 6h8l-4-4z" stroke={color} strokeWidth="1.5" opacity={opacity} />
        <path d="M13 6L5 16h6l-1 6 8-10h-6l1-6z" fill={color} opacity={opacity} />
      </svg>
    ),
    3: ( // Herói - raio + escudo
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 2L4 6v6c0 5 8 10 8 10s8-5 8-10V6l-8-4z" stroke={color} strokeWidth="1.5" opacity={opacity} />
        <path d="M12 8l-3 4h2.5l-1 4 3.5-4h-2.5l1-4z" fill={color} opacity={opacity} />
      </svg>
    ),
    4: ( // Lenda - escudo + duplo raio
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 2L4 6v6c0 5 8 10 8 10s8-5 8-10V6l-8-4z" stroke={color} strokeWidth="1.5" opacity={opacity} />
        <path d="M10 7l-2 3h2l-.5 3 2-3h-2l.5-3z" fill={color} opacity={opacity} />
        <path d="M14 7l-2 3h2l-.5 3 2-3h-2l.5-3z" fill={color} opacity={opacity} />
      </svg>
    ),
    5: ( // Titã - escudo robusto
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 2L3 6v6c0 5.5 9 11 9 11s9-5.5 9-11V6l-9-4z" stroke={color} strokeWidth="2" opacity={opacity} />
        <path d="M3 10h5l-2 3z M21 10h-5l2 3z" fill={color} opacity={opacity} />
        <path d="M12 8l-3 4h2l-1 4 4-4h-2l1-4z" fill={color} opacity={opacity} />
      </svg>
    ),
    6: ( // Imortal - raio + asas
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M2 10c0-2 2-4 4-4s3 1 4 2" stroke={color} strokeWidth="1.5" opacity={opacity} />
        <path d="M22 10c0-2-2-4-4-4s-3 1-4 2" stroke={color} strokeWidth="1.5" opacity={opacity} />
        <path d="M12 8l-4 5h3l-1 5 5-6h-3l1-4z" fill={color} opacity={opacity} />
      </svg>
    ),
    7: ( // Semi-Deus - raio + halo
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="5" r="3" stroke={color} strokeWidth="1.5" opacity={opacity} />
        <path d="M12 9l-4 5h3l-1 6 5-7h-3l1-4z" fill={color} opacity={opacity} />
      </svg>
    ),
    8: ( // Olimpiano - raio + coroa de louros
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M8 4c-1 0-2 1-2 2s1 2 2 2M12 2c-1 0-1 1-1 2s0 2 1 2M16 4c1 0 2 1 2 2s-1 2-2 2" 
          stroke={color} strokeWidth="1.5" opacity={opacity} />
        <path d="M12 8l-4 5h3l-1 6 5-7h-3l1-4z" fill={color} opacity={opacity} />
      </svg>
    )
  };

  return (
    <div style={{ filter: !locked ? 'drop-shadow(0 0 6px rgba(0,255,102,0.3))' : 'none' }}>
      {crests[levelIndex] || crests[1]}
    </div>
  );
}