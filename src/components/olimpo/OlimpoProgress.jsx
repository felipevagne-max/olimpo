import { cn } from "@/lib/utils";

export default function OlimpoProgress({ value = 0, max = 100, className, showLabel = true }) {
  const percent = Math.min(Math.max((value / max) * 100, 0), 100);
  
  return (
    <div className={cn("w-full", className)}>
      <div className="h-2 bg-[#070A08] rounded-full overflow-hidden border border-[rgba(0,255,102,0.18)]">
        <div 
          className="h-full bg-gradient-to-r from-[#00FF66] to-[#00DD55] rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1">
          <span className="text-xs font-mono text-[#9AA0A6]">{value}</span>
          <span className="text-xs font-mono text-[#00FF66]">{percent.toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
}