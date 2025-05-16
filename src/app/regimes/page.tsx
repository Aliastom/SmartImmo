'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { PropertyRegime } from "@/types/property-regimes"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PropertyRegimeDetails } from "../properties/[id]/components/property-regime-details"
import { motion } from 'framer-motion'
import { AnimatedCard, LoadingSpinner, PageTransition } from '@/components/ui/animated'
import { Badge } from "@/components/ui/badge"
import { PageHeader } from '@/components/ui/page-header'

export default function RegimesPage() {
  const [regimes, setRegimes] = useState<PropertyRegime[]>([])
  const [filteredRegimes, setFilteredRegimes] = useState<PropertyRegime[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRegime, setSelectedRegime] = useState<PropertyRegime | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  
  const supabase = createClientComponentClient<Database>()
  
  useEffect(() => {
    const fetchRegimes = async () => {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('property_regimes')
        .select('*')
        .order('name')
      
      if (error) {
        console.error('Erreur lors du chargement des régimes fiscaux:', error)
      } else if (data) {
        setRegimes(data)
        setFilteredRegimes(data)
      }
      setIsLoading(false)
    }
    
    fetchRegimes()
  }, [supabase])
  
  // Filtrer les régimes en fonction de la recherche
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredRegimes(regimes)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = regimes.filter(regime => 
        regime.name.toLowerCase().includes(query) || 
        (regime.location_type && regime.location_type.toLowerCase().includes(query)) ||
        (regime.rental_type && regime.rental_type.toLowerCase().includes(query))
      )
      setFilteredRegimes(filtered)
    }
  }, [searchQuery, regimes])
  
  const handleViewDetails = (regime: PropertyRegime) => {
    setSelectedRegime(regime)
    setIsDetailsOpen(true)
  }
  
  return (
    <PageTransition className="min-h-screen flex flex-col gap-10 px-0 md:px-0">
      <PageHeader
        title="Régimes Fiscaux Immobiliers"
        buttonText="Ajouter un régime"
        buttonIcon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-2 btn-add-icon"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        }
        onButtonClick={() => {/* Ajoute ici la logique d'ajout */}}
        className="mb-6 mt-2 px-0"
      />
      <div className="space-y-8">
        {/* Description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="bg-blue-50 p-4 rounded-md border border-blue-100"
        >
          <p className="text-blue-800">
            Cette page présente les différents régimes fiscaux immobiliers disponibles en France. 
            Chaque régime a ses propres caractéristiques, avantages et inconvénients. 
            Cliquez sur un régime pour voir ses détails complets.
          </p>
        </motion.div>

        {/* Régimes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <LoadingSpinner size={50} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRegimes.map((regime, index) => (
                <AnimatedCard 
                  key={regime.id} 
                  className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  delay={0.1 * (index % 6)}
                  onClick={() => handleViewDetails(regime)}
                >
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold mb-2">{regime.name}</h3>
                    
                    <div className="space-y-2 mb-4">
                      {regime.location_type && (
                        <div className="flex items-center text-sm">
                          <span className="text-gray-500 mr-2">Type de bien:</span>
                          <span>{regime.location_type}</span>
                        </div>
                      )}
                      
                      {regime.rental_type && (
                        <div className="flex items-center text-sm">
                          <span className="text-gray-500 mr-2">Type de location:</span>
                          <span>{regime.rental_type}</span>
                        </div>
                      )}
                      
                      {regime.accounting_type && (
                        <div className="flex items-center text-sm">
                          <span className="text-gray-500 mr-2">Comptabilité:</span>
                          <span>{regime.accounting_type}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {regime.real_expenses_deduction && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Charges réelles
                        </Badge>
                      )}
                      
                      {regime.property_amortization && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Amortissement
                        </Badge>
                      )}
                      
                      {regime.flat_deduction === 'Oui' && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Abattement
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </AnimatedCard>
              ))}
            </div>
          )}
          
          {!isLoading && filteredRegimes.length === 0 && (
            <div className="text-center py-10">
              <p className="text-gray-500">Aucun régime fiscal ne correspond à votre recherche.</p>
            </div>
          )}
        </motion.div>
      </div>
      
      {/* Modal de détails */}
      {selectedRegime && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Détails du régime fiscal : {selectedRegime.name}</DialogTitle>
            </DialogHeader>
            <PropertyRegimeDetails regime={selectedRegime} />
          </DialogContent>
        </Dialog>
      )}
    </PageTransition>
  )
}
