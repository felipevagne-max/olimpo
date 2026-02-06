import OlimpoButton from './OlimpoButton';
import { cn } from '@/lib/utils';

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  className 
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-[rgba(0,255,102,0.1)] flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-[#00FF66]" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-[#E8E8E8] mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[#9AA0A6] mb-6 max-w-xs">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <OlimpoButton onClick={onAction}>
          {actionLabel}
        </OlimpoButton>
      )}
    </div>
  );
}