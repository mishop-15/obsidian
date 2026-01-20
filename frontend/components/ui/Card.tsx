'use client';
import React from 'react';
import { cn } from "@/lib/utils";
import { ArrowUpRight, Lock, Shield, Zap } from "lucide-react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'feature';
  iconName?: 'lock' | 'shield' | 'zap';
  title?: string;
  subtitle?: string;
  badge?: string;
  stat?: string;
  statLabel?: string;
}

const ICON_MAP = {
  lock: Lock,
  shield: Shield,
  zap: Zap,
};

export function Card({ 
  className, 
  variant = 'default',
  children,
  iconName,
  title,
  subtitle,
  badge = "Active",
  stat,
  statLabel,
  ...props 
}: CardProps) {

  if (variant === 'feature' && iconName && title) {
    const Icon = ICON_MAP[iconName];

    return (
      <div 
        className={cn(
          "group relative flex flex-col justify-between p-8 h-[320px] w-full",
          "bg-gradient-to-br from-[#1a1a1a] via-[#121212] to-[#0a0a0a]",
          "border border-[#d4af37]/10",
          "rounded-[2.5rem]",
          "cursor-pointer overflow-hidden",
          "transition-all duration-500 ease-out",
          "hover:border-[#d4af37]/30",
          "hover:-translate-y-2",
          "hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.9)]",
          className
        )}
        {...props}
      >
        {/* Subtle Gold Gradient on Hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#d4af37]/5 via-transparent to-[#b87333]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        {/* Content */}
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div className="h-14 w-14 rounded-full bg-[#0a0a0a] border border-[#d4af37]/20 flex items-center justify-center group-hover:scale-110 group-hover:border-[#d4af37] group-hover:shadow-[0_0_20px_-5px_rgba(212,175,55,0.5)] transition-all duration-300">
              <Icon className="h-6 w-6 text-[#d4af37]" />
            </div>

            <span className="px-4 py-1.5 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/20 text-[10px] font-bold uppercase tracking-wider text-[#d4af37] group-hover:bg-[#d4af37] group-hover:text-black transition-colors duration-300">
              {badge}
            </span>
          </div>

          <div className="mt-6">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#707070] mb-2 font-medium">
              {subtitle}
            </h3>
            <h2 className="text-3xl font-bold text-[#f5f5f5] leading-tight group-hover:text-[#d4af37] transition-colors duration-300">
              {title}
            </h2>
          </div>
        </div>

        <div className="relative z-10 flex items-end justify-between mt-auto">
          {stat && (
            <div>
              <div className="text-xl font-bold text-[#f5f5f5]">{stat}</div>
              <div className="text-xs text-[#707070] font-medium">{statLabel}</div>
            </div>
          )}

          <div className="h-12 w-12 rounded-full bg-[#0a0a0a] border border-[#d4af37]/30 flex items-center justify-center group-hover:bg-[#d4af37] group-hover:border-[#d4af37] transition-all duration-300">
            <ArrowUpRight className="h-5 w-5 text-[#d4af37] group-hover:text-black transition-colors" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "luxury-card",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
}