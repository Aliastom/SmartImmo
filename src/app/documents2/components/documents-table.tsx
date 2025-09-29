'use client';

import { Download, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatFileSize, formatDate } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface Document {
  id: string
  name: string
  file_path: string
  file_size: number
  mime_type: string
  uploaded_at: string
  property?: {
    name: string
  } | null
  type?: {
    name: string
    category?: {
      name: string
    }
  } | null
  type_id?: string | null
  property_id?: string | null
  metadata?: any
}

interface DocumentsTableProps {
  documents: Document[]
}

export default function DocumentsTable({ documents }: DocumentsTableProps) {
  const handleDownload = async (doc: Document) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}/download`)
      if (!response.ok) throw new Error('Erreur lors du téléchargement')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a') as HTMLAnchorElement
      link.href = url
      link.download = doc.name || 'document'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error)
      alert('Erreur lors du téléchargement du document')
    }
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '📄'
    if (mimeType.includes('image')) return '🖼️'
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊'
    return '📄'
  }

  return (
    <div className="overflow-x-auto">
      <TooltipProvider>
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead>Propriété</TableHead>
            <TableHead className="text-right">Taille</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                Aucun document trouvé
              </TableCell>
            </TableRow>
          ) : (
            documents.map((document) => (
              <TableRow key={document.id} className="hover:bg-muted/50">
                <TableCell>
                  <div className="text-xl">
                    {getFileIcon(document.mime_type)}
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  <div className="max-w-[200px] truncate" title={document.name}>
                    {document.name}
                  </div>
                </TableCell>
                <TableCell>{document.type?.name || '-'}</TableCell>
                <TableCell>{document.type?.category?.name || '-'}</TableCell>
                <TableCell>{document.property?.name || '-'}</TableCell>
                <TableCell className="text-right">
                  {formatFileSize(document.file_size)}
                </TableCell>
                <TableCell>
                  {formatDate(document.uploaded_at)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDownload(document)}
                        >
                          <Download className="h-4 w-4" />
                          <span className="sr-only">Télécharger</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Télécharger</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 p-0"
                          asChild
                        >
                          <a 
                            href={`/api/documents/${document.id}/view`} 
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Voir</span>
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Voir le document</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      </TooltipProvider>
    </div>
  )
}
