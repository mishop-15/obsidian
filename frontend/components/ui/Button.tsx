import React from 'react';
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded uppercase tracking-wider font-bold transition-all duration-300",
          
          // Size
          size === 'md' && "h-10 px-6 text-xs",
          size === 'lg' && "h-12 px-8 text-sm",

          // Primary: Solid Gold, Black Text, No Shadow
          variant === 'primary' && 
            "bg-[#d4af37] text-black border border-[#d4af37] hover:bg-[#e8c547] hover:border-[#e8c547]",
          
          // Secondary: Black BG, Gold Border
          variant === 'secondary' && 
            "bg-transparent text-[#a0a0a0] border border-[#d4af37]/30 hover:border-[#d4af37] hover:text-[#d4af37] hover:bg-[#d4af37]/5",

          variant === 'ghost' && "text-[#707070] hover:text-[#d4af37]",

          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";