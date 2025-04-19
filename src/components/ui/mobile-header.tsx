'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

export function MobileHeader() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) return null
  
  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-white shadow-sm flex justify-center items-center z-50 px-4" style={{ marginTop: '0px' }}>
      <Image 
        src="/images/logo.png" 
        alt="SmartImmo Logo" 
        width={100} 
        height={30} 
        priority
      />
    </div>
  )
}
