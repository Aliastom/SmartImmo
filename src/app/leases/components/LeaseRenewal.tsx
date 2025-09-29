'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { format, addMonths, isAfter } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Loader2, Calendar as CalendarIcon } from 'lucide-react'
import { leaseStorage } from '@/lib/storage'
import { generateLeasePDF } from '@/lib/lease-pdf-generator'

interface LeaseRenewalProps {
  lease: {
    id: string
    property_id: string
    property_name: string
    tenant_id: string
    tenant_name: string
    lease_start: string
    lease_end: string
    rent: number
    charges_provision: number
    security_deposit: number
    signature_place: string
  }
  onSuccess?: () => void
  onCancel?: () => void
}

export function LeaseRenewal({ 
  lease, 
  onSuccess, 
  onCancel 
}: LeaseRenewalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(lease.lease_end) || new Date())
  const [duration, setDuration] = useState('12')
  const [rent, setRent] = useState(lease.rent.toString())
  const [charges, setCharges] = useState(lease.charges_provision?.toString() || '0')
  const [deposit, setDeposit] = useState(lease.security_deposit?.toString() || '0')
  const [signaturePlace, setSignaturePlace] = useState(lease.signature_place || '')
  const [isGenerating, setIsGenerating] = useState(false)
  
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()

  // Calculer la date de fin en fonction de la date de début et de la durée
  const endDate = startDate ? addMonths(startDate, parseInt(duration) || 0) : null

  // Vérifier que la date de début est postérieure à la date de fin actuelle
  const isStartDateValid = startDate && (!lease.lease_end || isAfter(startDate, new Date(lease.lease_end)))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!startDate || !duration || !rent) {
      toast({
        title: 'Champs manquants',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive'
      })
      return
    }

    if (!isStartDateValid) {
      toast({
        title: 'Date invalide',
        description: 'La date de début doit être postérieure à la date de fin du bail actuel',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)

    try {
      // 1. Mettre à jour la date de fin de l'ancien bail
      const { error: updateError } = await supabase
        .from('leases')
        .update({ 
          lease_end: startDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', lease.id)

      if (updateError) throw updateError

      // 2. Créer un nouveau bail
      const { data: newLease, error: createError } = await supabase
        .from('leases')
        .insert([{
          property_id: lease.property_id,
          tenant_id: lease.tenant_id,
          lease_start: startDate.toISOString(),
          lease_end: endDate?.toISOString(),
          rent: parseFloat(rent) || 0,
          charges_provision: parseFloat(charges) || 0,
          security_deposit: parseFloat(deposit) || 0,
          duration_months: parseInt(duration) || 12,
          signature_place: signaturePlace,
          previous_lease_id: lease.id
        }])
        .select()
        .single()

      if (createError) throw createError

      // 3. Générer le PDF du nouveau bail
      setIsGenerating(true)
      
      // Récupérer les informations du locataire et du bien
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', lease.tenant_id)
        .single()

      const { data: propertyData } = await supabase
        .from('properties')
        .select('*')
        .eq('id', lease.property_id)
        .single()

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', (await supabase.auth.getSession()).data.session?.user.id)
        .single()

      if (!tenantData || !propertyData || !profileData) {
        throw new Error('Impossible de charger les données nécessaires')
      }

      // Préparer les données pour le PDF
      const leaseData = {
        id: newLease.id,
        title: 'RENOUVELLEMENT DE BAIL',
        property: {
          type: propertyData.type || 'Appartement',
          address: {
            street: propertyData.address || '',
            postalCode: propertyData.postal_code || '',
            city: propertyData.city || '',
            country: 'France'
          },
          area: propertyData.area || 0,
          floor: propertyData.floor,
          description: propertyData.address || '',
          rooms: propertyData.rooms
        },
        landlord: {
          firstName: profileData.first_name || '',
          lastName: profileData.last_name || '',
          address: {
            street: profileData.address || '',
            postalCode: '',
            city: '',
            country: 'France'
          },
          phone: profileData.phone || ''
        },
        tenant: {
          firstName: tenantData.first_name || '',
          lastName: tenantData.last_name || '',
          birthDate: tenantData.birth_date ? new Date(tenantData.birth_date) : undefined,
          birthPlace: tenantData.birth_place || 'Non spécifié',
          address: {
            street: tenantData.current_address || '',
            postalCode: '',
            city: '',
            country: 'France'
          },
          phone: tenantData.phone || '',
          email: tenantData.email || ''
        },
        period: {
          startDate: startDate,
          endDate: endDate || addMonths(startDate, parseInt(duration) || 12),
          noticePeriod: 3
        },
        financialTerms: {
          rent: parseFloat(rent) || 0,
          charges: parseFloat(charges) || 0,
          deposit: parseFloat(deposit) || 0,
          paymentDueDay: 5, // Valeur par défaut
          indexationClause: true,
          chargesIncluded: ['Eau froide', 'Chauffage collectif'] // À adapter
        },
        specialClauses: [
          `Ce bail constitue le renouvellement du bail précédent en date du ${format(new Date(lease.lease_start), 'dd/MM/yyyy')}`
        ],
        createdAt: new Date()
      }

      // Générer le PDF
      const pdfBuffer = await generateLeasePDF(leaseData, 'buffer')
      
      // Téléverser le PDF dans le stockage
      const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' })
      const pdfFile = new File([pdfBlob], `bail-${newLease.id}.pdf`, { type: 'application/pdf' })
      
      const { path, url } = await leaseStorage.uploadFile(
        pdfFile,
        `${lease.property_id}/${lease.tenant_id}/${newLease.id}_generated`,
        {
          leaseId: newLease.id,
          propertyId: lease.property_id,
          tenantId: lease.tenant_id,
          uploadedAt: new Date().toISOString(),
          type: 'generated_lease',
          isRenewal: 'true',
          originalLeaseId: lease.id
        }
      )

      // Mettre à jour le bail avec l'URL du document
      await supabase
        .from('leases')
        .update({ 
          document_url: url,
          updated_at: new Date().toISOString()
        })
        .eq('id', newLease.id)

      // Créer une entrée dans la table documents
      await supabase
        .from('documents')
        .insert([{
          user_id: (await supabase.auth.getSession()).data.session?.user.id!,
          property_id: lease.property_id,
          tenant_id: lease.tenant_id,
          name: `Bail renouvelé - ${format(new Date(), 'dd/MM/yyyy')}`,
          file_path: path,
          file_size: pdfFile.size,
          mime_type: 'application/pdf',
          uploaded_at: new Date().toISOString(),
          metadata: {
            type: 'lease',
            lease_id: newLease.id,
            is_renewal: true,
            original_lease_id: lease.id
          }
        }])

      toast({
        title: 'Succès',
        description: 'Le bail a été renouvelé avec succès',
      })

      if (onSuccess) onSuccess()
      router.refresh()
    } catch (error) {
      console.error('Erreur lors du renouvellement du bail:', error)
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors du renouvellement du bail',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Renouveler le bail</h3>
        <p className="text-sm text-muted-foreground">
          Créez un nouveau bail en reprenant les conditions du bail actuel
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date de début */}
          <div className="space-y-2">
            <Label htmlFor="start-date">Date de début *</Label>
            <div className="border rounded-md p-2">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                disabled={(date) => date < new Date(lease.lease_end || 0)}
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
            {!isStartDateValid && (
              <p className="text-sm text-destructive">
                La date de début doit être postérieure à la date de fin du bail actuel
              </p>
            )}
          </div>

          {/* Durée */}
          <div className="space-y-2">
            <Label htmlFor="duration">Durée (mois) *</Label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            >
              <option value="12">12 mois</option>
              <option value="24">24 mois</option>
              <option value="36">36 mois</option>
              <option value="60">60 mois</option>
            </select>
          </div>

          {/* Loyer */}
          <div className="space-y-2">
            <Label htmlFor="rent">Loyer mensuel (€) *</Label>
            <Input
              id="rent"
              type="number"
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              min="0"
              step="0.01"
              required
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

          {/* Dépôt de garantie */}
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
          </div>

          {/* Lieu de signature */}
          <div className="space-y-2">
            <Label htmlFor="signature-place">Lieu de signature</Label>
            <Input
              id="signature-place"
              value={signaturePlace}
              onChange={(e) => setSignaturePlace(e.target.value)}
              placeholder="Ville de signature"
            />
          </div>
        </div>

        <div className="pt-4">
          <h4 className="font-medium mb-2">Résumé du nouveau bail</h4>
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Période</p>
                <p>
                  {startDate ? format(startDate, 'dd/MM/yyyy') : 'Non défini'} au{' '}
                  {endDate ? format(endDate, 'dd/MM/yyyy') : 'Non défini'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Durée</p>
                <p>{duration} mois</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Loyer mensuel</p>
                <p>{parseFloat(rent).toFixed(2)} €</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Charges</p>
                <p>{parseFloat(charges || '0').toFixed(2)} €</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isLoading}
            >
              Annuler
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={isLoading || !isStartDateValid}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isGenerating ? 'Génération du PDF...' : 'Traitement...'}
              </>
            ) : (
              'Renouveler le bail'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
