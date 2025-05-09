'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PropertyModal } from '../components/property-modal.tsx'
import { LeaseModal } from '../components/lease-modal.tsx'
import { useToast } from "@/components/ui/use-toast"
import { formatCurrency } from '@/lib/utils'
import TransactionModal from '../../transactions/transaction-modal.tsx'
import { PropertyTransactions } from '../components/property-transactions'
import { PropertyLoans } from '../components/property-loans'
import { PropertyDocuments } from '../components/property-documents'
import { PropertyPhoto } from '../components/property-photo'
import { motion } from 'framer-motion'
import { AnimatedCard } from '@/components/ui/animated'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog'
import { X } from 'lucide-react'
import { PropertyRegimeCard } from '@/components/property/property-regime-card'
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PropertyDetailsTab } from '../components/property-details-tab'
import { PropertyPhotosByRoom } from '../components/property-photos-by-room'
import RendementLocatif from '../components/RendementLocatif';
import { useBienFinancier } from '../hooks/useBienFinancier';
import { SimpleCsvModal } from '../components/simple-csv-modal';
import RentabiliteTab from '../components/rentabilite-tab';

export default function PropertyDetailPage() {
  const params = useParams()
  const propertyId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : ''
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()
  const [property, setProperty] = useState<any | null>(null)
  const [loans, setLoans] = useState<any[]>([])
  const [currentTenant, setCurrentTenant] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [transactionToClone, setTransactionToClone] = useState<any | undefined>()
  const [transactionId, setTransactionId] = useState<any | undefined>()
  const [allProperties, setAllProperties] = useState<any[]>([]);
  const [totalIncome, setTotalIncome] = useState(0)
  const [totalExpense, setTotalExpense] = useState(0)
  const [balance, setBalance] = useState(0)
  const [isImportCsvModalOpen, setIsImportCsvModalOpen] = useState(false);

  // Onglet actif persistant via URL
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialTab = searchParams?.get('tab') || 'transactions';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Garde l'onglet actif dans l'URL à chaque changement
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
  };

  const fetchPropertyDetails = async () => {
    try {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast({
          title: "Session expirée",
          description: "Veuillez vous reconnecter",
          variant: "destructive"
        })
        setIsLoading(false)
        return
      }

      // Récupérer le bien
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single()
      if (propertyError) throw propertyError
      setProperty(propertyData)

      // Récupérer les crédits liés à ce bien
      const { data: loansData, error: loansError } = await supabase
        .from('loans')
        .select('*')
        .eq('property_id', propertyId)
        .eq('user_id', session.user.id)
      setLoans(loansData || [])
      // Pas de throw sur loansError, les crédits sont optionnels

      // Récupérer le locataire actuel et son bail
      const { data: leaseData, error: leaseError } = await supabase
        .from('leases')
        .select(`
          *,
          tenants (
            id, user_id, first_name, last_name, email, phone, created_at, updated_at
          )
        `)
        .eq('property_id', propertyId)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (leaseError && leaseError.code !== 'PGRST116') {
        // PGRST116 est le code d'erreur quand aucun résultat n'est trouvé
        console.error('Error fetching lease:', leaseError)
      }

      if (leaseData) {
        setCurrentTenant({
          id: leaseData.tenants.id,
          user_id: leaseData.tenants.user_id,
          first_name: leaseData.tenants.first_name,
          last_name: leaseData.tenants.last_name,
          email: leaseData.tenants.email,
          phone: leaseData.tenants.phone,
          lease: {
            id: leaseData.id,
            property_id: leaseData.property_id,
            tenant_id: leaseData.tenant_id,
            rent: leaseData.rent,
            lease_start: leaseData.lease_start,
            lease_end: leaseData.lease_end,
            duration_months: leaseData.duration_months,
            created_at: leaseData.created_at,
            updated_at: leaseData.updated_at
          }
        })
      } else {
        setCurrentTenant(null)
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du bien ou des crédits",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPropertyDetails()
    // eslint-disable-next-line
  }, [propertyId])

  const handleRemoveTenant = async () => {
    if (!currentTenant || !property) return

    try {
      const { error } = await supabase
        .from('leases')
        .delete()
        .eq('id', currentTenant.lease.id)

      if (error) throw error

      // Mettre à jour le statut du bien
      const { error: updateError } = await supabase
        .from('properties')
        .update({ status: 'vacant' })
        .eq('id', propertyId)

      if (updateError) throw updateError

      toast({
        title: "Succès",
        description: "Le locataire a été retiré avec succès",
      })

      setCurrentTenant(null)
      setRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      })
    }
  }

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier image",
        variant: "destructive"
      })
      return
    }
    setSelectedFile(file)
    handlePhotoUpload(file)
  }

  const handlePhotoUpload = async (file: File) => {
    if (!file || !property) return

    try {
      setIsUploading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast({
          title: "Session expirée",
          description: "Veuillez vous reconnecter",
          variant: "destructive"
        })
        setIsLoading(false)
        return
      }

      // Convertir l'image en base64
      const reader = new FileReader()
      
      reader.onload = async () => {
        const base64String = reader.result as string
        
        // Mettre à jour la propriété avec l'image en base64
        const { error: updateError } = await supabase
          .from('properties')
          .update({ 
            image_url: base64String,
            updated_at: new Date().toISOString()
          })
          .eq('id', propertyId)
          .eq('user_id', session.user.id)

        if (updateError) throw updateError

        toast({
          title: "Succès",
          description: "L'image a été téléchargée avec succès",
        })

        setRefreshTrigger(prev => prev + 1)
      }
      
      reader.onerror = () => {
        throw new Error("Erreur lors de la lecture du fichier")
      }
      
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors du téléchargement de l'image",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDuplicateTransaction = (transaction: any) => {
    setTransactionToClone(transaction)
    setIsModalOpen(true)
  }

  const handleLeaseUpdated = async () => {
    await fetchPropertyDetails(); // recharge la propriété ET le bail à jour
  }

  const handlePropertyUpdated = async () => {
    await fetchPropertyDetails();
  };

  const handleModalClose = (saved?: boolean) => {
    setIsModalOpen(false)
    setTransactionToClone(undefined)
    setTransactionId(undefined)
    if (saved) {
      setRefreshTrigger(prev => prev + 1)
    }
  }

  const downloadImage = () => {
    if (property?.image_url) {
      // Créer un lien temporaire
      const link = document.createElement('a')
      link.href = property.image_url
      link.download = `${property.name || 'image'}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleDeleteProperty = async () => {
    if (!property) return

    // Demander confirmation avant de supprimer
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la propriété "${property.name}" ? Cette action est irréversible.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId)

      if (error) throw error

      toast({
        title: "Succès",
        description: "La propriété a été supprimée avec succès",
      })

      router.push('/properties')
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      })
    }
  }

  // Récupérer tous les biens de l'utilisateur pour la navigation
  useEffect(() => {
    const fetchAllProperties = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false }); // Correction ici
      if (!error && data) setAllProperties(data);
    };
    fetchAllProperties();
  }, []);

  // Trouver l'index du bien courant
  const currentIndex = allProperties.findIndex((p) => p.id === propertyId);
  const prevPropertyId = currentIndex > 0 ? allProperties[currentIndex - 1]?.id : null;
  const nextPropertyId = currentIndex < allProperties.length - 1 ? allProperties[currentIndex + 1]?.id : null;

  // Navigation entre biens : conserve l'onglet actif
  const goToProperty = (id: string) => {
    router.push(`/properties/${id}?tab=${activeTab}`);
  };

  // Calcul dynamique des totaux pour ce bien
  const fetchPropertyTransactionsTotals = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, transaction_type')
        .eq('user_id', session.user.id)
        .eq('property_id', propertyId)
      if (error) throw error
      const income = (data || []).filter(t => t.transaction_type === 'income').reduce((sum, t) => sum + Number(t.amount), 0)
      const expense = (data || []).filter(t => t.transaction_type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0)
      setTotalIncome(income)
      setTotalExpense(expense)
      setBalance(income - expense)
    } catch (e) {
      setTotalIncome(0)
      setTotalExpense(0)
      setBalance(0)
    }
  }, [propertyId, supabase])

  useEffect(() => {
    if (propertyId) {
      fetchPropertyTransactionsTotals()
    }
  }, [propertyId, refreshTrigger])

  const userId = property?.user_id || null;
  const bienFinancier = useBienFinancier(userId, propertyId);

  // Détermination de la source de l'impôt foncier
  let landTaxSource: 'manual' | 'auto' | 'none' = 'none';
  if (bienFinancier) {
    if (bienFinancier.landTax > 0 && bienFinancier.landTaxSource === 'manual') {
      landTaxSource = 'manual';
    } else if (bienFinancier.landTax > 0) {
      landTaxSource = 'auto';
    }
  }

  // Lien direct vers la page impôts (à adapter si besoin)
  const impotsLink = '/impots';

  const handleImportCsv = async (csvData: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { error } = await supabase
        .from('transactions')
        .insert(csvData);
      if (error) throw error;
      toast({
        title: "Succès",
        description: "Les transactions ont été importées avec succès",
      });
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error importing transactions:', error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'import",
        variant: "destructive"
      });
    } finally {
      setIsImportCsvModalOpen(false);
    }
  };

  return (
    <>
      {/* Header avec boutons de navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {/* Bouton précédent */}
          <button
            onClick={() => prevPropertyId && goToProperty(prevPropertyId)}
            disabled={!prevPropertyId}
            className={`rounded-full p-2 shadow-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-400`}
            aria-label="Bien précédent"
            style={{ fontSize: 22 }}
          >
            <ChevronLeft />
          </button>
          <h2 className="text-xl font-semibold ml-2">{property?.name || 'Détail du bien'}</h2>
          {/* Bouton suivant */}
          <button
            onClick={() => nextPropertyId && goToProperty(nextPropertyId)}
            disabled={!nextPropertyId}
            className={`rounded-full p-2 shadow-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-400 ml-2`}
            aria-label="Bien suivant"
            style={{ fontSize: 22 }}
          >
            <ChevronRight />
          </button>
        </div>
        {/* Garde les autres boutons (modifier, supprimer) alignés à droite */}
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:justify-end items-stretch sm:items-center mt-2">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1 sm:flex-initial">
            <Button 
              variant="outline" 
              onClick={() => router.push('/properties')} 
              className="bg-white text-gray-800 hover:bg-gray-200 border border-gray-300 shadow-sm flex items-center w-full sm:w-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1 sm:flex-initial">
            <Button 
              onClick={() => setIsEditModalOpen(true)} 
              className="bg-white text-gray-800 hover:bg-gray-200 border border-gray-300 shadow-sm flex items-center w-full sm:w-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Modifier
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1 sm:flex-initial">
            <Button 
              onClick={handleDeleteProperty} 
              className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-300 shadow-sm flex items-center w-full sm:w-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Supprimer
            </Button>
          </motion.div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-[60vh]">
          {/* SUPPRESSION DU LOADER LOCAL */}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AnimatedCard delay={0.1}>
              <CardHeader className="pb-2">
                <CardTitle>Informations générales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-sm font-medium text-gray-500 uppercase">Adresse</div>
                    <div className="col-span-2">{property?.address?.replace(`${property?.postal_code || ''} ${property?.city || ''}`, '').replace(`${property?.postal_code || ''}`, '').replace(`${property?.city || ''}`, '').replace(/\s*,\s*$/, '').trim() || 'Non spécifiée'}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-sm font-medium text-gray-500 uppercase">Ville</div>
                    <div className="col-span-2">{property?.city || 'Non spécifiée'}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-sm font-medium text-gray-500 uppercase">Code postal</div>
                    <div className="col-span-2">{property?.postal_code || 'Non spécifié'}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-sm font-medium text-gray-500 uppercase">Type</div>
                    <div className="col-span-2">{property?.type || 'Non spécifié'}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-sm font-medium text-gray-500 uppercase">Surface</div>
                    <div className="col-span-2">{property?.area ? `${property.area} m²` : 'Non spécifiée'}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-sm font-medium text-gray-500 uppercase">Statut</div>
                    <div className="col-span-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        property?.status === 'rented' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {property?.status === 'rented' ? 'Loué' : 'Vacant'}
                      </span>
                    </div>
                  </div>
                  {property?.airbnb_listing_url && (
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <div className="text-sm font-medium text-gray-500 uppercase">Annonce Airbnb</div>
                      <div className="col-span-2">
                        <a
                          href={property.airbnb_listing_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-medium transition"
                          style={{ verticalAlign: 'middle' }}
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className="inline-block">
                            <circle cx="8" cy="8" r="7" />
                            <path d="M6 11l2-4 2 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Voir l'annonce Airbnb
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </AnimatedCard>

            <AnimatedCard delay={0.2}>
              <PropertyPhoto
                propertyId={propertyId}
                propertyName={property?.name}
                imageUrl={property?.image_url}
                isUploading={isUploading}
                onFileSelect={handleFileChange}
              />
            </AnimatedCard>

            <AnimatedCard delay={0.3}>
              <CardHeader className="pb-2">
                <CardTitle>Finances annuelles estimatives</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {property ? (
                    <>
                      <div className="flex justify-between">
                        <span>Loyer annuel</span>
                        <span>{property.rent ? formatCurrency(property.rent * 12) : 'Non spécifié'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Charges annuelles déductibles</span>
                        <span>{formatCurrency((Number(property.property_tax) || 0)
                          + (Number(property.housing_tax) || 0)
                          + (Number(property.insurance) || 0)
                          + (Number(property.management_fee_percentage ? (property.rent * 12 * property.management_fee_percentage / 100) : 0))
                          + (Number(property.loan_interest) || 0)
                        )}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Résultat net avant impôt</span>
                        <span>{property.rent ? formatCurrency(
                          (property.rent * 12)
                          - ((Number(property.property_tax) || 0)
                            + (Number(property.housing_tax) || 0)
                            + (Number(property.insurance) || 0)
                            + (Number(property.management_fee_percentage ? (property.rent * 12 * property.management_fee_percentage / 100) : 0))
                            + (Number(property.loan_interest) || 0)
                          )
                        ) : 'Non spécifié'}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-muted-foreground">Aucune donnée disponible</div>
                  )}
                  {/* Ajout du composant de rendement locatif personnalisé si besoin */}
                  {property && (
                    <RendementLocatif
                      purchasePrice={property.purchase_price || 0}
                      rent={property.rent || 0}
                      propertyTax={Number(property.property_tax) || 0}
                      housingTax={Number(property.housing_tax) || 0}
                      insurance={Number(property.insurance) || 0}
                      managementFeePercentage={Number(property.management_fee_percentage) || 0}
                      acquisitionFees={Number(property.acquisition_fees) || 0}
                      landTax={Number(property.land_tax) || 0}
                      loyerAnnuel={property.rent ? property.rent * 12 : 0}
                      chargesAnnuelles={
                        (Number(property.property_tax) || 0)
                        + (Number(property.housing_tax) || 0)
                        + (Number(property.insurance) || 0)
                        + (Number(property.management_fee_percentage ? (property.rent * 12 * property.management_fee_percentage / 100) : 0))
                        + (Number(property.loan_interest) || 0)
                      }
                    />
                  )}
                </div>
              </CardContent>
            </AnimatedCard>
          </div>

          <div className="mt-8">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="mb-6">
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="loans">Prêts</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="tenant">Locataire</TabsTrigger>
                <TabsTrigger value="regime">Régime fiscal</TabsTrigger>
                <TabsTrigger value="details">Détails</TabsTrigger>
                <TabsTrigger value="rentabilite">Rentabilité</TabsTrigger>
              </TabsList>
              
              <TabsContent value="transactions">
                {/* Bouton Import CSV */}
                {false && (
                  <div className="flex justify-end items-center mb-4">
                    <Button
                      variant="outline"
                      className="ml-2"
                      onClick={() => setIsImportCsvModalOpen(true)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Importer CSV
                    </Button>
                  </div>
                )}
                <PropertyTransactions 
                  property={property}
                  propertyId={propertyId} 
                  onAddTransaction={() => setIsModalOpen(true)}
                  onDuplicateTransaction={handleDuplicateTransaction}
                  onEditTransaction={(transactionId) => {
                    setTransactionToClone(undefined);
                    setTransactionId(transactionId);
                    setIsModalOpen(true);
                  }}
                  onDeleteTransaction={async (transactionId) => {
                    if (confirm("Êtes-vous sûr de vouloir supprimer cette transaction ?")) {
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) return;
                        const { error } = await supabase
                          .from('transactions')
                          .delete()
                          .eq('id', transactionId)
                          .eq('user_id', session.user.id);
                        if (error) throw error;
                        toast({
                          title: "Transaction supprimée",
                          description: "La transaction a été supprimée avec succès"
                        });
                        setRefreshTrigger(prev => prev + 1);
                      } catch (error) {
                        console.error('Error deleting transaction:', error);
                        toast({
                          title: "Erreur",
                          description: error.message || "Une erreur est survenue lors de la suppression",
                          variant: "destructive"
                        });
                      }
                    }
                  }}
                  refreshTrigger={refreshTrigger}
                />
                {/* Modal Import CSV */}
                <SimpleCsvModal
                  open={isImportCsvModalOpen}
                  onClose={() => setIsImportCsvModalOpen(false)}
                  onImport={handleImportCsv}
                  existingTransactions={[]}
                />
              </TabsContent>
              
              <TabsContent value="loans">
                <PropertyLoans propertyId={propertyId} purchasePrice={property?.purchase_price ? Number(property.purchase_price) : undefined} />
              </TabsContent>
              
              <TabsContent value="documents">
                <PropertyDocuments propertyId={propertyId} />
              </TabsContent>
              
              <TabsContent value="tenant">
                <AnimatedCard>
                  <CardHeader className="pb-2">
                    <CardTitle>Informations du locataire</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {currentTenant ? (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="text-left p-3 text-sm font-medium text-gray-500">Champ</th>
                                <th className="text-left p-3 text-sm font-medium text-gray-500">Valeur</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b hover:bg-gray-50">
                                <td className="p-3 text-sm font-medium text-gray-500 uppercase">
                                  <div className="flex items-center space-x-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 016 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span>Nom</span>
                                  </div>
                                </td>
                                <td className="p-3">{`${currentTenant.first_name} ${currentTenant.last_name}`}</td>
                              </tr>
                              <tr className="border-b hover:bg-gray-50">
                                <td className="p-3 text-sm font-medium text-gray-500 uppercase">
                                  <div className="flex items-center space-x-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span>Email</span>
                                  </div>
                                </td>
                                <td className="p-3">{currentTenant.email || 'Non spécifié'}</td>
                              </tr>
                              <tr className="border-b hover:bg-gray-50">
                                <td className="p-3 text-sm font-medium text-gray-500 uppercase">
                                  <div className="flex items-center space-x-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <span>Téléphone</span>
                                  </div>
                                </td>
                                <td className="p-3">{currentTenant.phone || 'Non spécifié'}</td>
                              </tr>
                              <tr className="border-b hover:bg-gray-50">
                                <td className="p-3 text-sm font-medium text-gray-500 uppercase">
                                  <div className="flex items-center space-x-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span>Début du bail</span>
                                  </div>
                                </td>
                                <td className="p-3">{currentTenant.lease?.lease_start ? new Date(currentTenant.lease.lease_start).toLocaleDateString() : 'Non spécifié'}</td>
                              </tr>
                              <tr className="border-b hover:bg-gray-50">
                                <td className="p-3 text-sm font-medium text-gray-500 uppercase">
                                  <div className="flex items-center space-x-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Fin du bail</span>
                                  </div>
                                </td>
                                <td className="p-3">{currentTenant.lease?.lease_end ? new Date(currentTenant.lease.lease_end).toLocaleDateString() : 'Non spécifié'}</td>
                              </tr>
                              <tr className="border-b hover:bg-gray-50">
                                <td className="p-3 text-sm font-medium text-gray-500 uppercase">
                                  <div className="flex items-center space-x-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Fin du bail (calculée)</span>
                                  </div>
                                </td>
                                <td className="p-3">
                                  {(() => {
                                    const lease = currentTenant.lease || {};
                                    const start = new Date(lease.lease_start || lease.start_date);
                                    const months = Number(lease.duration_months || lease.duration);
                                    if (!isNaN(start.getTime()) && !isNaN(months)) {
                                      const calc = new Date(start);
                                      calc.setMonth(calc.getMonth() + months);
                                      return calc.toLocaleDateString('fr-FR');
                                    }
                                    return 'Non spécifiée';
                                  })()}
                                </td>
                              </tr>
                              <tr className="border-b hover:bg-gray-50">
                                <td className="p-3 text-sm font-medium text-gray-500 uppercase">
                                  <div className="flex items-center space-x-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                                  </svg>
                                  <span>Loyer</span>
                                </div>
                              </td>
                              <td className="p-3">{currentTenant.lease?.rent ? formatCurrency(currentTenant.lease.rent) : 'Non spécifié'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 mt-4">
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setIsLeaseModalOpen(true)}
                              className="bg-white border border-indigo-300 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 shadow-sm flex items-center"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              Modifier le bail
                            </Button>
                          </motion.div>
                          <form action="/tenants/new" method="GET">
                            <input type="hidden" name="propertyId" value={propertyId} />
                            <input type="hidden" name="change" value="true" />
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                type="submit"
                                className="bg-white border border-indigo-300 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 shadow-sm flex items-center"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857l-2.257-1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                Changer de locataire
                              </Button>
                            </motion.div>
                          </form>
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={handleRemoveTenant}
                              className="bg-white border border-red-300 text-red-600 hover:text-red-900 hover:bg-red-50 shadow-sm flex items-center"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                              </svg>
                              Retirer le locataire
                            </Button>
                          </motion.div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-center py-8">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 016 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <p className="text-gray-500 mb-4">
                            Ce bien n'est pas loué actuellement.
                          </p>
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <form action="/tenants/new" method="GET">
                              <input type="hidden" name="propertyId" value={propertyId} />
                              {property && (property.rent === null || property.rent === undefined || Number(property.rent) <= 0) ? (
                                <div className="flex flex-col items-center">
                                  <Button type="button" disabled className="bg-gray-300 text-gray-500 cursor-not-allowed border border-gray-300 flex items-center" title="Définissez un loyer pour activer ce bouton">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 011-7h3a4 4 0 014 0h-3a4 4 0 01-7 0z" />
                                    </svg>
                                    Ajouter un locataire
                                  </Button>
                                  <span className="mt-2 text-xs text-gray-500">Définissez un loyer mensuel pour pouvoir ajouter un locataire à ce bien.</span>
                                </div>
                              ) : (
                                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700 shadow-md flex items-center">
                                  <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    className="h-4 w-4 mr-2" 
                                    fill="none" 
                                    viewBox="0 0 24 24" 
                                    stroke="currentColor"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 011-7h3a4 4 0 014 0h-3a4 4 0 01-7 0z" />
                                  </svg>
                                  Ajouter un locataire
                                </Button>
                              )}
                            </form>
                          </motion.div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </AnimatedCard>
              </TabsContent>
              <TabsContent value="regime">
                <PropertyRegimeCard propertyRegimeId={property?.property_regime_id} />
              </TabsContent>
              <TabsContent value="details">
                <PropertyPhotosByRoom property={property} />
              </TabsContent>
              <TabsContent value="rentabilite">
                <RentabiliteTab property={property} loans={loans} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}

      {/* Modals */}
      {isEditModalOpen && (
        <PropertyModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          property={property}
          onPropertyUpdated={handlePropertyUpdated}
        />
      )}
      
      <TransactionModal 
        isOpen={isModalOpen}
        onClose={handleModalClose}
        propertyId={propertyId}
        transactionToClone={transactionToClone}
        transactionId={transactionId}
      />
      
      {currentTenant && (
        <LeaseModal
          key={currentTenant?.lease?.id || 'new'}
          isOpen={isLeaseModalOpen}
          onClose={() => setIsLeaseModalOpen(false)}
          propertyId={propertyId}
          tenantId={currentTenant?.id}
          lease={currentTenant?.lease}
          onLeaseUpdated={handleLeaseUpdated}
        />
      )}
    </>
  )
}