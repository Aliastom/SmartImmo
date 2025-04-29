'use client'

import React, { ReactNode, useEffect } from 'react'
import { motion, AnimatePresence, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

// Animation pour les cartes
export const AnimatedCard = ({ 
  children, 
  className,
  delay = 0,
  boxShadow,
  ...props 
}: Omit<HTMLMotionProps<"div">, "initial" | "animate" | "exit" | "transition" | "whileHover"> & { 
  delay?: number,
  boxShadow?: string,
  children: ReactNode 
}) => {
  // Forcer le style boxShadow à 'none' par défaut, avant toute animation
  let safeBoxShadow = 'none';
  if (typeof boxShadow === 'string') {
    if (boxShadow.includes('NaN') || /NaN/.test(boxShadow)) {
      safeBoxShadow = 'none';
    } else {
      safeBoxShadow = boxShadow;
    }
  }

  // Suppression des logs de debug

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ 
        duration: 0.3, 
        delay,
        type: 'spring',
        stiffness: 260,
        damping: 20
      }}
      whileHover={{ 
        scale: 1.02,
        boxShadow: safeBoxShadow
      }}
      style={{ boxShadow: safeBoxShadow }}
      className={cn("rounded-lg border bg-card text-card-foreground shadow-sm py-4", className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Animation pour les éléments de liste
export const AnimatedListItem = ({ 
  children, 
  className,
  index = 0,
  ...props 
}: Omit<HTMLMotionProps<"li">, "initial" | "animate" | "exit" | "transition" | "whileHover"> & { 
  index?: number,
  children: ReactNode
}) => {
  return (
    <motion.li
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ 
        duration: 0.2, 
        delay: index * 0.05,
        type: 'spring',
        stiffness: 500,
        damping: 30
      }}
      whileHover={{ x: 5 }}
      className={className}
      {...props}
    >
      {children}
    </motion.li>
  )
}

// Animation pour les conteneurs de page
export const PageTransition = ({ 
  children,
  className,
  ...props
}: Omit<HTMLMotionProps<"div">, "initial" | "animate" | "exit" | "transition"> & {
  children: ReactNode
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Animation pour les onglets
export const AnimatedTabsContent = ({ 
  children,
  value,
  activeValue,
  className,
  ...props
}: Omit<HTMLMotionProps<"div">, "initial" | "animate" | "exit" | "transition"> & { 
  value: string,
  activeValue: string,
  children: ReactNode
}) => {
  return (
    <AnimatePresence mode="wait">
      {value === activeValue && (
        <motion.div
          key={value}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ 
            duration: 0.2,
            type: 'spring',
            stiffness: 500,
            damping: 30
          }}
          className={className}
          {...props}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Animation pour les boutons
export const AnimatedButton = ({ 
  children,
  className,
  ...props
}: Omit<HTMLMotionProps<"button">, "whileHover" | "whileTap" | "transition"> & {
  children: ReactNode
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ 
        type: 'spring',
        stiffness: 400,
        damping: 17
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  )
}

// Animation pour le chargement
export const LoadingSpinner = ({ 
  className,
  size = 40,
  ...props
}: Omit<React.HTMLAttributes<HTMLDivElement>, "style"> & { 
  size?: number 
}) => {
  return (
    <div className={cn("flex justify-center items-center", className)} {...props}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ 
          duration: 1, 
          repeat: Infinity, 
          ease: "linear" 
        }}
        style={{ 
          width: size, 
          height: size, 
          borderRadius: '50%', 
          border: '3px solid rgba(0, 0, 0, 0.1)',
          borderTopColor: '#3b82f6',
          borderRightColor: '#3b82f6' 
        }}
      />
    </div>
  )
}

// Animation pour les notifications
export const AnimatedNotification = ({ 
  children,
  className,
  ...props
}: Omit<HTMLMotionProps<"div">, "initial" | "animate" | "exit" | "transition"> & {
  children: ReactNode
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.8 }}
      transition={{ 
        duration: 0.3,
        type: 'spring',
        stiffness: 500,
        damping: 25
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Animation pour les menus déroulants
export const AnimatedDropdown = ({ 
  children,
  className,
  isOpen,
  ...props
}: Omit<HTMLMotionProps<"div">, "initial" | "animate" | "exit" | "transition"> & { 
  isOpen: boolean,
  children: ReactNode
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0, y: -10 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0, y: -10 }}
          transition={{ 
            duration: 0.2,
            type: 'spring',
            stiffness: 500,
            damping: 30
          }}
          className={className}
          {...props}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
