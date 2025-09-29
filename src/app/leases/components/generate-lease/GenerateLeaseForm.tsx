'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Property {
  id: string
  name: string
  address: string
  city: string
  postal_code: string
}

interface Tenant {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  birth_date: string
  birth_place: string
}

interface Profile {
  first_name: string
  last_name: string
  address: string
  phone: string
}

export function GenerateLeaseForm() {
  const [properties, setProperties] = useState<Property[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Form state
  const [selectedProperty, setSelectedProperty] = useState('')
  const [selectedTenant, setSelectedTenant] = useState('')
  const [leaseType, setLeaseType] = useState('empty')
  const [startDate, setStartDate] = useState<Date | undefined>(new Date())
  const [duration, setDuration] = useState('36')
  const [rent, setRent] = useState('')
  const [charges, setCharges] = useState('')
  const [deposit, setDeposit] = useState('')
  const [specialClauses, setSpecialClauses] = useState('')

  const supabase = createClientComponentClient<Database>()
  const { toast } = useToast()

  // Calculate end date based on start date and duration
  const endDate = startDate 
    ? new Date(startDate.getFullYear(), startDate.getMonth() + parseInt(duration), startDate.getDate())
    : null

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        // Fetch properties
        const { data: propertiesData } = await supabase
          .from('properties')
          .select('id, name, address, city, postal_code')
          .eq('user_id', session.user.id)
          .order('name', { ascending: true })

        // Fetch tenants
        const { data: tenantsData } = await supabase
          .from('tenants')
          .select('*')
          .eq('user_id', session.user.id)
          .order('last_name', { ascending: true })

        // Fetch user profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        setProperties(propertiesData || [])
        setTenants(tenantsData || [])
        setProfile(profileData)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les données nécessaires',
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [supabase, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedProperty || !selectedTenant || !startDate) {
      toast({
        title: 'Champs manquants',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    
    try {
      // 1. Create lease record in database
      const { data: lease, error } = await supabase
        .from('leases')
        .insert([{
          property_id: selectedProperty,
          tenant_id: selectedTenant,
          lease_start: startDate.toISOString(),
          lease_end: endDate?.toISOString(),
          rent: parseFloat(rent) || 0,
          charges_provision: parseFloat(charges) || 0,
          security_deposit: parseFloat(deposit) || 0,
          duration_months: parseInt(duration),
          signature_place: profile?.address || ''
        }])
        .select()
        .single()

      if (error) throw error

      // 2. Generate PDF (to be implemented)
      // const pdfUrl = await generateLeasePdf({
      //   leaseId: lease.id,
      //   // ... other data
      // })

      // 3. Update lease with document URL
      // await supabase
      //   .from('leases')
      //   .update({ document_url: pdfUrl })
      //   .eq('id', lease.id)

      toast({
        title: 'Succès',
        description: 'Le bail a été créé avec succès',
      })

      // Refresh data
      // router.refresh()
    } catch (error) {
      console.error('Error creating lease:', error)
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la création du bail',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-fill rent when property is selected
  useEffect(() => {
    if (selectedProperty) {
      const property = properties.find(p => p.id === selectedProperty)
      if (property) {
        // Here you would typically fetch the property details including rent
        // For now, we'll just set a placeholder
        setRent(property.rent?.toString() || '')
        const depositAmount = property.rent ? (property.rent * 1.5).toFixed(2) : ''
        setDeposit(depositAmount)
      }
    }
  }, [selectedProperty, properties])

  if (isLoading && !properties.length) {
    return <div>Chargement des données...</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Property Selection */}
        <div className="space-y-2">
          <Label htmlFor="property">Bien immobilier *</Label>
          <Select 
            value={selectedProperty} 
            onValueChange={setSelectedProperty}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un bien" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name} - {property.city} ({property.postal_code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tenant Selection */}
        <div className="space-y-2">
          <Label htmlFor="tenant">Locataire *</Label>
          <Select 
            value={selectedTenant} 
            onValueChange={setSelectedTenant}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un locataire" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.last_name} {tenant.first_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Lease Type */}
        <div className="space-y-2">
          <Label htmlFor="leaseType">Type de bail *</Label>
          <Select 
            value={leaseType} 
            onValueChange={setLeaseType}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un type de bail" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="empty">Vide</SelectItem>
              <SelectItem value="furnished">Meublé</SelectItem>
              <SelectItem value="student">Étudiant</SelectItem>
              <SelectItem value="seasonal">Saisonnier</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Start Date */}
        <div className="space-y-2">
          <Label>Date de début *</Label>
          <div className="border rounded-md p-2">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={setStartDate}
              disabled={(date) => date < new Date()}
              initialFocus
              locale={fr}
              className="rounded-md"
            />
          </div>
          {startDate && (
            <p className="text-sm text-muted-foreground">
              {format(startDate, 'PPP', { locale: fr })}
            </p>
          )}
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <Label htmlFor="duration">Durée (mois) *</Label>
          <Select 
            value={duration} 
            onValueChange={setDuration}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Durée du bail" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12 mois</SelectItem>
              <SelectItem value="24">24 mois</SelectItem>
              <SelectItem value="36">36 mois</SelectItem>
              <SelectItem value="60">60 mois</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* End Date (readonly) */}
        <div className="space-y-2">
          <Label>Date de fin</Label>
          <Input 
            value={endDate ? format(endDate, 'PPP', { locale: fr }) : ''} 
            readOnly 
            className="bg-muted" 
          />
        </div>

        {/* Rent */}
        <div className="space-y-2">
          <Label htmlFor="rent">Loyer mensuel (€) *</Label>
          <Input 
            id="rent" 
            type="number" 
            value={rent} 
            onChange={(e) => setRent(e.target.value)} 
            required 
            min="0"
            step="0.01"
          />
        </div>

        {/* Charges */}
        <div className="space-y-2">
          <Label htmlFor="charges">Charges (€/mois)</Label>
          <Input 
            id="charges" 
            type="number" 
            value={charges} 
            onChange={(e) => setCharges(e.target.value)} 
            min="0"
            step="0.01"
          />
        </div>

        {/* Security Deposit */}
        <div className="space-y-2">
          <Label htmlFor="deposit">Dépôt de garantie (€)</Label>
          <Input 
            id="deposit" 
            type="number" 
            value={deposit} 
            onChange={(e) => setDeposit(e.target.value)} 
            min="0"
            step="0.01"
          />
          <p className="text-xs text-muted-foreground">
            Généralement 1 à 2 mois de loyer hors charges
          </p>
        </div>

        {/* Special Clauses */}
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="specialClauses">Clauses particulières</Label>
          <Textarea 
            id="specialClauses" 
            value={specialClauses} 
            onChange={(e) => setSpecialClauses(e.target.value)} 
            placeholder="Ex: Animaux autorisés, travaux prévus, etc."
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-4 pt-4">
        <Button type="button" variant="outline" onClick={() => {}}>
          Annuler
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Création en cours...' : 'Générer le bail'}
        </Button>
      </div>
    </form>
  )
}
