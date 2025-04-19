'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'

interface FamilyStatusFormProps {
  userData: {
    marital_status: 'single' | 'married' | 'pacs' | 'divorced' | 'widowed'
    children: number
    tax_situation: 'single' | 'couple' | 'family'
  }
  onSubmit: (data: {
    marital_status: 'single' | 'married' | 'pacs' | 'divorced' | 'widowed'
    children: number
    tax_situation: 'single' | 'couple' | 'family'
  }) => void
  isLoading: boolean
}

export function FamilyStatusForm({ userData, onSubmit, isLoading }: FamilyStatusFormProps) {
  const [formData, setFormData] = useState({
    marital_status: userData.marital_status,
    children: userData.children,
    tax_situation: userData.tax_situation
  })

  const handleMaritalStatusChange = (value: 'single' | 'married' | 'pacs' | 'divorced' | 'widowed') => {
    let newTaxSituation = formData.tax_situation
    
    // Mettre à jour automatiquement la situation fiscale en fonction du statut marital
    if (value === 'married' || value === 'pacs') {
      newTaxSituation = formData.children > 0 ? 'family' : 'couple'
    } else {
      newTaxSituation = formData.children > 0 ? 'family' : 'single'
    }
    
    setFormData(prev => ({
      ...prev,
      marital_status: value,
      tax_situation: newTaxSituation
    }))
  }

  const handleChildrenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const childrenCount = parseInt(e.target.value) || 0
    let newTaxSituation = formData.tax_situation
    
    // Mettre à jour automatiquement la situation fiscale en fonction du nombre d'enfants
    if (childrenCount > 0) {
      newTaxSituation = 'family'
    } else {
      newTaxSituation = (formData.marital_status === 'married' || formData.marital_status === 'pacs') ? 'couple' : 'single'
    }
    
    setFormData(prev => ({
      ...prev,
      children: childrenCount,
      tax_situation: newTaxSituation
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          Ces informations seront utilisées pour le calcul de vos impôts et l'optimisation fiscale.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="marital_status">Situation maritale</Label>
          <Select 
            value={formData.marital_status} 
            onValueChange={(value) => handleMaritalStatusChange(value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez votre situation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Célibataire</SelectItem>
              <SelectItem value="married">Marié(e)</SelectItem>
              <SelectItem value="pacs">Pacsé(e)</SelectItem>
              <SelectItem value="divorced">Divorcé(e)</SelectItem>
              <SelectItem value="widowed">Veuf/Veuve</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="children">Nombre d'enfants à charge</Label>
          <Input
            id="children"
            name="children"
            type="number"
            min="0"
            max="20"
            value={formData.children}
            onChange={handleChildrenChange}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tax_situation">Situation fiscale</Label>
        <Select 
          value={formData.tax_situation} 
          onValueChange={(value) => setFormData(prev => ({ ...prev, tax_situation: value as any }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionnez votre situation fiscale" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="single">Célibataire</SelectItem>
            <SelectItem value="couple">Couple</SelectItem>
            <SelectItem value="family">Famille</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-gray-500">
          Cette valeur est automatiquement mise à jour en fonction de votre situation maritale et du nombre d'enfants.
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </Button>
      </div>
    </form>
  )
}
