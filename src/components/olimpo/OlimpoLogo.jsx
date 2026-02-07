export default function OlimpoLogo({ size = 40, glow = true, className = '' }) {
  return (
    <div 
      className={className}
      style={{ 
        filter: glow ? 'drop-shadow(0 0 8px rgba(0,255,102,0.4))' : 'none',
        width: size,
        height: size
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"
          fill="#00FF66"
          stroke="#00FF66"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}