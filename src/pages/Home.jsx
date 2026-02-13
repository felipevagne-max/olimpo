import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    // Sempre redireciona para /Auth independente do status de login
    navigate('/Auth');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center">
      <div className="text-[#00FF66] text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        Carregando...
      </div>
    </div>
  );
}