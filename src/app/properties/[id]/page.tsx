'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PropertyModal } from '../components/property-modal';
import { LeaseModal } from './components/lease-modal';
import { useToast } from "@/components/ui/use-toast"
import { formatCurrency } from '@/lib/utils'
import TransactionModal from '../../transactions/transaction-modal.tsx'
import { PropertyTransactions } from './components/property-transactions'
import { PropertyLoans } from './components/property-loans'
import { PropertyDocuments } from './components/property-documents'
import { PropertyPhoto } from './components/property-photo'
import { motion } from 'framer-motion'
import { AnimatedCard } from '@/components/ui/animated'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog'
import { X } from 'lucide-react'
import { PropertyRegimeCard } from './components/property-regime-card'
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PropertyDetailsTab } from './components/property-details-tab'
import { PropertyPhotosByRoom } from './components/property-photos-by-room'
import RendementLocatif from './components/RendementLocatif';
import { useBienFinancier } from '../hooks/useBienFinancier';
import { SimpleCsvModal } from './components/simple-csv-modal'
import RentabiliteTab from './components/rentabilite-tab'
import { Home, MapPin, Ruler, Tag, User2, BadgeCheck, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, Edit3, Image, Euro, Trash } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header'

export default function PropertyDetailPage() {
  // ...existing state
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const params = useParams()
  const propertyId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : ''
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()
  const [property, setProperty] = useState<any | null>(null)
  // ... autres états
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

  const fetchPropertyDetails = async (id: string) => {
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
        .eq('id', id)
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

      // Récupérer le locataire actuel et son bail (strictement comme dans la sauvegarde)
      const { data: leaseData, error: leaseError } = await supabase
        .from('leases')
        .select(`
          *,
          tenants:tenant_id (
            id, user_id, first_name, last_name, email, phone, created_at, updated_at
          )
        `)
        .eq('property_id', propertyId)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

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
    fetchPropertyDetails(propertyId)
    // eslint-disable-next-line
  }, [propertyId, refreshTrigger])

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
    try {
      await fetchPropertyDetails(propertyId);
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de rafraîchir les données du bien après modification.",
        variant: "destructive"
      });
    }
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

  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const [isUploadHovered, setIsUploadHovered] = useState(false)
  const [isDownloadHovered, setIsDownloadHovered] = useState(false)

  const handleHeaderPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0]); // ou ta logique d'upload
    }
  }

  const downloadHeaderImage = () => {
    if (property?.image_url) {
      const link = document.createElement('a');
      link.href = property.image_url;
      link.download = `${property.name || 'image'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  return (
    <div className="property-detail-bg min-h-screen flex flex-col gap-8 px-4 md:px-12 py-4 md:py-8 transactions-bg">
      {/* HEADER BIEN avec navigation intégrée */}
      <div className="flex flex-row items-center justify-center gap-4 mb-4">
        {/* Titre bien */}
        <PageHeader
          title={property?.name || 'Détail du bien'}
          buttonText="Modifier"
          buttonIcon={<Edit3 size={18} />}
          onButtonClick={() => setIsEditModalOpen(true)}
          className="mb-0"
        />
        {/* Boutons navigation groupés */}
        {allProperties && allProperties.length > 1 && (
          <div className="flex flex-row items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full w-10 h-10 flex items-center justify-center"
              disabled={allProperties.findIndex((p) => p.id === propertyId) === 0}
              onClick={() => {
                const idx = allProperties.findIndex((p) => p.id === propertyId);
                if (idx > 0) {
  router.push(`/properties/${allProperties[idx - 1].id}?tab=${activeTab}`);
}
              }}
              aria-label="Bien précédent"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            {/* Compteur position courante */}
            <span className="text-xs font-semibold px-2 select-none">
              {allProperties.findIndex((p) => p.id === propertyId) + 1}/{allProperties.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full w-10 h-10 flex items-center justify-center"
              disabled={allProperties.findIndex((p) => p.id === propertyId) === allProperties.length - 1}
              onClick={() => {
                const idx = allProperties.findIndex((p) => p.id === propertyId);
                if (idx < allProperties.length - 1) {
  router.push(`/properties/${allProperties[idx + 1].id}?tab=${activeTab}`);
}
              }}
              aria-label="Bien suivant"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>
        )}
        {/* Supprimer */}
        <Button variant="destructive" onClick={handleDeleteProperty}>
          <Trash size={18} className="mr-2" /> Supprimer
        </Button>
      </div>

      {/* INFOS PRINCIPALES glassmorphism */}
      {/* Partie haute supprimée car les infos sont désormais dans la carte "Informations générales" */}
      {isLoading ? (
        <div className="flex justify-center items-center h-[60vh]">
          {/* SUPPRESSION DU LOADER LOCAL */}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AnimatedCard delay={0.1}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Home className="w-5 h-5 text-blue-700" />
                  <CardTitle>Informations générales</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-blue-900">
                    <MapPin className="w-5 h-5" />
                    <span className="font-semibold">Adresse :</span>
                    <span>{property?.address || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-900">
                    <Tag className="w-5 h-5" />
                    <span className="font-semibold">Code postal :</span>
                    <span>{property?.postal_code || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-900">
                    <User2 className="w-5 h-5" />
                    <span className="font-semibold">Type :</span>
                    <span>{property?.type || 'Non spécifié'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-900">
                    <Ruler className="w-5 h-5" />
                    <span className="font-semibold">Surface :</span>
                    <span>{property?.surface ? property.surface + ' m²' : '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-900">
                    <BadgeCheck className="w-5 h-5" />
                    <span className="font-semibold">Statut :</span>
                    <span className={`badge-status ${property?.status === 'rented' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'} px-2 py-1 rounded-lg text-xs font-semibold`}>{property?.status === 'rented' ? 'Loué' : 'Disponible'}</span>
                  </div>
                </div>
              </CardContent>
            </AnimatedCard>

            <AnimatedCard delay={0.2}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Image className="w-5 h-5 text-blue-700" /> Photo
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    className="btn-glass btn-animated-yellow flex items-center gap-2 px-4 py-2 rounded-lg shadow transition relative group text-base"
                    style={{ minWidth: 'fit-content', maxWidth: '320px', overflow: 'hidden', position: 'relative', whiteSpace: 'nowrap' }}
                    onClick={() => document.getElementById('upload-photo-input')?.click()}
                    onMouseEnter={() => setIsUploadHovered(true)}
                    onMouseLeave={() => setIsUploadHovered(false)}
                  >
                    <span className="btn-animated-yellow-bg absolute inset-0 rounded-lg pointer-events-none transition-transform duration-300 group-hover:scale-100 scale-0 z-0" aria-hidden="true"></span>
                    <span className="relative flex items-center z-10 font-semibold">
                      <motion.span
                        className="inline-flex items-center"
                        animate={isUploadHovered ? "dance" : "idle"}
                        variants={{
                          dance: {
                            rotate: [0, -20, 20, -20, 20, 0],
                            scale: [1, 1.2, 1.1, 1.2, 1],
                            transition: {
                              repeat: Infinity,
                              repeatType: 'loop',
                              duration: 1.2,
                              ease: 'easeInOut',
                            },
                          },
                          idle: {},
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <rect x="3" y="16" width="18" height="4" rx="2" className="fill-yellow-200/80 dark:fill-yellow-300/30" stroke="currentColor" strokeWidth="1.5" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v8m0 0l-4-4m4 4l4-4" />
                        </svg>
                      </motion.span>
                      Téléverser
                    </span>
                  </Button>
                  <input
                    id="upload-photo-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleHeaderPhotoUpload}
                  />
                  <Button
                    className="btn-glass btn-animated-yellow flex items-center gap-2 px-4 py-2 rounded-lg shadow transition relative group text-base"
                    style={{ minWidth: 'fit-content', maxWidth: '320px', overflow: 'hidden', position: 'relative', whiteSpace: 'nowrap' }}
                    onClick={downloadHeaderImage}
                    disabled={!property?.image_url}
                    onMouseEnter={() => setIsDownloadHovered(true)}
                    onMouseLeave={() => setIsDownloadHovered(false)}
                  >
                    <span className="btn-animated-yellow-bg absolute inset-0 rounded-lg pointer-events-none transition-transform duration-300 group-hover:scale-100 scale-0 z-0" aria-hidden="true"></span>
                    <span className="relative flex items-center z-10 font-semibold">
                      <motion.span
                        className="inline-flex items-center"
                        animate={isDownloadHovered ? "dance" : "idle"}
                        variants={{
                          dance: {
                            rotate: [0, -20, 20, -20, 20, 0],
                            scale: [1, 1.2, 1.1, 1.2, 1],
                            transition: {
                              repeat: Infinity,
                              repeatType: 'loop',
                              duration: 1.2,
                              ease: 'easeInOut',
                            },
                          },
                          idle: {},
                        }}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12"/></svg>
                      </motion.span>
                      Télécharger
                    </span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Affichage de la photo principale */}
                {property?.image_url ? (
                  <img
                    src={property.image_url}
                    alt={property?.name || 'Photo du bien'}
                    className="w-full h-64 object-cover rounded-xl border shadow"
                  />
                ) : (
                  <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded-xl border">
                    <span className="text-gray-400">Aucune photo disponible</span>
                  </div>
                )}
              </CardContent>
            </AnimatedCard>

            <AnimatedCard delay={0.3}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Euro className="w-5 h-5 text-blue-700" />
                  <CardTitle>Finances annuelles estimatives</CardTitle>
                </div>
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
            <div className="main-info-glass bg-white/70 border border-blue-100 rounded-2xl shadow-lg p-6">
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
                  <div className="font-semibold text-gray-700 mb-4 text-lg">Prêts</div>
                  <PropertyLoans propertyId={propertyId} purchasePrice={property?.purchase_price ? Number(property.purchase_price) : undefined} />
                </TabsContent>

                <TabsContent value="documents">
                  <div className="font-semibold text-gray-700 mb-4 text-lg">Documents</div>
                  <PropertyDocuments propertyId={propertyId} />
                </TabsContent>

                <TabsContent value="tenant">
                  <AnimatedCard delay={0.2}>
                    <CardHeader>
                      <CardTitle>Informations du locataire</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {currentTenant ? (
                        <>
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm border border-gray-200 rounded-lg">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 border-b text-left">Champ</th>
                                  <th className="px-4 py-2 border-b text-left">Valeur</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="px-4 py-2 border-b">NOM</td>
                                  <td className="px-4 py-2 border-b font-semibold uppercase">{currentTenant.last_name} {currentTenant.first_name}</td>
                                </tr>
                                <tr>
                                  <td className="px-4 py-2 border-b">EMAIL</td>
                                  <td className="px-4 py-2 border-b">{currentTenant.email}</td>
                                </tr>
                                <tr>
                                  <td className="px-4 py-2 border-b">TÉLÉPHONE</td>
                                  <td className="px-4 py-2 border-b">{currentTenant.phone}</td>
                                </tr>
                                <tr>
                                  <td className="px-4 py-2 border-b">DÉBUT DU BAIL</td>
                                  <td className="px-4 py-2 border-b">{currentTenant.lease?.lease_start ? new Date(currentTenant.lease.lease_start).toLocaleDateString('fr-FR') : 'Non spécifié'}</td>
                                </tr>
                                <tr>
                                  <td className="px-4 py-2 border-b">FIN DU BAIL</td>
                                  <td className="px-4 py-2 border-b">{currentTenant.lease?.lease_end ? new Date(currentTenant.lease.lease_end).toLocaleDateString('fr-FR') : 'Non spécifiée'}</td>
                                </tr>
                                <tr>
                                  <td className="px-4 py-2 border-b">FIN DU BAIL (CALCULÉE)</td>
                                  <td className="px-4 py-2 border-b">{currentTenant.lease?.duration_months && currentTenant.lease?.lease_start ? new Date(new Date(currentTenant.lease.lease_start).setMonth(new Date(currentTenant.lease.lease_start).getMonth() + currentTenant.lease.duration_months)).toLocaleDateString('fr-FR') : 'Non spécifiée'}</td>
                                </tr>
                                <tr>
                                  <td className="px-4 py-2 border-b">LOYER</td>
                                  <td className="px-4 py-2 border-b">{currentTenant.lease?.rent ? `${currentTenant.lease.rent} €` : '-'}</td>
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
                                    <Button
                                      type="button"
                                      disabled
                                      className="btn-glass w-fit btn-animated-yellow ml-4 flex items-center gap-2 px-4 py-2 rounded-lg shadow transition relative group text-base bg-gray-300 text-gray-500 cursor-not-allowed border border-gray-300"
                                      title="Définissez un loyer pour activer ce bouton"
                                      style={{ minWidth: 'fit-content', maxWidth: '320px', overflow: 'hidden', position: 'relative', whiteSpace: 'nowrap' }}
                                    >
                                      <span className="btn-animated-yellow-bg absolute inset-0 rounded-lg pointer-events-none transition-transform duration-300 group-hover:scale-100 scale-0 z-0" aria-hidden="true"></span>
                                      <span className="relative flex items-center z-10 font-semibold">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Ajouter un locataire
                                      </span>
                                    </Button>
                                    <span className="mt-2 text-xs text-gray-500">Définissez un loyer mensuel pour pouvoir ajouter un locataire à ce bien.</span>
                                  </div>
                                ) : (
                                  <Button
                                    type="submit"
                                    className="btn-glass w-fit btn-animated-yellow ml-4 flex items-center gap-2 px-4 py-2 rounded-lg shadow transition relative group text-base"
                                    style={{ minWidth: 'fit-content', maxWidth: '320px', overflow: 'hidden', position: 'relative', whiteSpace: 'nowrap' }}
                                    onMouseEnter={() => setIsButtonHovered && setIsButtonHovered(true)}
                                    onMouseLeave={() => setIsButtonHovered && setIsButtonHovered(false)}
                                  >
                                    <span className="btn-animated-yellow-bg absolute inset-0 rounded-lg pointer-events-none transition-transform duration-300 group-hover:scale-100 scale-0 z-0" aria-hidden="true"></span>
                                    <span className="relative flex items-center z-10 font-semibold">
                                      <motion.span
                                        className="inline-flex items-center"
                                        animate={isButtonHovered ? "dance" : "idle"}
                                        variants={{
                                          dance: {
                                            rotate: [0, -20, 20, -20, 20, 0],
                                            scale: [1, 1.2, 1.1, 1.2, 1],
                                            transition: {
                                              repeat: Infinity,
                                              repeatType: 'loop',
                                              duration: 1.2,
                                              ease: 'easeInOut',
                                            },
                                          },
                                          idle: {},
                                        }}
                                      >
                                        {/* Icône Ajouter (plus) */}
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                      </motion.span>
                                      Ajouter un locataire
                                    </span>
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
                  <div className="font-semibold text-gray-700 mb-4 text-lg">Régime fiscal</div>
                  <PropertyRegimeCard propertyRegimeId={property?.property_regime_id} />
                </TabsContent>

                <TabsContent value="details">
                  <div className="font-semibold text-gray-700 mb-4 text-lg">Détails</div>
                  <PropertyPhotosByRoom property={property} />
                </TabsContent>

                <TabsContent value="rentabilite">
                  <div className="font-semibold text-gray-700 mb-4 text-lg">Rentabilité</div>
                  <RentabiliteTab property={property} loans={loans} />
                </TabsContent>
              </Tabs>
            </div>
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
    </div>
  )
}