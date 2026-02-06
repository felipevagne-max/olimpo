import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { forwardRef } from "react";

const OlimpoInput = forwardRef(({ className, ...props }, ref) => {
  return (
    <Input 
      ref={ref}
      className={cn(
        "bg-[#070A08] border-[rgba(0,255,102,0.18)] text-[#E8E8E8] placeholder:text-[#9AA0A6]",
        "focus:border-[#00FF66] focus:ring-1 focus:ring-[#00FF66] focus:shadow-[0_0_10px_rgba(0,255,102,0.2)]",
        "transition-all duration-150",
        className
      )}
      {...props}
    />
  );
});

OlimpoInput.displayName = "OlimpoInput";

export default OlimpoInput;