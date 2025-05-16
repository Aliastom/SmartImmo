'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { CardContent } from '@/components/ui/card'

interface PropertyPhotoProps {
  propertyId: string
  propertyName?: string
  imageUrl?: string
  isUploading?: boolean
  onFileSelect: (file: File) => void
}

export function PropertyPhoto({
  propertyId,
  propertyName = '',
  imageUrl,
  isUploading = false,
  onFileSelect,
  refreshTrigger
}: PropertyPhotoProps & { refreshTrigger?: number }) {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0])
    }
  }

  const downloadImage = () => {
    if (imageUrl) {
      // Créer un lien temporaire
      const link = document.createElement('a')
      link.href = imageUrl
      link.download = `${propertyName || 'image'}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <>
      <input 
        type="file" 
        accept="image/*" 
        onChange={handleFileChange} 
        ref={fileInputRef} 
        className="hidden"
      />

      {/* Plus de header ni de boutons ici, seulement la photo et le bouton Agrandir */}
      <CardContent className="flex justify-center items-center h-[200px] bg-gray-100 rounded-md overflow-hidden">
        {imageUrl ? (
          <div 
            className="w-full h-full cursor-pointer relative group"
            onClick={() => setIsImageModalOpen(true)}
          >
            {isUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
              </div>
            )}
            <img 
              src={imageUrl ? imageUrl + (typeof refreshTrigger !== 'undefined' ? `?t=${refreshTrigger}` : `?t=${Date.now()}`) : ''}
              alt={propertyName || 'Image du bien'} 
              className="object-cover w-full h-full"
            />
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                variant="secondary" 
                size="sm" 
                className="bg-white bg-opacity-80 hover:bg-opacity-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Agrandir
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-400 w-full h-full flex flex-col items-center justify-center">
            {isUploading ? (
              <div className="text-gray-400">Chargement...</div>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0118.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p>Aucune photo disponible</p>
              </>
            )}
          </div>
        )}
      </CardContent>

      {/* Modal d'agrandissement d'image */}
      {imageUrl && (
        <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden">
            <div className="relative">
              <img 
                src={imageUrl ? imageUrl + (typeof refreshTrigger !== 'undefined' ? `?t=${refreshTrigger}` : `?t=${Date.now()}`) : ''}
                alt={propertyName || 'Image du bien'} 
                className="w-full h-auto"
              />
              <DialogClose className="absolute top-2 right-2 bg-white rounded-full p-1">
                <X className="h-6 w-6" />
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
