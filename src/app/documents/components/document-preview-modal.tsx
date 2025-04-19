'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { LoadingSpinner } from '@/components/ui/animated'

interface DocumentPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  document: {
    id: string
    name: string
    type: string
    file_path: string
    mime_type: string
  }
}

export function DocumentPreviewModal({ isOpen, onClose, document }: DocumentPreviewModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    const loadDocumentPreview = async () => {
      if (!isOpen || !document) return
      
      setIsLoading(true)
      try {
        // Récupérer l'URL publique temporaire du document
        const { data, error } = await supabase.storage
          .from('documents')
          .createSignedUrl(document.file_path, 60) // URL valide pendant 60 secondes

        if (error) throw error
        setPreviewUrl(data.signedUrl)
      } catch (error: any) {
        console.error('Error loading document preview:', error)
        toast({
          title: "Erreur de prévisualisation",
          description: error.message || "Impossible de prévisualiser le document",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadDocumentPreview()

    // Nettoyer l'URL à la fermeture
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
    }
  }, [isOpen, document, supabase, toast])

  const handleDownload = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path)

      if (error) throw error

      // Créer un lien de téléchargement
      const url = URL.createObjectURL(data)
      const a = window.document.createElement('a')
      a.href = url
      a.download = document.name
      window.document.body.appendChild(a)
      a.click()
      window.document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Téléchargement réussi",
        description: `Le document "${document.name}" a été téléchargé`
      })
    } catch (error: any) {
      console.error('Error downloading document:', error)
      toast({
        title: "Erreur de téléchargement",
        description: error.message || "Impossible de télécharger le document",
        variant: "destructive"
      })
    }
  }

  const renderPreview = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-96">
          <LoadingSpinner size={40} />
        </div>
      )
    }

    if (!previewUrl) {
      return (
        <div className="flex flex-col justify-center items-center h-96 text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>Impossible de prévisualiser ce document</p>
          <Button onClick={handleDownload} className="mt-4">
            Télécharger
          </Button>
        </div>
      )
    }

    // Prévisualisation selon le type de fichier
    if (document.mime_type.startsWith('image/')) {
      return (
        <div className="flex justify-center items-center p-4 max-h-[70vh] overflow-auto">
          <img 
            src={previewUrl} 
            alt={document.name} 
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )
    } else if (document.mime_type === 'application/pdf') {
      return (
        <iframe 
          src={`${previewUrl}#toolbar=0`} 
          className="w-full h-[70vh]" 
          title={document.name}
        />
      )
    } else if (
      document.mime_type === 'text/plain' || 
      document.mime_type === 'text/html' ||
      document.mime_type === 'text/csv'
    ) {
      return (
        <iframe 
          src={previewUrl} 
          className="w-full h-[70vh]" 
          title={document.name}
        />
      )
    } else {
      // Pour les autres types de fichiers, proposer le téléchargement
      return (
        <div className="flex flex-col justify-center items-center h-96 text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>Ce type de document ne peut pas être prévisualisé</p>
          <Button onClick={handleDownload} className="mt-4">
            Télécharger
          </Button>
        </div>
      )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <span className="truncate">{document.name}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-grow overflow-auto">
          {renderPreview()}
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t mt-4">
          <div className="text-sm text-gray-500">
            {document.mime_type}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
            <Button onClick={handleDownload} className="bg-black hover:bg-black/80 text-white">
              Télécharger
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
