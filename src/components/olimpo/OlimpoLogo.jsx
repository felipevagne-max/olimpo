export default function OlimpoLogo({ size = 80, glow = true }) {
  return (
    <div 
      className="flex items-center justify-center"
      style={{ 
        filter: glow ? 'drop-shadow(0 0 20px rgba(0,255,102,0.5))' : 'none' 
      }}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Greek temple columns */}
        <path d="M20 85 L20 45 L25 40 L25 85 Z" fill="#00FF66"/>
        <path d="M35 85 L35 45 L40 40 L40 85 Z" fill="#00FF66"/>
        <path d="M60 85 L60 45 L65 40 L65 85 Z" fill="#00FF66"/>
        <path d="M75 85 L75 45 L80 40 L80 85 Z" fill="#00FF66"/>
        {/* Roof */}
        <path d="M10 45 L50 15 L90 45 L85 45 L50 20 L15 45 Z" fill="#00FF66"/>
        {/* Base */}
        <rect x="15" y="85" width="70" height="5" fill="#00FF66"/>
        {/* Lightning bolt in center */}
        <path d="M50 30 L45 50 L52 48 L48 70 L55 45 L48 47 Z" fill="#000" stroke="#00FF66" strokeWidth="1"/>
      </svg>
    </div>
  );
}