
import React from 'react';
import { Image } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  src?: string;
  alt?: string;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  src, 
  alt = "Bilingual Terminology Extractor",
  className
}) => {
  // If no src is provided, display a fallback icon
  if (!src) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Image className="h-8 w-8 text-slate-800" />
        <span className="font-bold text-xl text-slate-800">TermEx</span>
      </div>
    );
  }
  
  return (
    <div className={cn("flex items-center", className)}>
      <img 
        src={src} 
        alt={alt} 
        className="h-8 max-w-[180px] object-contain" 
      />
    </div>
  );
};

export default Logo;
