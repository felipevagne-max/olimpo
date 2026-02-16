export default function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <style>{`
        @keyframes lightning-pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
        }
        .lightning-bolt {
          animation: lightning-pulse 1.5s ease-in-out infinite;
          filter: drop-shadow(0 0 20px rgba(0,255,102,0.8));
        }
      `}</style>
      <svg 
        className="lightning-bolt" 
        width="80" 
        height="80" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" 
          fill="#00FF66" 
          stroke="#00FF66" 
          strokeWidth="0.5"
        />
      </svg>
    </div>
  );
}