import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, CreditCard, FileText, Users, BarChart2, Settings, ChevronRight, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';

// Importation du CSS custom pour l'animation du bouton
import '@/app/properties/[id]/components/smartimmo-button.css';

const navItems = [
  { label: 'Dashboard', icon: <Home size={22} />, href: '/dashboard' },
  { label: 'Biens', icon: <CreditCard size={22} />, href: '/properties' },
  { label: 'Transactions', icon: <FileText size={22} />, href: '/transactions' },
  { label: 'Locataires', icon: <Users size={22} />, href: '/tenants' },
  { label: 'Documents', icon: <FileText size={22} />, href: '/documents' },
  { label: 'Régimes fiscaux', icon: <Settings size={22} />, href: '/regimes' },
  { label: 'Impôts', icon: <BarChart2 size={22} />, href: '/impots-premium' },
  { label: 'Profil', icon: <Users size={22} />, href: '/profile' },
  { label: 'Admin', icon: <Settings size={22} />, href: '/admin' },
];

import { useAuth } from '@/lib/context/auth-context';

export const FloatingMenu: React.FC = () => {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [showMenuAnim, setShowMenuAnim] = useState(false);
  const [loading, setLoading] = useState(false);
  const [circleAnim, setCircleAnim] = useState(false);
  const [closing, setClosing] = useState(false);
  const [avatarMenu, setAvatarMenu] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [ripple, setRipple] = useState<{ idx: number, x: number, y: number, key: number, close: () => void } | null>(null);
  let rippleKey = 0;
  const avatarRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const activeIdx = navItems.findIndex(item => pathname.startsWith(item.href));

  useEffect(() => {
    if (open) setShowMenuAnim(false);
  }, [open]);

  useEffect(() => {
    if (!avatarMenu) return;
    function handleClick(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarMenu(false);
      }
    }
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [avatarMenu]);

  const handleOpenMenu = () => {
    setCircleAnim(true);
    setTimeout(() => {
      setCircleAnim(false);
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setShowMenuAnim(true);
        setTimeout(() => setOpen(true), 180);
      }, 320); // temps du loader
    }, 220); // temps de l'expansion
  };

  const handleCloseMenu = () => {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 340); // durée de l'animation de fermeture
  };

  return (
    <>
      {/* Overlay fondu */}
      <AnimatePresence>
        {(open || closing) && (
          <motion.div
            key="overlay"
            className="fixed inset-0 bg-black/30 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={handleCloseMenu}
          />
        )}
      </AnimatePresence>
      {/* Zone sensible à gauche */}
      {!open && (
        <div
          style={{position:'fixed',left:0,top:0,width:24,height:'100vh',zIndex:9999}}
          onMouseEnter={handleOpenMenu}
        />
      )}
      {/* SUPPRIMÉ : pas d'animation intermédiaire ni bouton flottant avant ouverture du menu */}
      {/* Menu flottant slide depuis la gauche avec fermeture animée */}
      <AnimatePresence>
        {(open || closing) && (
          <motion.div
            key="floating-menu"
            className="fixed top-0 left-0 z-50 h-full w-[92vw] max-w-md rounded-r-3xl bg-white/60 shadow-2xl border-r border-gray-200 flex flex-col overflow-hidden backdrop-blur-xl border-white/30"
            style={{
              boxShadow: '0 8px 40px 0 #0003, 0 1.5px 0 0 #fff8 inset',
              border: '1.5px solid rgba(255,255,255,0.22)',
              borderRight: '2.5px solid rgba(255,255,255,0.34)',
              background: 'linear-gradient(120deg,rgba(255,255,255,0.60) 80%,rgba(248,247,255,0.36) 100%)',
              backdropFilter: 'blur(24px) saturate(1.35)',
            }}
            initial={{ x: -360, opacity: 0 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: -360, opacity: 0, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
          >
            {/* Header foncé avec logo + nom appli */}
            <div className="flex items-center justify-between bg-[#181a3b] px-6 py-4">
              {/* Avatar animé à gauche */}
              <motion.button
                whileHover={{ scale: 1.13, rotate: 12, boxShadow: '0 0 0 3px #fde04799' }}
                transition={{ type: 'spring', stiffness: 350, damping: 18 }}
                className="flex items-center justify-center w-11 h-11 rounded-full border-2 border-yellow-400 bg-[#23244a] shadow cursor-pointer mr-2"
                style={{ outline: 'none' }}
                tabIndex={0}
                aria-label="Profil utilisateur"
              >
                <img
                  src={user?.user_metadata?.avatar_url || '/images/logo.png'}
                  alt={user?.user_metadata?.full_name || user?.email || 'Utilisateur'}
                  className="w-9 h-9 rounded-full object-cover bg-white/20"
                />
              </motion.button>
              {/* Logo + nom appli centré */}
              <div className="flex-1 flex items-center justify-center">
                <span className="relative flex items-center justify-center smartimmo-btn w-[170px] h-[40px] bg-[#181a3b] rounded-2xl overflow-hidden border border-[#181a3b] cursor-pointer group">
                  <span className="smartimmo-fill absolute inset-0 rounded-2xl bg-yellow-400/90 z-0 pointer-events-none transition-transform transition-colors" />
                  <span className="relative z-10 flex items-center gap-2 smartimmo-text text-base font-bold text-white group-hover:text-[#181a3b] transition-colors duration-300">
                    <Image src="/images/logo.png" alt="Logo SmartImmo" width={20} height={20} className="rounded-full bg-transparent" />
                    <span className="font-bold">SMARTIMMO</span>
                  </span>
                </span>
              </div>
              {/* Bouton close animé */}
              <motion.button
                onClick={handleCloseMenu}
                className="rounded-full w-10 h-10 flex items-center justify-center bg-[#23265c] hover:bg-[#35386e] text-white shadow focus:outline-none focus:ring-2 focus:ring-yellow-300 relative overflow-hidden group"
                aria-label="Fermer le menu"
                whileHover={{ scale: 1.08, rotate: 90, backgroundColor: '#35386e' }}
                whileTap={{ scale: 0.92, rotate: -90, backgroundColor: '#181a3b' }}
                transition={{ type: 'spring', stiffness: 350, damping: 18 }}
              >
                <motion.span
                  initial={{ rotate: 0 }}
                  animate={{ rotate: [0, 180, 360] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                  className="absolute inset-0 rounded-full bg-yellow-300/10 opacity-0 group-hover:opacity-100 pointer-events-none"
                />
                <motion.span
                  whileHover={{ scale: 1.2, color: '#facc15' }}
                  whileTap={{ scale: 0.8, color: '#f87171' }}
                  className="z-10"
                >
                  <X size={26} strokeWidth={3} />
                </motion.span>
              </motion.button>
            </div>
            {/* Navigation */}
            <nav className="flex flex-col divide-y divide-dotted divide-gray-200 bg-white/95">
              {navItems.map((item, idx) => (
                <Link href={item.href} key={item.label} legacyBehavior={false} passHref={false}>
                  <motion.div
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onMouseDown={e => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setRipple({
                        idx,
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                        key: Date.now() + Math.random(),
                        close: () => {
                          handleCloseMenu();
                          setTimeout(() => router.push(item.href), 10);
                        }
                      });
                    }}
                    whileTap={{ scale: 0.98 }}
                    animate={hoveredIdx === idx ? {
                      scale: 1.04,
                      backgroundColor: '#fef9c3',
                      boxShadow: '0 4px 24px #facc1599',
                      color: '#181a3b',
                    } : {}}
                    transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                    className={`group flex items-center justify-between px-6 py-4 font-medium text-gray-800 ${idx === activeIdx ? 'bg-yellow-200/80 rounded-2xl font-bold shadow border border-yellow-300 scale-[1.03] ring-2 ring-yellow-300/40' : ''}`}
                    style={{ minHeight: 56, cursor: 'pointer', transition: 'background 0.18s, box-shadow 0.18s, color 0.18s', position: 'relative', overflow: 'hidden' }}
                    tabIndex={0}
                    role="link"
                    onClick={e => {
                      e.preventDefault();
                      setRipple({
                        idx,
                        x: 24,
                        y: 24,
                        key: Date.now() + Math.random(),
                        close: () => {
                          handleCloseMenu();
                          setTimeout(() => router.push(item.href), 10);
                        }
                      });
                    }}
                  >
                    {/* Ripple effect */}
                    {ripple && ripple.idx === idx && (
                      <motion.span
                        key={ripple.key}
                        initial={{ scale: 0, opacity: 0.55 }}
                        animate={{ scale: 7.5, opacity: 0 }}
                        transition={{ duration: 0.48, ease: 'easeOut' }}
                        style={{ position: 'absolute', left: ripple.x, top: ripple.y, width: 32, height: 32, borderRadius: 9999, background: '#fde047', zIndex: 1 }}
                        onAnimationComplete={() => {
                          setRipple(null);
                          ripple && ripple.close && ripple.close();
                        }}
                      />
                    )}
                    <span className="flex items-center gap-3">
                      <motion.span
                        animate={
                          hoveredIdx === idx
                            ? {
                                scale: [1, 1.18, 1.12, 1.18, 1],
                                rotate: [0, -10, 10, -10, 0],
                                y: [0, -4, 4, -2, 0],
                              }
                            : { scale: 1, rotate: 0, y: 0 }
                        }
                        transition={
                          hoveredIdx === idx
                            ? {
                                duration: 0.55,
                                times: [0, 0.25, 0.5, 0.75, 1],
                                type: 'tween',
                                ease: 'easeInOut',
                                repeat: Infinity,
                              }
                            : { duration: 0.22, type: 'tween', ease: 'easeInOut' }
                        }
                        style={{ display: 'inline-flex' }}
                      >
                        {item.icon}
                      </motion.span>
                      <span className="ml-1 text-base">{item.label}</span>
                    </span>
                    <motion.span
                      initial={false}
                      animate={idx === activeIdx ? { rotate: 90, opacity: 1 } : { rotate: 0, opacity: 0.45 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className="mr-2"
                    >
                      <ChevronRight size={20} />
                    </motion.span>
                  </motion.div>
                </Link>
              ))}
            </nav>
            {/* Bouton Déconnexion en bas si connecté */}
            {user && user.email && (
              <div className="mt-auto px-6 pb-7 pt-2 flex flex-col">
                <button
                  className="w-full py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-[#181a3b] font-bold text-base shadow transition mt-2"
                  onClick={async () => { await signOut(); }}
                >
                  Déconnexion
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/*
Dans ton global.css (si pas déjà présent), ajoute :
.group:hover .group-hover\\:scale-x-100 { transform: scaleX(1) !important; opacity: 1 !important; }
.group:focus .group-focus\\:scale-x-100 { transform: scaleX(1) !important; opacity: 1 !important; }
*/
