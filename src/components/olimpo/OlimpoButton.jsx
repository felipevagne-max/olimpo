import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function OlimpoButton({ 
  children, 
  variant = 'primary', 
  className, 
  ...props 
}) {
  const variants = {
    primary: "bg-[#00FF66] text-black hover:bg-[#00DD55] hover:shadow-[0_0_20px_rgba(0,255,102,0.4)] transition-all duration-150",
    secondary: "bg-transparent border border-[rgba(0,255,102,0.18)] text-[#00FF66] hover:bg-[rgba(0,255,102,0.1)] transition-all duration-150",
    ghost: "bg-transparent text-[#00FF66] hover:bg-[rgba(0,255,102,0.1)] transition-all duration-150"
  };

  return (
    <Button 
      className={cn(
        "font-medium rounded-lg",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}