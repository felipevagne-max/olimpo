import { cn } from "@/lib/utils";

export default function OlimpoCard({ children, className, glow = false, ...props }) {
  return (
    <div 
      className={cn(
        "bg-[#0B0F0C] border border-[rgba(0,255,102,0.18)] rounded-xl p-4",
        glow && "shadow-[0_0_20px_rgba(0,255,102,0.1)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}