import { cn } from "@/lib/utils";

export default function LoadingSpinner({ size = "md", className }) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12"
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div 
        className={cn(
          "border-2 border-[rgba(0,255,102,0.2)] border-t-[#00FF66] rounded-full animate-spin",
          sizes[size]
        )}
      />
    </div>
  );
}