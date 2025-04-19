'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { motion } from 'framer-motion'
import { PageTransition, AnimatedCard, LoadingSpinner } from '@/components/ui/animated'
import { DocumentList } from './components/document-list'
import DocumentUploadModal from './components/document-upload-modal'

export default function DocumentsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [properties, setProperties] = useState<any[]>([])
  const [selectedProperty, setSelectedProperty] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()

  // Catégories de documents
  const documentCategories = [
    { id: 'property', name: 'Propriété' },
    { id: 'fiscal', name: 'Fiscalité' },
    { id: 'insurance', name: 'Assurances' },
    { id: 'rental', name: 'Location' },
    { id: 'financial', name: 'Financier' },
    { id: 'management', name: 'Gestion' }
  ]

  useEffect(() => {
    const fetchProperties = async () => {
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

        const { data, error } = await supabase
          .from('properties')
          .select('id, name')
          .eq('user_id', session.user.id)
          .order('name')

        if (error) throw error
        setProperties(data || [])
      } catch (error: any) {
        console.error('Error fetching properties:', error)
        toast({
          title: "Erreur",
          description: error.message || "Impossible de charger les propriétés",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchProperties()
  }, [supabase, toast])

  const handleModalClose = (uploaded: boolean) => {
    setIsModalOpen(false)
    if (uploaded) {
      setRefreshTrigger(prev => prev + 1)
    }
  }

  return (
    <PageTransition className="container py-10">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <motion.h1 
            className="text-3xl font-bold text-gray-800"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Gestion des Documents
          </motion.h1>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="bg-black hover:bg-black/80 text-white"
            >
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
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Input
                    placeholder="Rechercher un document..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Select
                    value={selectedProperty}
                    onValueChange={setSelectedProperty}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrer par bien" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les biens</SelectItem>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrer par catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les catégories</SelectItem>
                      {documentCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Document List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          <AnimatedCard delay={0.4}>
            <CardContent className="p-0">
              <Tabs defaultValue="list" className="w-full">
                <div className="flex justify-between items-center p-4 border-b">
                  <h3 className="text-lg font-medium">Documents</h3>
                  <TabsList>
                    <TabsTrigger value="grid">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    </TabsTrigger>
                    <TabsTrigger value="list">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="grid" className="p-4">
                  <DocumentList 
                    view="grid"
                    propertyId={selectedProperty === 'all' ? undefined : selectedProperty}
                    category={selectedCategory === 'all' ? undefined : selectedCategory}
                    searchQuery={searchQuery}
                    refreshTrigger={refreshTrigger}
                  />
                </TabsContent>

                <TabsContent value="list" className="p-4">
                  <DocumentList 
                    view="list"
                    propertyId={selectedProperty === 'all' ? undefined : selectedProperty}
                    category={selectedCategory === 'all' ? undefined : selectedCategory}
                    searchQuery={searchQuery}
                    refreshTrigger={refreshTrigger}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </AnimatedCard>
        </motion.div>
      </div>

      {/* Upload Modal */}
      <DocumentUploadModal 
        isOpen={isModalOpen}
        onClose={handleModalClose}
        properties={properties}
      />
    </PageTransition>
  )
}
