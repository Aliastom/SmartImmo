'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { FinancialData } from './types'
import { formatCurrency } from '@/lib/utils'

interface TaxSimulationProps {
  financialData: FinancialData
}

export function TaxSimulation({ financialData }: TaxSimulationProps) {
  const [selectedSituation, setSelectedSituation] = useState<'single' | 'married' | 'pacs'>('single')
  
  // Calcul du micro-foncier (abattement forfaitaire de 30%)
  const microFoncierCalculation = () => {
    const rentalIncome = financialData.projectedRentalIncome
    const abattement = rentalIncome * 0.3
    const taxableIncome = rentalIncome - abattement
    const socialTax = taxableIncome * 0.172 // 17.2% de prélèvements sociaux
    
    // Taux d'imposition estimé en fonction de la situation fiscale
    let taxRate = 0.11 // Taux par défaut pour célibataire
    if (selectedSituation === 'married' || selectedSituation === 'pacs') {
      taxRate = 0.09 // Taux réduit pour couple
    }
    
    const incomeTax = taxableIncome * taxRate
    const totalTax = incomeTax + socialTax
    
    return {
      rentalIncome,
      abattement,
      taxableIncome,
      socialTax,
      incomeTax,
      totalTax,
      effectiveRate: (totalTax / rentalIncome) * 100
    }
  }
  
  // Calcul du régime réel
  const regimeReelCalculation = () => {
    const rentalIncome = financialData.projectedRentalIncome
    
    // Total des charges déductibles
    const charges = 
      financialData.projectedPropertyTax + 
      financialData.projectedInsurance + 
      financialData.projectedMaintenance + 
      financialData.projectedManagementFees + 
      financialData.projectedLoanInterest
    
    const taxableIncome = Math.max(0, rentalIncome - charges)
    const socialTax = taxableIncome * 0.172 // 17.2% de prélèvements sociaux
    
    // Taux d'imposition estimé en fonction de la situation fiscale
    let taxRate = 0.11 // Taux par défaut pour célibataire
    if (selectedSituation === 'married' || selectedSituation === 'pacs') {
      taxRate = 0.09 // Taux réduit pour couple
    }
    
    const incomeTax = taxableIncome * taxRate
    const totalTax = incomeTax + socialTax
    
    return {
      rentalIncome,
      charges,
      taxableIncome,
      socialTax,
      incomeTax,
      totalTax,
      effectiveRate: rentalIncome > 0 ? (totalTax / rentalIncome) * 100 : 0
    }
  }
  
  // Calculs pour les deux régimes
  const microFoncier = microFoncierCalculation()
  const regimeReel = regimeReelCalculation()
  
  // Déterminer le régime le plus avantageux
  const isMicroFoncierBetter = microFoncier.totalTax < regimeReel.totalTax
  const difference = Math.abs(microFoncier.totalTax - regimeReel.totalTax)
  
  // Traduire la situation fiscale
  const situationLabels = {
    single: 'Célibataire',
    married: 'Marié(e)',
    pacs: 'Pacsé(e)'
  }

  return (
    <Card className="shadow-sm border-0">
      <CardHeader className="bg-white rounded-t-lg">
        <CardTitle>Simulation des régimes fiscaux</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-6">
          <Label htmlFor="situation">Situation familiale</Label>
          <Select 
            value={selectedSituation} 
            onValueChange={(value) => setSelectedSituation(value as 'single' | 'married' | 'pacs')}
          >
            <SelectTrigger id="situation" className="w-full">
              <SelectValue placeholder="Sélectionnez votre situation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Célibataire</SelectItem>
              <SelectItem value="married">Marié(e)</SelectItem>
              <SelectItem value="pacs">Pacsé(e)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Tabs defaultValue="comparison" className="w-full">
          <TabsList className="grid w-full grid-cols-3 px-6 mb-4">
            <TabsTrigger value="comparison">Comparaison</TabsTrigger>
            <TabsTrigger value="micro">Micro-foncier</TabsTrigger>
            <TabsTrigger value="reel">Régime réel</TabsTrigger>
          </TabsList>
          
          <TabsContent value="comparison" className="px-6 pb-6">
            <div className="bg-blue-50 p-4 rounded-md mb-4">
              <h3 className="font-semibold text-blue-800">Régime recommandé : {isMicroFoncierBetter ? 'Micro-foncier' : 'Régime réel'}</h3>
              <p className="text-blue-700">
                Pour votre situation ({situationLabels[selectedSituation]}), le régime {isMicroFoncierBetter ? 'micro-foncier' : 'réel'} est plus avantageux 
                et vous permet d'économiser environ {formatCurrency(difference)}.
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Critère</TableHead>
                    <TableHead>Micro-foncier</TableHead>
                    <TableHead>Régime réel</TableHead>
                    <TableHead>Différence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Revenus bruts</TableCell>
                    <TableCell>{formatCurrency(microFoncier.rentalIncome)}</TableCell>
                    <TableCell>{formatCurrency(regimeReel.rentalIncome)}</TableCell>
                    <TableCell>-</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Charges déductibles</TableCell>
                    <TableCell>{formatCurrency(microFoncier.abattement)} (30% forfaitaire)</TableCell>
                    <TableCell>{formatCurrency(regimeReel.charges)} (réelles)</TableCell>
                    <TableCell className={regimeReel.charges > microFoncier.abattement ? "text-green-600" : "text-red-600"}>
                      {formatCurrency(regimeReel.charges - microFoncier.abattement)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Revenus imposables</TableCell>
                    <TableCell>{formatCurrency(microFoncier.taxableIncome)}</TableCell>
                    <TableCell>{formatCurrency(regimeReel.taxableIncome)}</TableCell>
                    <TableCell className={microFoncier.taxableIncome > regimeReel.taxableIncome ? "text-red-600" : "text-green-600"}>
                      {formatCurrency(regimeReel.taxableIncome - microFoncier.taxableIncome)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Impôt sur le revenu</TableCell>
                    <TableCell>{formatCurrency(microFoncier.incomeTax)}</TableCell>
                    <TableCell>{formatCurrency(regimeReel.incomeTax)}</TableCell>
                    <TableCell className={microFoncier.incomeTax > regimeReel.incomeTax ? "text-red-600" : "text-green-600"}>
                      {formatCurrency(regimeReel.incomeTax - microFoncier.incomeTax)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Prélèvements sociaux</TableCell>
                    <TableCell>{formatCurrency(microFoncier.socialTax)}</TableCell>
                    <TableCell>{formatCurrency(regimeReel.socialTax)}</TableCell>
                    <TableCell className={microFoncier.socialTax > regimeReel.socialTax ? "text-red-600" : "text-green-600"}>
                      {formatCurrency(regimeReel.socialTax - microFoncier.socialTax)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-semibold">
                    <TableCell>Total des impôts</TableCell>
                    <TableCell>{formatCurrency(microFoncier.totalTax)}</TableCell>
                    <TableCell>{formatCurrency(regimeReel.totalTax)}</TableCell>
                    <TableCell className={microFoncier.totalTax > regimeReel.totalTax ? "text-red-600" : "text-green-600"}>
                      {formatCurrency(regimeReel.totalTax - microFoncier.totalTax)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Taux effectif d'imposition</TableCell>
                    <TableCell>{microFoncier.effectiveRate.toFixed(2)}%</TableCell>
                    <TableCell>{regimeReel.effectiveRate.toFixed(2)}%</TableCell>
                    <TableCell className={microFoncier.effectiveRate > regimeReel.effectiveRate ? "text-red-600" : "text-green-600"}>
                      {(regimeReel.effectiveRate - microFoncier.effectiveRate).toFixed(2)}%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="micro" className="px-6 pb-6">
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="font-semibold mb-2">Régime micro-foncier</h3>
                <p>Le régime micro-foncier permet de bénéficier d'un abattement forfaitaire de 30% sur vos revenus locatifs bruts, sans avoir à justifier de vos charges réelles.</p>
                <p className="mt-2">Ce régime est généralement avantageux si vos charges réelles sont inférieures à 30% de vos revenus locatifs.</p>
              </div>
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Élément</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Revenus locatifs bruts</TableCell>
                      <TableCell className="text-right">{formatCurrency(microFoncier.rentalIncome)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Abattement forfaitaire (30%)</TableCell>
                      <TableCell className="text-right">- {formatCurrency(microFoncier.abattement)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Revenus imposables</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(microFoncier.taxableIncome)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Impôt sur le revenu estimé</TableCell>
                      <TableCell className="text-right">{formatCurrency(microFoncier.incomeTax)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Prélèvements sociaux (17,2%)</TableCell>
                      <TableCell className="text-right">{formatCurrency(microFoncier.socialTax)}</TableCell>
                    </TableRow>
                    <TableRow className="font-semibold">
                      <TableCell>Total des impôts</TableCell>
                      <TableCell className="text-right">{formatCurrency(microFoncier.totalTax)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Taux effectif d'imposition</TableCell>
                      <TableCell className="text-right">{microFoncier.effectiveRate.toFixed(2)}%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="reel" className="px-6 pb-6">
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="font-semibold mb-2">Régime réel</h3>
                <p>Le régime réel vous permet de déduire l'ensemble de vos charges réelles (taxe foncière, assurance, travaux, intérêts d'emprunt, etc.) de vos revenus locatifs.</p>
                <p className="mt-2">Ce régime est généralement avantageux si vos charges réelles dépassent 30% de vos revenus locatifs.</p>
              </div>
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Élément</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Revenus locatifs bruts</TableCell>
                      <TableCell className="text-right">{formatCurrency(regimeReel.rentalIncome)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Taxe foncière</TableCell>
                      <TableCell className="text-right">- {formatCurrency(financialData.projectedPropertyTax)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Assurance</TableCell>
                      <TableCell className="text-right">- {formatCurrency(financialData.projectedInsurance)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Travaux d'entretien</TableCell>
                      <TableCell className="text-right">- {formatCurrency(financialData.projectedMaintenance)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Frais de gestion</TableCell>
                      <TableCell className="text-right">- {formatCurrency(financialData.projectedManagementFees)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Intérêts d'emprunt</TableCell>
                      <TableCell className="text-right">- {formatCurrency(financialData.projectedLoanInterest)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Total des charges</TableCell>
                      <TableCell className="text-right font-medium">- {formatCurrency(regimeReel.charges)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Revenus imposables</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(regimeReel.taxableIncome)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Impôt sur le revenu estimé</TableCell>
                      <TableCell className="text-right">{formatCurrency(regimeReel.incomeTax)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Prélèvements sociaux (17,2%)</TableCell>
                      <TableCell className="text-right">{formatCurrency(regimeReel.socialTax)}</TableCell>
                    </TableRow>
                    <TableRow className="font-semibold">
                      <TableCell>Total des impôts</TableCell>
                      <TableCell className="text-right">{formatCurrency(regimeReel.totalTax)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Taux effectif d'imposition</TableCell>
                      <TableCell className="text-right">{regimeReel.effectiveRate.toFixed(2)}%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
