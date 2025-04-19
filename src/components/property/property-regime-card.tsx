'use client'

import { useEffect, useState } from "react"
import { PropertyRegime } from "@/types/property-regimes"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PropertyRegimeDetails } from "./property-regime-details"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Database } from "@/types/database"
import { AnimatedCard, LoadingSpinner } from "@/components/ui/animated"
import { Badge } from "@/components/ui/badge"

interface PropertyRegimeCardProps {
  propertyRegimeId: string | null
}

export function PropertyRegimeCard({ propertyRegimeId }: PropertyRegimeCardProps) {
  const [regime, setRegime] = useState<PropertyRegime | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  
  const supabase = createClientComponentClient<Database>()
  
  useEffect(() => {
    const fetchRegime = async () => {
      if (!propertyRegimeId) {
        setLoading(false)
        return
      }
      
      setLoading(true)
      const { data, error } = await supabase
        .from('property_regimes')
        .select('*')
        .eq('id', propertyRegimeId)
        .single()
      
      if (error) {
        console.error('Erreur lors du chargement du régime fiscal:', error)
      } else if (data) {
        setRegime(data)
      }
      
      setLoading(false)
    }
    
    fetchRegime()
  }, [propertyRegimeId, supabase])
  
  if (loading) {
    return (
      <AnimatedCard className="mb-6">
        <CardContent className="p-6 flex justify-center items-center">
          <LoadingSpinner size={30} />
        </CardContent>
      </AnimatedCard>
    )
  }
  
  if (!regime) {
    return (
      <AnimatedCard className="mb-6">
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-gray-500">Aucun régime fiscal sélectionné</p>
            <p className="text-sm text-gray-400 mt-2">
              Vous pouvez sélectionner un régime fiscal dans les paramètres de la propriété
            </p>
          </div>
        </CardContent>
      </AnimatedCard>
    )
  }
  
  return (
    <>
      <AnimatedCard className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl flex items-center justify-between">
            <span>Régime Fiscal</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsDetailsOpen(true)}
              className="ml-auto"
            >
              Voir détails
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="bg-gray-100 text-gray-600 uppercase text-xs font-medium p-3 w-1/3">
                    Régime
                  </td>
                  <td className="p-3 font-medium">
                    {regime.name}
                  </td>
                </tr>
                
                {regime.location_type && (
                  <tr>
                    <td className="bg-gray-100 text-gray-600 uppercase text-xs font-medium p-3">
                      Type de bien
                    </td>
                    <td className="p-3">
                      {regime.location_type}
                    </td>
                  </tr>
                )}
                
                {regime.rental_type && (
                  <tr>
                    <td className="bg-gray-100 text-gray-600 uppercase text-xs font-medium p-3">
                      Type de location
                    </td>
                    <td className="p-3">
                      {regime.rental_type}
                    </td>
                  </tr>
                )}
                
                <tr>
                  <td className="bg-gray-100 text-gray-600 uppercase text-xs font-medium p-3">
                    Caractéristiques
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {regime.real_expenses_deduction && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Charges réelles déductibles
                        </Badge>
                      )}
                      
                      {regime.property_amortization && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Amortissement du bien
                        </Badge>
                      )}
                      
                      {regime.flat_deduction && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Abattement forfaitaire: {regime.flat_deduction}
                        </Badge>
                      )}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </AnimatedCard>
      
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails du régime fiscal : {regime.name}</DialogTitle>
          </DialogHeader>
          <PropertyRegimeDetails regime={regime} />
        </DialogContent>
      </Dialog>
    </>
  )
}
