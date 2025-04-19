'use client'

import React from 'react'

export function SmartImmoLogo({ className = "", size = 'md' }: { className?: string, size?: 'sm' | 'md' | 'lg' }) {
  // Tailles disponibles
  const sizes = {
    sm: { width: 24, height: 24, fontSize: 'text-sm' },
    md: { width: 32, height: 32, fontSize: 'text-lg' },
    lg: { width: 40, height: 40, fontSize: 'text-xl' }
  }
  
  const { width, height, fontSize } = sizes[size]
  
  return (
    <div className={`flex items-center ${className}`}>
      {/* Logo SVG intégré directement */}
      <svg 
        width={width} 
        height={height} 
        viewBox="0 0 800 800" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="mr-2"
      >
        <path 
          d="M511.6 144.8L170 400.8L170 650.8C170 667.4 183.4 680.8 200 680.8L350 680.8C366.6 680.8 380 667.4 380 650.8L380 500.8C380 484.2 393.4 470.8 410 470.8L560 470.8C576.6 470.8 590 484.2 590 500.8L590 650.8C590 667.4 603.4 680.8 620 680.8L770 680.8C786.6 680.8 800 667.4 800 650.8L800 400L458.4 144.8C445.2 134.8 424.8 134.8 411.6 144.8L170 328.8" 
          stroke="#2A3158" 
          strokeWidth="40" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <circle 
          cx="470" 
          cy="400" 
          r="60" 
          fill="white" 
          stroke="#2A3158" 
          strokeWidth="40"
        />
        <path 
          d="M470 340 L470 460" 
          stroke="#2A3158" 
          strokeWidth="40" 
          strokeLinecap="round"
        />
      </svg>
      
      {/* Texte du logo */}
      <span className={`font-semibold ${fontSize} ${size === 'lg' ? 'text-white' : 'text-indigo-600'}`}>
        SmartImmo
      </span>
    </div>
  )
}
