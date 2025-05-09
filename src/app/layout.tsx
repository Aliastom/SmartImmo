import { Inter } from 'next/font/google'
import './globals.css'
import ClientLayout from './client-layout.tsx'
import Script from 'next/script';
import GlobalLoader from "@/components/ui/global-loader";

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'SmartImmo - Gestion Immobilière Intelligente',
  description: 'Application de gestion immobilière intelligente',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Corrige : retire l'import useEffect qui n'a plus lieu d'être dans un composant server
  // (il a été déplacé dans DevWatermarkRemover côté client)
  // import { useEffect } from 'react'
  return (
    <html lang="fr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Google Maps API supprimée car non utilisée */}
      </head>
      <body className={inter.className}>
        <ClientLayout>
          <GlobalLoader />
          {/* <DevWatermarkRemover /> */}
          {children}
        </ClientLayout>
      </body>
    </html>
  )
}
