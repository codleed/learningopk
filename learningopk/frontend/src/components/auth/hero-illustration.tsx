"use client";

export function HeroIllustration() {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-8">
      <svg
        viewBox="0 0 500 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-lg h-auto"
      >
        {/* Background Circle */}
        <circle cx="250" cy="200" r="180" fill="#7ac943" fillOpacity="0.1" />
        <circle cx="250" cy="200" r="140" fill="#7ac943" fillOpacity="0.08" />
        
        {/* Book Base */}
        <rect x="120" y="140" width="180" height="130" rx="8" fill="#7ac943" fillOpacity="0.9" />
        <rect x="120" y="140" width="180" height="130" rx="8" fill="url(#bookGradient)" />
        
        {/* Book Spine */}
        <rect x="120" y="140" width="24" height="130" fill="#5ba132" />
        
        {/* Book Pages */}
        <rect x="148" y="148" width="144" height="106" rx="4" fill="#fafaf9" />
        
        {/* Lines on Page */}
        <rect x="160" y="165" width="80" height="4" rx="2" fill="#e2e8f0" />
        <rect x="160" y="180" width="100" height="4" rx="2" fill="#e2e8f0" />
        <rect x="160" y="195" width="70" height="4" rx="2" fill="#e2e8f0" />
        <rect x="160" y="210" width="90" height="4" rx="2" fill="#e2e8f0" />
        <rect x="160" y="225" width="60" height="4" rx="2" fill="#e2e8f0" />
        
        {/* Bookmark */}
        <path d="M292 148 L292 220 L305 205 L318 220 L318 148 Z" fill="#ef4444" />
        
        {/* Floating Elements */}
        
        {/* Pencil */}
        <g transform="translate(340, 80)">
          <rect x="0" y="0" width="60" height="12" rx="6" fill="#fbbf24" />
          <polygon points="60,0 60,12 72,6" fill="#f5f5f4" />
          <rect x="0" y="0" width="60" height="4" rx="2" fill="#f59e0b" />
        </g>
        
        {/* Notepad */}
        <g transform="translate(80, 80)">
          <rect x="0" y="0" width="70" height="90" rx="6" fill="white" stroke="#e2e8f0" strokeWidth="2" />
          <line x1="12" y1="20" x2="58" y2="20" stroke="#e2e8f0" strokeWidth="2" />
          <line x1="12" y1="35" x2="58" y2="35" stroke="#e2e8f0" strokeWidth="2" />
          <line x1="12" y1="50" x2="58" y2="50" stroke="#e2e8f0" strokeWidth="2" />
          <line x1="12" y1="65" x2="58" y2="65" stroke="#e2e8f0" strokeWidth="2" />
          <circle cx="10" cy="10" r="4" fill="#7ac943" />
        </g>
        
        {/* Graduation Cap */}
        <g transform="translate(320, 280)">
          <path d="M0 30 L40 10 L80 30 L40 40 Z" fill="#7ac943" />
          <ellipse cx="40" cy="30" rx="40" ry="12" fill="#5ba132" />
          <circle cx="40" cy="10" r="6" fill="#7ac943" />
          <line x1="20" y1="30" x2="15" y2="50" stroke="#7ac943" strokeWidth="3" strokeLinecap="round" />
          <line x1="60" y1="30" x2="65" y2="50" stroke="#7ac943" strokeWidth="3" strokeLinecap="round" />
        </g>
        
        {/* Light Bulb */}
        <g transform="translate(100, 260)">
          <circle cx="25" cy="25" r="25" fill="#fbbf24" fillOpacity="0.2" />
          <ellipse cx="25" cy="20" rx="15" ry="18" fill="#fbbf24" />
          <rect x="20" y="36" width="10" height="8" fill="#f59e0b" />
          <rect x="18" y="44" width="14" height="3" rx="1.5" fill="#f59e0b" />
          <rect x="20" y="49" width="14" height="3" rx="1.5" fill="#f59e0b" />
          {/* Rays */}
          <line x1="25" y1="-5" x2="25" y2="0" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
          <line x1="5" y1="10" x2="10" y2="14" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
          <line x1="45" y1="10" x2="40" y2="14" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
        </g>
        
        {/* Star 1 */}
        <g transform="translate(380, 180)">
          <circle cx="10" cy="10" r="10" fill="#7ac943" fillOpacity="0.15" />
          <path
            d="M10 2 L12 8 L18 8 L13 12 L15 18 L10 14 L5 18 L7 12 L2 8 L8 8 Z"
            fill="#7ac943"
          />
        </g>
        
        {/* Star 2 */}
        <g transform="translate(380, 300)">
          <circle cx="8" cy="8" r="8" fill="#7ac943" fillOpacity="0.1" />
          <path
            d="M8 2 L9.5 6 L14 6 L10 9 L11.5 14 L8 11 L4.5 14 L6 9 L2 6 L6.5 6 Z"
            fill="#7ac943"
          />
        </g>
        
        {/* Star 3 */}
        <g transform="translate(60, 320)">
          <circle cx="8" cy="8" r="8" fill="#7ac943" fillOpacity="0.1" />
          <path
            d="M8 2 L9.5 6 L14 6 L10 9 L11.5 14 L8 11 L4.5 14 L6 9 L2 6 L6.5 6 Z"
            fill="#7ac943"
          />
        </g>
        
        {/* Dotted Circles */}
        <circle cx="400" cy="120" r="30" stroke="#7ac943" strokeWidth="2" strokeDasharray="6 4" fill="none" />
        <circle cx="60" cy="180" r="20" stroke="#7ac943" strokeWidth="2" strokeDasharray="4 3" fill="none" />
        
        {/* Gradient Definition */}
        <defs>
          <linearGradient id="bookGradient" x1="120" y1="140" x2="300" y2="270" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7ac943" />
            <stop offset="1" stopColor="#68b036" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
