'use client'

import { useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { motion } from 'framer-motion'
import { LoadingSpinner } from '@/components/ui/animated'
import { v4 as uuidv4 } from 'uuid'

interface DocumentUploadModalProps {
  isOpen: boolean
  onClose: (uploaded: boolean) => void
  properties: any[]
  tenantId?: string
  loanId?: string
  initialPropertyId?: string
  initialCategory?: string
  propertyName?: string
}

const DocumentUploadModal = ({ 
  isOpen, 
  onClose, 
  properties,
  tenantId,
  loanId,
  initialPropertyId,
  initialCategory,
  propertyName
}: DocumentUploadModalProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const [documentName, setDocumentName] = useState('')
  const [documentType, setDocumentType] = useState('document')
  const [documentCategory, setDocumentCategory] = useState(initialCategory || 'property')
  const [propertyId, setPropertyId] = useState(initialPropertyId || '')
  const [expirationDate, setExpirationDate] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()

  // Types de documents
  const documentTypes = [
    { id: 'document', name: 'Document' },
    { id: 'contract', name: 'Contrat' },
    { id: 'invoice', name: 'Facture' },
    { id: 'image', name: 'Image' },
    { id: 'pdf', name: 'PDF' },
    { id: 'spreadsheet', name: 'Tableur' },
    { id: 'other', name: 'Autre' }
  ]

  // Catégories de documents
  const documentCategories = [
    { id: 'property', name: 'Propriété', types: ['acte_propriete', 'photos', 'plans', 'diagnostics'] },
    { id: 'fiscal', name: 'Fiscalité', types: ['taxe_fonciere', 'taxe_habitation', 'avis_imposition'] },
    { id: 'insurance', name: 'Assurances', types: ['assurance_habitation', 'assurance_pno', 'garantie_loyers'] },
    { id: 'rental', name: 'Location', types: ['bail', 'etat_lieux', 'quittances', 'correspondance'] },
    { id: 'financial', name: 'Financier', types: ['contrat_pret', 'echeancier', 'amortissement'] },
    { id: 'management', name: 'Gestion', types: ['contrat_gestion', 'rapports', 'factures'] }
  ]

  // Sous-types de documents en fonction de la catégorie
  const getDocumentSubtypes = () => {
    const category = documentCategories.find(cat => cat.id === documentCategory)
    if (!category) return []
    
    return category.types.map(type => ({
      id: type,
      name: type
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }))
  }

  const documentSubtypes = getDocumentSubtypes()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setSelectedFile(file)
    
    // Auto-fill document name with file name (without extension)
    if (file && !documentName) {
      const fileName = file.name.split('.').slice(0, -1).join('.')
      setDocumentName(fileName)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedFile) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    setUploadProgress(0)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast({
          title: "Session expirée",
          description: "Veuillez vous reconnecter",
          variant: "destructive"
        })
        return
      }

      // Générer un chemin unique pour le fichier
      const originalFileName = selectedFile.name;
      const fileExtension = originalFileName.split('.').pop() || '';
      const fileName = `${uuidv4()}.${fileExtension}`;
      const filePath = `${session.user.id}/${propertyId || 'general'}/${fileName}`;
      
      // Conserver le nom original avec l'extension pour l'affichage et le téléchargement
      const displayName = documentName || originalFileName.split('.')[0];
      const fullDisplayName = `${displayName}.${fileExtension}`;

      // Upload du fichier
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Créer l'enregistrement dans la base de données
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: session.user.id,
          property_id: propertyId || null,
          tenant_id: tenantId || null,
          loan_id: loanId || null,
          name: fullDisplayName,
          type: documentType,
          category: documentCategory,
          file_path: filePath,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          expiration_date: expirationDate || null,
          metadata: {
            original_filename: originalFileName
          }
        })

      if (dbError) throw dbError

      toast({
        title: "Document ajouté",
        description: "Le document a été ajouté avec succès"
      })

      // Réinitialiser le formulaire
      setDocumentName('')
      setDocumentType('document')
      setDocumentCategory(initialCategory || 'property')
      setPropertyId(initialPropertyId || '')
      setExpirationDate('')
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      onClose(true)
    } catch (error: any) {
      console.error('Error uploading document:', error)
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter le document",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
      setUploadProgress(0)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isLoading && onClose(false)}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ajouter un document{propertyName ? ` pour le bien : ${propertyName}` : ''}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <Label htmlFor="file" className="text-sm font-medium">Fichier</Label>
            <Input
              id="file"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="h-10"
              required
              disabled={isLoading}
            />
          </div>
          
          <div>
            <Label htmlFor="name" className="text-sm font-medium">Nom du document</Label>
            <Input
              id="name"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              className="h-10"
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category" className="text-sm font-medium">Catégorie</Label>
              <select
                id="category"
                value={documentCategory}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'property') {
                    setDocumentType('acte_propriete')
                  } else if (value === 'fiscal') {
                    setDocumentType('taxe_fonciere')
                  } else if (value === 'insurance') {
                    setDocumentType('assurance_habitation')
                  } else if (value === 'rental') {
                    setDocumentType('bail')
                  } else if (value === 'financial') {
                    setDocumentType('contrat_pret')
                  } else if (value === 'management') {
                    setDocumentType('contrat_gestion')
                  }
                  setDocumentCategory(value)
                }}
                disabled={isLoading}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
              >
                {documentCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <Label htmlFor="type" className="text-sm font-medium">Type</Label>
              <select
                id="type"
                value={documentType}
                onChange={(e) => {
                  const value = e.target.value;
                  setDocumentType(value)
                }}
                disabled={isLoading}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
              >
                {documentSubtypes.length > 0 ? (
                  documentSubtypes.map((subtype) => (
                    <option key={subtype.id} value={subtype.id}>
                      {subtype.name}
                    </option>
                  ))
                ) : (
                  documentTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
          
          {!initialPropertyId && (
            <div>
              <Label htmlFor="property" className="text-sm font-medium">Bien associé</Label>
              <select
                id="property"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                disabled={isLoading || !!initialPropertyId}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="">Aucun bien spécifique</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div>
            <Label htmlFor="expiration" className="text-sm font-medium">Date d'expiration (optionnel)</Label>
            <Input
              id="expiration"
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className="h-10"
              disabled={isLoading}
            />
          </div>
          
          {isLoading && uploadProgress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
              <p className="text-xs text-gray-500 mt-1 text-right">{uploadProgress}%</p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onClose(false)}
                disabled={isLoading}
              >
                Annuler
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                type="submit"
                className="bg-black hover:bg-black/80 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size={16} className="mr-2" />
                    Chargement...
                  </>
                ) : (
                  "Ajouter"
                )}
              </Button>
            </motion.div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default DocumentUploadModal
