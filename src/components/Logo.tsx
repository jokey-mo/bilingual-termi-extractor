
import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className }) => {
  const [logoExists, setLogoExists] = useState(false);
  
  useEffect(() => {
    // Check if logo.png exists in the root folder
    fetch('/logo.png')
      .then(response => {
        if (response.ok) {
          setLogoExists(true);
        }
      })
      .catch(() => {
        setLogoExists(false);
      });
  }, []);
  
  // If no logo exists, display the app name
  if (!logoExists) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className="font-bold text-xl text-slate-800">TermEx</span>
      </div>
    );
  }
  
  return (
    <div className={cn("flex items-center", className)}>
      <img 
        src="/logo.png" 
        alt="Bilingual Terminology Extractor" 
        className="h-8 max-w-[180px] object-contain" 
      />
    </div>
  );
};

export default Logo;
