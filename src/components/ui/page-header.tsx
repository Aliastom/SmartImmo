"use client"

import { ReactNode, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "./button"

interface PageHeaderProps {
  title: string
  buttonText?: string
  buttonIcon?: ReactNode
  onButtonClick?: () => void
  leftIcon?: ReactNode
  onLeftClick?: () => void
  rightIcon?: ReactNode
  onRightClick?: () => void
  className?: string
}

export function PageHeader({
  title,
  buttonText,
  buttonIcon,
  onButtonClick,
  leftIcon,
  onLeftClick,
  rightIcon,
  onRightClick,
  leftDisabled = false,
  rightDisabled = false,
  className = ""
}: PageHeaderProps & { leftDisabled?: boolean, rightDisabled?: boolean }) {
  const [isButtonHovered, setIsButtonHovered] = useState(false)

  return (
    <div className={`flex items-center gap-4 mb-0 mt-0 ml-0 pl-0 w-full !px-0 ${className}`} style={{minHeight:60, marginTop:0, marginBottom:0, paddingLeft:0, paddingTop:0, paddingBottom:0}}>
      {/* Flèche gauche */}
      {leftIcon && (
        <Button
          onClick={leftDisabled ? undefined : onLeftClick}
          className={`btn-glass w-fit btn-animated-yellow mr-2 ${leftDisabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
          style={{ minWidth: 36, minHeight: 36, maxWidth: 40, maxHeight: 40, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          disabled={leftDisabled}
        >
          <span className="btn-animated-yellow-bg" aria-hidden="true"></span>
          <span className="relative flex items-center z-10">
            {leftIcon}
          </span>
        </Button>
      )}
      {/* Bloc titre + flèche droite alignés */}
      <div className="flex flex-row items-center flex-shrink gap-1 min-w-0 relative">
        <div className="relative flex flex-row items-center">
          <h1 className="text-3xl md:text-4xl font-bold text-blue-900 leading-tight relative z-10 w-fit truncate">
            {title}
          </h1>
          {/* Flèche droite (Suivant) alignée verticalement */}
          {rightIcon && (
            <Button
              onClick={rightDisabled ? undefined : onRightClick}
              className={`btn-glass w-fit btn-animated-yellow ml-1 p-0 ${rightDisabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
              style={{ minWidth: 36, minHeight: 36, maxWidth: 40, maxHeight: 40, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              disabled={rightDisabled}
            >
              <span className="btn-animated-yellow-bg" aria-hidden="true"></span>
              <span className="relative flex items-center z-10">
                {rightIcon}
              </span>
            </Button>
          )}
          {/* Trait animé SOUS le titre, toujours visible */}
          <motion.span
            className="block absolute left-0 bottom-[-0.3em] h-2 rounded-full bg-gradient-to-r from-yellow-200 to-green-200 opacity-80 overflow-hidden z-0"
            style={{ width: '100%', minWidth: '100%', maxWidth: '100%', transformOrigin: 'left', pointerEvents: 'none' }}
          >
            <motion.span
              className="absolute top-0 left-0 h-full w-1/3 rounded-full bg-gradient-to-r from-yellow-300 via-yellow-200 to-green-200 shadow-lg"
              initial={{ x: 0 }}
              animate={{ x: '200%' }}
              transition={{
                repeat: Infinity,
                repeatType: 'reverse',
                duration: 2.2,
                ease: 'easeInOut',
              }}
            />
          </motion.span>
        </div>
      </div>
      {/* Bouton Modifier bien séparé */}
      {buttonText && (
        <Button
          onClick={onButtonClick}
          className="btn-glass w-fit btn-animated-yellow ml-4 flex items-center gap-2 px-4 py-2 rounded-lg shadow transition relative group text-base"
          style={{ minWidth: 'fit-content', maxWidth: '320px', overflow: 'hidden', position: 'relative', whiteSpace: 'nowrap' }}
          onMouseEnter={() => setIsButtonHovered(true)}
          onMouseLeave={() => setIsButtonHovered(false)}
        >
          <span className="btn-animated-yellow-bg absolute inset-0 rounded-lg pointer-events-none transition-transform duration-300 group-hover:scale-100 scale-0 z-0" aria-hidden="true"></span>
          <span className="relative flex items-center z-10 font-semibold">
            <motion.span
              className="inline-flex items-center"
              animate={isButtonHovered ? "dance" : "idle"}
              variants={{
                dance: {
                  rotate: [0, -20, 20, -20, 20, 0],
                  scale: [1, 1.2, 1.1, 1.2, 1],
                  transition: {
                    repeat: Infinity,
                    repeatType: 'loop',
                    duration: 1.2,
                    ease: 'easeInOut',
                  },
                },
                idle: {},
              }}
            >
              {/* Icône Ajouter (plus) */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </motion.span>
            {buttonText}
          </span>
        </Button>
      )}
    </div>
  )
}
