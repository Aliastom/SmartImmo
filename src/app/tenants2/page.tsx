'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { TenantModal } from "./tenant-modal"
import { DeleteModal } from "./delete-modal"
import TenantTable from './components/tenant-table'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { AnimatedCard, LoadingSpinner, PageTransition } from '@/components/ui/animated'
import { PageHeader } from '@/components/ui/page-header'

type Tenant = Database['public']['Tables']['tenants']['Row']
type Property = Database['public']['Tables']['properties']['Row']
type Lease = Database['public']['Tables']['leases']['Row']

interface TenantWithProperties extends Tenant {
  properties?: (Property & {
    lease_start: string;
    lease_end: string | null;
    lease_id: string;
  })[];
  leases?: Lease[];
}

export default function TenantsPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [refreshKey, setRefreshKey] = useState(0)
  const [tenants, setTenants] = useState<TenantWithProperties[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  const handleEdit = (id: string) => {
    setSelectedTenantId(id)
    setIsAddModalOpen(true)
  }

  const handleDelete = (id: string) => {
    setSelectedTenantId(id)
    setIsDeleteModalOpen(true)
  }

  const handleViewTenant = (id: string) => {
    router.push(`/tenants/${id}`)
  }

  const handleExport = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast({
          title: "Session expirée",
          description: "Votre session a expiré. Veuillez vous reconnecter.",
          variant: "destructive"
        })
        return
      }

      // Récupérer tous les locataires avec les noms des biens
      const { data: tenants, error } = await supabase
        .from('tenants')
        .select(`
          *,
          properties (
            name,
            address
          )
        `)
        .eq('user_id', session.user.id)
        .order('last_name', { ascending: true })

      if (error) throw error

      // Formater les données pour l'export
      const formattedData = tenants.map(tenant => ({
        'Nom': `${tenant.first_name} ${tenant.last_name}`,
        'Email': tenant.email,
        'Téléphone': tenant.phone,
        'Bien': tenant.properties?.name || 'Aucun',
        'Adresse': tenant.properties?.address || 'N/A',
        'Début du bail': tenant.lease_start ? new Date(tenant.lease_start).toLocaleDateString('fr-FR') : 'N/A',
        'Fin du bail': tenant.lease_end ? new Date(tenant.lease_end).toLocaleDateString('fr-FR') : 'N/A'
      }))

      // Créer le CSV
      const headers = Object.keys(formattedData[0])
      const csv = [
        headers.join(','),
        ...formattedData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
      ].join('\n')

      // Télécharger le fichier
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `locataires_${new Date().toISOString().split('T')[0]}.csv`
      link.click()

      toast({
        title: "Succès",
        description: "L'export a été téléchargé"
      })
    } catch (error: any) {
      console.error('Error:', error)
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'export",
        variant: "destructive"
      })
    }
  }

  const handleModalClose = () => {
    setIsAddModalOpen(false)
    setSelectedTenantId(null)
    setRefreshKey(prev => prev + 1)
  }

  const fetchTenants = async () => {
    try {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/auth/login')
        return
      }

      // Récupérer les locataires
      const { data: tenants, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('user_id', session.user.id)
        .order('last_name', { ascending: true })

      if (error) throw error

      // Récupérer les baux pour les locataires
      const { data: leases, error: leasesError } = await supabase
        .from('leases')
        .select(`
          *,
          properties:property_id (*)
        `)
        .in('tenant_id', tenants.map(t => t.id))
        .eq('user_id', session.user.id)

      if (leasesError) throw leasesError

      // Ajouter les informations des biens aux locataires
      const tenantsWithProperties = tenants.map(tenant => {
        const tenantLeases = leases.filter(lease => lease.tenant_id === tenant.id)
        const properties = tenantLeases.map(lease => ({
          ...lease.properties,
          lease_start: lease.lease_start,
          lease_end: lease.lease_end,
          lease_id: lease.id
        }))
        
        return {
          ...tenant,
          properties: properties,
          leases: tenantLeases
        }
      })

      setTenants(tenantsWithProperties)
    } catch (error) {
      console.error('Error fetching tenants:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les locataires",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTenants()
  }, [refreshKey])

  return (
    <PageTransition className="min-h-screen flex flex-col gap-10 px-0 md:px-0">
      <PageHeader
        title="Locataires"
        buttonText="Ajouter un locataire"
        buttonIcon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-2 btn-add-icon"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        }
        onButtonClick={() => {
          setSelectedTenantId(null)
          setIsAddModalOpen(true)
        }}
        className="mb-6 mt-2 px-0"
      />
      <div className="space-y-8">
        {/* Actions */}
        <motion.div 
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={handleExport}
                variant="outline"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-4 w-4 mr-2" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exporter
              </Button>
            </motion.div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <span className="text-sm text-gray-600">Filtrer :</span>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Tous les locataires" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les locataires</SelectItem>
                <SelectItem value="active">Avec bail actif</SelectItem>
                <SelectItem value="inactive">Sans bail actif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div 
          className="flex items-center space-x-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <div className="relative">
            <Input 
              type="text" 
              placeholder="Rechercher..." 
              className="pl-10 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          <AnimatedCard className="overflow-hidden" delay={0.4}>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center items-center py-16">
                  <LoadingSpinner size={50} />
                </div>
              ) : (
                <TenantTable 
                  key={refreshKey}
                  searchQuery={searchQuery}
                  filterStatus={filterStatus}
                  onView={handleViewTenant}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  tenants={tenants}
                  isLoading={isLoading}
                />
              )}
            </CardContent>
          </AnimatedCard>
        </motion.div>

        <TenantModal 
          isOpen={isAddModalOpen}
          onClose={handleModalClose}
          tenantId={selectedTenantId}
        />

        <DeleteModal 
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false)
            setSelectedTenantId(null)
          }}
          tenantId={selectedTenantId}
          onSuccess={() => setRefreshKey(prev => prev + 1)}
        />
      </div>
    </PageTransition>
  )
}
