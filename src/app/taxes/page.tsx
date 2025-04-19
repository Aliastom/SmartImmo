'use client'

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import { TaxForm } from "./tax-form"

export default function TaxesPage() {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)

  // Générer les 5 dernières années + année courante
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i)

  return (
    <div className="flex-1 overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          <i className="fas fa-file-invoice-dollar mr-2 text-indigo-600"></i>
          Déclaration d'Impôts
        </h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Année fiscale :</span>
            <Select 
              value={selectedYear.toString()} 
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="icon">
            <i className="fas fa-question-circle text-gray-600"></i>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 overflow-y-auto h-[calc(100vh-4rem)]">
        <div className="max-w-5xl mx-auto">
          <Card className="p-6">
            <div className="mb-6">
              <div className="text-sm text-gray-500 mb-2">
                <i className="fas fa-info-circle mr-2"></i>
                Les données des transactions (loyers, charges, etc.) sont automatiquement récupérées.
                Complétez uniquement les informations additionnelles nécessaires.
              </div>
              <div className="text-sm text-gray-500">
                <i className="fas fa-exclamation-triangle mr-2 text-yellow-500"></i>
                Ces informations sont données à titre indicatif et ne remplacent pas une consultation avec un professionnel.
              </div>
            </div>

            <TaxForm year={selectedYear} />
          </Card>
        </div>
      </main>
    </div>
  )
}
