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
      <img 
        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69865134dce52b476b98b991/542801807_Designsemnome4.png"
        alt="Olimpo"
        width={size}
        height={size}
        style={{ 
          width: size, 
          height: size, 
          objectFit: 'contain'
        }}
      />
    </div>
  );
}