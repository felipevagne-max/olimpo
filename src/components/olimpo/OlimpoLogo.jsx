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
          d="M14 2L4 12h6l-2 10 12-14h-7l3-6z"
          fill="none"
          stroke="#00FF66"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14 2l-1.5 4M10 12l-0.8 2.5M20 12l-2 2"
          stroke="#00FF66"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.6"
        />
      </svg>
    </div>
  );
}