'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PersonalInfoFormProps {
  userData: {
    email: string
    first_name: string
    last_name: string
    phone: string
    address: string
    landlord_name: string
  }
  onSubmit: (data: {
    first_name: string
    last_name: string
    phone: string
    address: string
    landlord_name: string
  }) => void
  isLoading: boolean
}

export function PersonalInfoForm({ userData, onSubmit, isLoading }: PersonalInfoFormProps) {
  const [formData, setFormData] = useState({
    first_name: userData.first_name,
    last_name: userData.last_name,
    phone: userData.phone,
    address: userData.address,
    landlord_name: userData.landlord_name
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={userData.email}
            disabled
            className="bg-gray-100"
          />
          <p className="text-sm text-gray-500">L'email ne peut pas être modifié</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Votre numéro de téléphone"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="first_name">Prénom</Label>
          <Input
            id="first_name"
            name="first_name"
            type="text"
            value={formData.first_name}
            onChange={handleChange}
            placeholder="Votre prénom"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="last_name">Nom</Label>
          <Input
            id="last_name"
            name="last_name"
            type="text"
            value={formData.last_name}
            onChange={handleChange}
            placeholder="Votre nom"
            required
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Adresse (bailleur)</Label>
          <Input
            id="address"
            name="address"
            type="text"
            value={formData.address}
            onChange={handleChange}
            placeholder="Votre adresse complète (utilisée pour les contrats)"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="landlord_name">Nom bailleur / SCI (pour le contrat)</Label>
          <Input
            id="landlord_name"
            name="landlord_name"
            type="text"
            value={formData.landlord_name}
            onChange={handleChange}
            placeholder="Ex: SCI Mon Patrimoine ou Dupont SARL"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </Button>
      </div>
    </form>
  )
}
