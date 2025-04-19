'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { motion, AnimatePresence } from 'framer-motion'
import { LoadingSpinner } from '@/components/ui/animated'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface DocumentListProps {
  view: 'grid' | 'list'
  propertyId?: string
  category?: string
  searchQuery?: string
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
  expiration_date: string | null
  property?: {
    id: string
    name: string
  }
}

export function DocumentList({ view, propertyId, category, searchQuery = '', refreshTrigger = 0 }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()

  const categoryLabels: Record<string, string> = {
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
    const fetchDocuments = async () => {
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

        let query = supabase
          .from('documents')
          .select(`
            *,
            property:property_id (
              id,
              name
            )
          `)
          .eq('user_id', session.user.id)
          .order('uploaded_at', { ascending: false })

        if (propertyId) {
          query = query.eq('property_id', propertyId)
        }

        if (category) {
          query = query.eq('category', category)
        }

        if (searchQuery) {
          query = query.ilike('name', `%${searchQuery}%`)
        }

        const { data, error } = await query

        if (error) throw error
        setDocuments(data || [])
      } catch (error: any) {
        console.error('Error fetching documents:', error)
        toast({
          title: "Erreur",
          description: error.message || "Impossible de charger les documents",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDocuments()
  }, [supabase, toast, propertyId, category, searchQuery, refreshTrigger])

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

  const confirmDelete = (documentId: string) => {
    setDocumentToDelete(documentId)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!documentToDelete) return

    try {
      const documentToRemove = documents.find(doc => doc.id === documentToDelete)
      
      if (!documentToRemove) {
        throw new Error("Document introuvable")
      }

      // Supprimer le fichier du stockage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([documentToRemove.file_path])

      if (storageError) throw storageError

      // Supprimer l'enregistrement de la base de données
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentToDelete)

      if (dbError) throw dbError

      // Mettre à jour la liste des documents
      setDocuments(documents.filter(doc => doc.id !== documentToDelete))

      toast({
        title: "Document supprimé",
        description: "Le document a été supprimé avec succès"
      })
    } catch (error: any) {
      console.error('Error deleting document:', error)
      toast({
        title: "Erreur de suppression",
        description: error.message || "Impossible de supprimer le document",
        variant: "destructive"
      })
    } finally {
      setDocumentToDelete(null)
      setIsDeleteDialogOpen(false)
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size={40} />
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <motion.div 
        className="text-center py-12 text-gray-500"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-lg">Aucun document trouvé</p>
        <p className="text-sm mt-1">Ajoutez des documents pour les voir apparaître ici</p>
      </motion.div>
    )
  }

  return (
    <>
      {view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence>
            {documents.map((document) => (
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
                        {document.property && (
                          <p className="text-xs text-gray-500 mt-2 truncate">
                            Bien: {document.property.name}
                          </p>
                        )}
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
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      onClick={() => confirmDelete(document.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Bien</TableHead>
              <TableHead>Taille</TableHead>
              <TableHead>Date d'ajout</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {documents.map((document) => (
                <motion.tr
                  key={document.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="border-b transition-colors hover:bg-gray-50"
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">
                        {typeIcons[document.type] || typeIcons.other}
                      </span>
                      <span className="truncate max-w-[200px]" title={document.name}>
                        {document.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      {categoryLabels[document.category] || document.category}
                    </span>
                  </TableCell>
                  <TableCell>
                    {document.property ? document.property.name : '-'}
                  </TableCell>
                  <TableCell>{formatFileSize(document.file_size)}</TableCell>
                  <TableCell>{formatDate(document.uploaded_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-1">
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
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        onClick={() => confirmDelete(document.id)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    </>
  )
}
