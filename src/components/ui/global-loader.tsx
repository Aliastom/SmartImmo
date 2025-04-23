"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function GlobalLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timeout);
  }, [pathname]);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 pointer-events-auto transition-opacity animate-fade-in">
      <div className="flex flex-col items-center gap-4">
        <svg className="animate-spin w-14 h-14 text-blue-500 drop-shadow-lg" viewBox="0 0 50 50">
          <circle className="opacity-20" cx="25" cy="25" r="20" stroke="currentColor" strokeWidth="6" fill="none" />
          <circle className="opacity-70" cx="25" cy="25" r="20" stroke="currentColor" strokeWidth="6" fill="none" strokeDasharray="90" strokeDashoffset="60" />
        </svg>
        <span className="text-white text-lg font-semibold drop-shadow">Chargement...</span>
      </div>
    </div>
  );
}
