import { cn } from "@/lib/utils";

export function PremiumGoal({ className }: { className?: string }) {
  return (
    <div className={cn("relative w-full h-full", className)}>
      {/* Back supports */}
      <div className="absolute top-0 left-4 w-1.5 h-full bg-gradient-to-b from-gray-400 to-gray-800 origin-top -rotate-12 z-0 opacity-80" />
      <div className="absolute top-0 right-4 w-1.5 h-full bg-gradient-to-b from-gray-400 to-gray-800 origin-top rotate-12 z-0 opacity-80" />
      
      {/* The Net - Hexagonal Pattern */}
      <div 
        className="absolute inset-0 z-0 opacity-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='40' viewBox='0 0 24 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12 0 L24 8 L24 20 L12 28 L0 20 L0 8 Z' fill='none' stroke='white' stroke-width='1.5' stroke-opacity='0.8'/%3E%3Cpath d='M12 40 L24 32 L24 20 L12 28 L0 32 L0 40 Z' fill='none' stroke='white' stroke-width='1.5' stroke-opacity='0.8'/%3E%3C/svg%3E")`,
          backgroundSize: '24px 40px'
        }}
      />

      {/* Goal Posts & Crossbar */}
      <div className="absolute top-0 left-0 right-0 h-3 md:h-4 bg-gradient-to-b from-white via-gray-300 to-gray-600 rounded-t-sm shadow-[0_10px_20px_rgba(0,0,0,0.6)] z-10" />
      <div className="absolute top-0 left-0 bottom-0 w-3 md:w-4 bg-gradient-to-r from-gray-600 via-gray-300 to-white rounded-l-sm shadow-[10px_0_20px_rgba(0,0,0,0.6)] z-10" />
      <div className="absolute top-0 right-0 bottom-0 w-3 md:w-4 bg-gradient-to-l from-gray-600 via-gray-300 to-white rounded-r-sm shadow-[-10px_0_20px_rgba(0,0,0,0.6)] z-10" />
    </div>
  );
}

export function PremiumBall({ className }: { className?: string }) {
  return (
    <div className={cn("relative w-12 h-12 md:w-16 md:h-16 rounded-full shadow-[inset_-6px_-6px_15px_rgba(0,0,0,0.7),_0_15px_25px_rgba(0,0,0,0.6)] bg-white overflow-hidden flex items-center justify-center", className)}>
      <svg viewBox="0 0 100 100" className="w-[110%] h-[110%] opacity-90 absolute text-slate-800">
        <polygon points="50,25 30,40 38,65 62,65 70,40" fill="currentColor" />
        <polygon points="50,25 30,5 70,5" fill="currentColor" opacity="0.8" />
        <polygon points="30,40 5,25 5,55" fill="currentColor" opacity="0.8" />
        <polygon points="70,40 95,25 95,55" fill="currentColor" opacity="0.8" />
        <polygon points="38,65 20,95 50,95" fill="currentColor" opacity="0.8" />
        <polygon points="62,65 80,95 50,95" fill="currentColor" opacity="0.8" />
        
        <line x1="50" y1="25" x2="50" y2="5" stroke="currentColor" strokeWidth="2.5" />
        <line x1="30" y1="40" x2="5" y2="25" stroke="currentColor" strokeWidth="2.5" />
        <line x1="70" y1="40" x2="95" y2="25" stroke="currentColor" strokeWidth="2.5" />
        <line x1="38" y1="65" x2="20" y2="95" stroke="currentColor" strokeWidth="2.5" />
        <line x1="62" y1="65" x2="80" y2="95" stroke="currentColor" strokeWidth="2.5" />
      </svg>
      {/* Glossy overlay for spherical depth */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/30 to-white/80 mix-blend-overlay" />
      <div className="absolute top-[10%] left-[20%] w-[40%] h-[30%] bg-white/60 rounded-full blur-[2px] transform -rotate-45" />
    </div>
  );
}

export function KeeperBot({ className }: { className?: string }) {
  return (
    <div className={cn("relative w-20 h-20 md:w-28 md:h-28 flex items-center justify-center", className)}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)]">
        {/* Head */}
        <rect x="35" y="15" width="30" height="28" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
        {/* Glowing Visor */}
        <rect x="40" y="22" width="20" height="8" rx="3" fill="#0ea5e9" className="animate-pulse" />
        <rect x="42" y="24" width="16" height="4" rx="2" fill="#bae6fd" />
        {/* Body */}
        <path d="M 30 50 L 70 50 L 60 90 L 40 90 Z" fill="#334155" stroke="#0ea5e9" strokeWidth="1" />
        {/* Neon Accents */}
        <line x1="45" y1="50" x2="45" y2="80" stroke="#0ea5e9" strokeWidth="2" opacity="0.5" />
        <line x1="55" y1="50" x2="55" y2="80" stroke="#0ea5e9" strokeWidth="2" opacity="0.5" />
        {/* Shoulders */}
        <circle cx="30" cy="55" r="10" fill="#94a3b8" />
        <circle cx="70" cy="55" r="10" fill="#94a3b8" />
        {/* Floating Gloves */}
        <rect x="2" y="30" width="18" height="24" rx="5" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
        <rect x="80" y="30" width="18" height="24" rx="5" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
      </svg>
    </div>
  );
}

export function KeeperPlayer({ className }: { className?: string }) {
  return (
    <div className={cn("relative w-20 h-20 md:w-28 md:h-28 flex items-center justify-center", className)}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)]">
        {/* Head */}
        <circle cx="50" cy="28" r="18" fill="#fef08a" stroke="#ca8a04" strokeWidth="2" />
        {/* Visor/Glasses */}
        <rect x="35" y="22" width="30" height="10" rx="5" fill="#1e293b" />
        <rect x="38" y="24" width="10" height="4" rx="2" fill="#cbd5e1" />
        <rect x="52" y="24" width="10" height="4" rx="2" fill="#cbd5e1" />
        {/* Body */}
        <path d="M 28 50 L 72 50 L 62 90 L 38 90 Z" fill="#22c55e" stroke="#16a34a" strokeWidth="2" />
        <path d="M 40 50 L 60 50 L 55 85 L 45 85 Z" fill="#16a34a" opacity="0.3" />
        {/* Shoulders */}
        <circle cx="28" cy="55" r="10" fill="#15803d" />
        <circle cx="72" cy="55" r="10" fill="#15803d" />
        {/* Floating Gloves */}
        <rect x="0" y="30" width="20" height="26" rx="6" fill="#f59e0b" stroke="#b45309" strokeWidth="2" />
        <rect x="80" y="30" width="20" height="26" rx="6" fill="#f59e0b" stroke="#b45309" strokeWidth="2" />
      </svg>
    </div>
  );
}