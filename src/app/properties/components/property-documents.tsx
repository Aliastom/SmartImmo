'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { LoadingSpinner } from '@/components/ui/animated'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import DocumentUploadModal from '@/app/documents/components/document-upload-modal'

interface PropertyDocumentsProps {
  propertyId: string
  refreshTrigger?: number
}

type Document = {
  id: string
  name: string
  type: string
  category: string
  file_path: string
  file_size: number
  mime_type: string
  uploaded_at: string
  description?: string
}

export function PropertyDocuments({ propertyId, refreshTrigger = 0 }: PropertyDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()

  const categoryLabels: Record<string, string> = {
    'all': 'Tous',
    'property': 'Propriété',
    'fiscal': 'Fiscalité',
    'insurance': 'Assurances',
    'rental': 'Location',
    'financial': 'Financier',
    'management': 'Gestion'
  }

  const typeIcons: Record<string, string> = {
    'pdf': '📄',
    'image': '🖼️',
    'document': '📝',
    'spreadsheet': '📊',
    'contract': '📜',
    'invoice': '🧾',
    'other': '📎'
  }

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setIsLoading(true)
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          toast({
            title: "Session expirée",
            description: "Veuillez vous reconnecter",
            variant: "destructive"
          })
          return
        }

        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('property_id', propertyId)
          .eq('user_id', session.user.id)
          .order('uploaded_at', { ascending: false })

        if (error) throw error

        setDocuments(data || [])
        setFilteredDocuments(data || [])
      } catch (error: any) {
        console.error('Error loading documents:', error)
        toast({
          title: "Erreur",
          description: error.message || "Impossible de charger les documents",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadDocuments()
  }, [propertyId, refreshTrigger, supabase, toast])

  useEffect(() => {
    let result = [...documents]
    
    // Filtrer par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(doc => 
        doc.name.toLowerCase().includes(query) || 
        (doc.description && doc.description.toLowerCase().includes(query))
      )
    }
    
    // Filtrer par catégorie
    if (selectedCategory !== 'all') {
      result = result.filter(doc => doc.category === selectedCategory)
    }
    
    setFilteredDocuments(result)
  }, [searchQuery, selectedCategory, documents])

  const handlePreview = (document: Document) => {
    setSelectedDocument(document)
    setIsPreviewModalOpen(true)
  }

  const handleDownload = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path)

      if (error) throw error

      // Créer un lien de téléchargement
      const url = URL.createObjectURL(data)
      const a = window.document.createElement('a')
      a.href = url
      
      // Assurer que le nom du fichier conserve son extension
      let downloadFilename = document.name
      
      // Si le nom n'a pas d'extension, extraire l'extension du chemin du fichier
      if (!downloadFilename.includes('.')) {
        const fileExtension = document.file_path.split('.').pop()
        if (fileExtension) {
          downloadFilename = `${downloadFilename}.${fileExtension}`
        }
      }
      
      a.download = downloadFilename
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

  const handleDeleteDocument = async (document: Document) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', document.id)

      if (error) throw error

      // Mettre à jour l'état local pour refléter la suppression
      setDocuments(prevDocuments => prevDocuments.filter(doc => doc.id !== document.id))
      setFilteredDocuments(prevDocuments => prevDocuments.filter(doc => doc.id !== document.id))

      toast({
        title: "Document supprimé",
        description: `Le document "${document.name}" a été supprimé`
      })
    } catch (error: any) {
      console.error('Error deleting document:', error)
      toast({
        title: "Erreur de suppression",
        description: error.message || "Impossible de supprimer le document",
        variant: "destructive"
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR')
  }

  const handleModalClose = (uploaded: boolean) => {
    setIsModalOpen(false)
    if (uploaded) {
      // Rafraîchir la liste des documents
      const loadDocuments = async () => {
        try {
          setIsLoading(true)
          const { data: { session } } = await supabase.auth.getSession()
          
          if (!session) return

          const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('property_id', propertyId)
            .eq('user_id', session.user.id)
            .order('uploaded_at', { ascending: false })

          if (error) throw error

          setDocuments(data || [])
        } catch (error) {
          console.error('Error reloading documents:', error)
        } finally {
          setIsLoading(false)
        }
      }

      loadDocuments()
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Documents</CardTitle>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button onClick={() => setIsModalOpen(true)} className="bg-black hover:bg-black/80 text-white">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 mr-2" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Ajouter un document
          </Button>
        </motion.div>
      </CardHeader>
      <CardContent>
        {/* Barre de recherche et filtres */}
        <div className="mb-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Rechercher un document..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white"
              >
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <div className="flex border rounded-md overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-gray-200' : 'bg-white'}`}
                  title="Vue en grille"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 ${viewMode === 'list' ? 'bg-gray-200' : 'bg-white'}`}
                  title="Vue en liste"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div>
              {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} trouvé{filteredDocuments.length !== 1 ? 's' : ''}
            </div>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-blue-600 hover:underline"
              >
                Effacer la recherche
              </button>
            )}
          </div>
        </div>
        {isLoading ? (
          <motion.div 
            className="text-center py-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LoadingSpinner size={40} />
          </motion.div>
        ) : filteredDocuments.length === 0 ? (
          <motion.div 
            className="text-center py-8 text-gray-500"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>Aucun document pour ce bien</p>
            <p className="text-sm mt-1">Ajoutez des documents pour les voir apparaître ici</p>
          </motion.div>
        ) : (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <AnimatePresence>
                {filteredDocuments.map((document) => (
                  <motion.div
                    key={document.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    layout
                  >
                    <Card className="h-full flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                      <div className="p-4 flex-grow">
                        <div className="flex items-start space-x-3">
                          <div className="text-3xl">
                            {typeIcons[document.type] || typeIcons.other}
                          </div>
                          <div className="flex-grow min-w-0">
                            <h3 className="font-medium text-sm truncate" title={document.name}>
                              {document.name}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatFileSize(document.file_size)} • {formatDate(document.uploaded_at)}
                            </p>
                            <div className="mt-2">
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                {categoryLabels[document.category] || document.category}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="border-t p-3 bg-gray-50 flex justify-between">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handlePreview(document)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDownload(document)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setDocumentToDelete(document)
                            setIsDeleteModalOpen(true)
                          }}
                          title="Supprimer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-3 text-sm font-medium text-gray-500">Nom</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-500">Catégorie</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-500">Taille</th>
                    <th className="text-left p-3 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-right p-3 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filteredDocuments.map((document) => (
                      <motion.tr
                        key={document.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="p-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-xl">{typeIcons[document.type] || typeIcons.other}</span>
                            <span className="font-medium text-sm">{document.name}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            {categoryLabels[document.category] || document.category}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-gray-600">{formatFileSize(document.file_size)}</td>
                        <td className="p-3 text-sm text-gray-600">{formatDate(document.uploaded_at)}</td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handlePreview(document)}
                              title="Prévisualiser"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDownload(document)}
                              title="Télécharger"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setDocumentToDelete(document)
                                setIsDeleteModalOpen(true)
                              }}
                              title="Supprimer"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Upload Modal */}
        <DocumentUploadModal 
          isOpen={isModalOpen}
          onClose={handleModalClose}
          properties={[]}
          initialPropertyId={propertyId}
          initialCategory="property"
        />

        {/* Delete Modal */}
        <Dialog
          open={isDeleteModalOpen}
          onOpenChange={setIsDeleteModalOpen}
        >
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Supprimer le document</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>Êtes-vous sûr de vouloir supprimer le document "{documentToDelete?.name}" ?</p>
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                Annuler
              </Button>
              <Button 
                onClick={() => {
                  handleDeleteDocument(documentToDelete!)
                  setIsDeleteModalOpen(false)
                }}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                Supprimer
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Preview Modal */}
        {selectedDocument && (
          <Dialog
            open={isPreviewModalOpen}
            onOpenChange={setIsPreviewModalOpen}
          >
            <DialogContent className="sm:max-w-[800px]">
              <DialogHeader>
                <DialogTitle>{selectedDocument.name}</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                {selectedDocument.mime_type.startsWith('image/') ? (
                  <div className="flex justify-center">
                    <img 
                      src={`/api/documents/${selectedDocument.id}`}
                      alt={selectedDocument.name}
                      className="max-w-full max-h-[500px] object-contain mx-auto"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>Prévisualisation non disponible</p>
                    <Button 
                      onClick={() => handleDownload(selectedDocument)}
                      className="mt-4 bg-black hover:bg-black/80 text-white"
                    >
                      Télécharger
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsPreviewModalOpen(false)}>
                  Fermer
                </Button>
                <Button 
                  onClick={() => handleDownload(selectedDocument)}
                  className="bg-black hover:bg-black/80 text-white"
                >
                  Télécharger
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  )
}
