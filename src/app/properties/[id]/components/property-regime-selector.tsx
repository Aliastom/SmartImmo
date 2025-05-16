'use client'

import { useState, useEffect } from "react"
import { PropertyRegime } from "@/types/property-regimes"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PropertyRegimeDetails } from "./property-regime-details"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Database } from "@/types/database"

interface PropertyRegimeSelectorProps {
  selectedRegimeId: string | null
  onRegimeChange: (regimeId: string | null) => void
  className?: string
}

export function PropertyRegimeSelector({ 
  selectedRegimeId, 
  onRegimeChange,
  className = ""
}: PropertyRegimeSelectorProps) {
  const [regimes, setRegimes] = useState<PropertyRegime[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRegime, setSelectedRegime] = useState<PropertyRegime | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  
  const supabase = createClientComponentClient<Database>()
  
  // Charger tous les régimes fiscaux
  useEffect(() => {
    const fetchRegimes = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('property_regimes')
        .select('*')
        .order('name')
      
      if (error) {
        console.error('Erreur lors du chargement des régimes fiscaux:', error)
      } else if (data) {
        setRegimes(data)
        
        // Si un régime est déjà sélectionné, le trouver dans la liste
        if (selectedRegimeId) {
          const regime = data.find(r => r.id === selectedRegimeId)
          if (regime) {
            setSelectedRegime(regime)
          }
        }
      }
      setLoading(false)
    }
    
    fetchRegimes()
  }, [supabase, selectedRegimeId])
  
  const handleRegimeChange = (regimeId: string) => {
    if (regimeId === "null") {
      setSelectedRegime(null);
      onRegimeChange(null);
    } else {
      const regime = regimes.find(r => r.id === regimeId);
      setSelectedRegime(regime || null);
      onRegimeChange(regimeId);
    }
  }
  
  const handleShowDetails = () => {
    if (selectedRegime) {
      setIsDetailsOpen(true)
    }
  }
  
  return (
    <>
      <div className={`flex items-center space-x-2 ${className}`}>
        <Select
          value={selectedRegimeId || "null"}
          onValueChange={handleRegimeChange}
          disabled={loading}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sélectionner un régime fiscal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="null">Aucun régime sélectionné</SelectItem>
            {regimes.map((regime) => (
              <SelectItem key={regime.id} value={regime.id}>
                {regime.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedRegime && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleShowDetails}
            className="whitespace-nowrap"
            type="button"
          >
            Voir détails
          </Button>
        )}
      </div>
      
      {/* Modal de détails du régime */}
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
    </>
  )
}
