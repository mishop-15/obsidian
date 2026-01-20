/* eslint-disable react-hooks/set-state-in-effect */
'use client';
import { useEffect, useState } from 'react';

const CONFIG = {
  stars: {
    count: 180,
    minSize: 0.8,
    maxSize: 2,
    minOpacity: 0.15,
    maxOpacity: 0.6,
    minDuration: 8,
    maxDuration: 14,
  },
} as const;

const ORBS = [
  {
    id: 'orb-gold-main',
    color: '#d4af37',
    position: 'top-[5%] left-[15%] w-[70%] h-[70%]',
    delay: '0s',
    opacity: 'opacity-[0.08]',
    blur: 'blur-[140px]'
  },
  {
    id: 'orb-gold-accent',
    color: '#d4af37',
    position: 'bottom-[15%] right-[20%] w-[60%] h-[60%]',
    delay: '-8s',
    opacity: 'opacity-[0.06]',
    blur: 'blur-[120px]'
  },
  {
    id: 'orb-copper',
    color: '#b87333',
    position: 'top-[40%] right-[10%] w-[50%] h-[50%]',
    delay: '-5s',
    opacity: 'opacity-[0.05]',
    blur: 'blur-[100px]'
  },
  {
    id: 'orb-gold-center',
    color: '#e8c547',
    position: 'top-[50%] left-[50%] w-[40%] h-[40%]',
    delay: '-12s',
    opacity: 'opacity-[0.04]',
    blur: 'blur-[110px]'
  }
];

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

function generateStars(count: number): Star[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * (CONFIG.stars.maxSize - CONFIG.stars.minSize) + CONFIG.stars.minSize,
    duration: Math.random() * (CONFIG.stars.maxDuration - CONFIG.stars.minDuration) + CONFIG.stars.minDuration,
    delay: Math.random() * 12,
    opacity: Math.random() * (CONFIG.stars.maxOpacity - CONFIG.stars.minOpacity) + CONFIG.stars.minOpacity,
  }));
}

export default function StarfieldBackground() {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    setStars(generateStars(CONFIG.stars.count));
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#0a0a0a]">
      {ORBS.map((orb) => (
        <div
          key={orb.id}
          className={`absolute rounded-full mix-blend-screen filter animate-float ${orb.position} ${orb.opacity} ${orb.blur}`}
          style={{ 
            backgroundColor: orb.color,
            animationDelay: orb.delay,
          }}
        />
      ))}

      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150" />

      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white animate-twinkle"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        />
      ))}
    </div>
  );
}