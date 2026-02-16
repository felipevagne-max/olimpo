import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from 'lucide-react';

export default function UserPopover() {
  const navigate = useNavigate();



  return (
    <button 
      onClick={() => navigate(createPageUrl('Profile'))}
      className="p-2 transition-colors rounded-lg hover:bg-[rgba(0,255,200,0.1)]"
      style={{ 
        color: 'rgba(0, 255, 200, 0.7)'
      }}
    >
      <User className="w-5 h-5" />
    </button>
  );
}