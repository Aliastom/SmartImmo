'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from 'next/navigation'

interface TenantTableProps {
  searchQuery: string
  filterStatus: string
  onView: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

type Tenant = Database['public']['Tables']['tenants']['Row']
type Lease = Database['public']['Tables']['leases']['Row']

export function TenantTable({ searchQuery, filterStatus, onView, onEdit, onDelete }: TenantTableProps) {
  const [tenants, setTenants] = useState<(Tenant & { properties?: { name: string }[], leases?: Lease[] })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        // Récupérer les locataires
        const { data: tenantsData, error } = await supabase
          .from('tenants')
          .select('*')
          .eq('user_id', session.user.id)
          .order('last_name', { ascending: true })

        if (error) throw error

        // Pour chaque locataire, récupérer les baux et les biens associés
        const tenantsWithProperties = await Promise.all(
          tenantsData.map(async (tenant) => {
            // Récupérer les baux du locataire
            const { data: leases, error: leaseError } = await supabase
              .from('leases')
              .select(`
                *,
                properties:property_id (
                  id,
                  name
                )
              `)
              .eq('tenant_id', tenant.id)
              .eq('user_id', session.user.id)

            if (leaseError) {
              console.error('Erreur lors de la récupération des baux:', leaseError)
              return { ...tenant, properties: [], leases: [] }
            }

            // Extraire les propriétés des baux
            const properties = leases
              .map(lease => lease.properties)
              .filter(property => property !== null) as { id: string, name: string }[]

            return {
              ...tenant,
              properties,
              leases
            }
          })
        )

        setTenants(tenantsWithProperties)
      } catch (error: any) {
        console.error('Error:', error)
        toast({
          title: "Erreur",
          description: error.message || "Impossible de charger les locataires",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchTenants()

    // S'abonner aux changements en temps réel
    const tenantChannel = supabase
      .channel('tenant-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tenants'
      }, () => {
        fetchTenants()
      })
      .subscribe()

    const leaseChannel = supabase
      .channel('lease-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leases'
      }, () => {
        fetchTenants()
      })
      .subscribe()

    return () => {
      tenantChannel.unsubscribe()
      leaseChannel.unsubscribe()
    }
  }, [supabase, router, toast])

  // Filtrer les locataires
  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = 
      tenant.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.properties?.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())) || false

    // Un locataire est actif s'il a au moins un bail actif
    const hasActiveLease = tenant.leases?.some(lease => 
      lease.lease_end ? new Date(lease.lease_end) > new Date() : true
    ) || false

    if (filterStatus === "all") return matchesSearch
    if (filterStatus === "active") return matchesSearch && hasActiveLease
    if (filterStatus === "inactive") return matchesSearch && !hasActiveLease
    return matchesSearch
  })

  if (isLoading) {
    return <div className="p-8 text-center">Chargement...</div>
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="p-3 text-sm font-medium text-gray-500 uppercase">
              <div className="flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 016 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Nom</span>
              </div>
            </TableHead>
            <TableHead className="p-3 text-sm font-medium text-gray-500 uppercase">
              <div className="flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Email</span>
              </div>
            </TableHead>
            <TableHead className="p-3 text-sm font-medium text-gray-500 uppercase">
              <div className="flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>Téléphone</span>
              </div>
            </TableHead>
            <TableHead className="p-3 text-sm font-medium text-gray-500 uppercase">
              <div className="flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Biens</span>
              </div>
            </TableHead>
            <TableHead className="p-3 text-sm font-medium text-gray-500 uppercase">
              <div className="flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Baux</span>
              </div>
            </TableHead>
            <TableHead className="p-3 text-sm font-medium text-gray-500 uppercase text-right">
              <div className="flex items-center space-x-2 justify-end">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
                <span>Actions</span>
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTenants.map((tenant) => {
            // Un locataire est actif s'il a au moins un bail actif
            const hasActiveLease = tenant.leases?.some(lease => 
              lease.lease_end ? new Date(lease.lease_end) > new Date() : true
            ) || false

            return (
              <TableRow key={tenant.id} className="group hover:bg-gray-50">
                <TableCell className="text-sm text-gray-500">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 016 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {tenant.first_name} {tenant.last_name}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-500">{tenant.email}</TableCell>
                <TableCell className="text-sm text-gray-500">{tenant.phone}</TableCell>
                <TableCell className="text-sm text-gray-500">
                  {tenant.properties && tenant.properties.length > 0 ? (
                    <div className="space-y-1">
                      {tenant.properties.map((property, index) => (
                        <div key={index} className="text-xs">
                          {property.name}
                        </div>
                      ))}
                    </div>
                  ) : (
                    'Aucun bien'
                  )}
                </TableCell>
                <TableCell>
                  {tenant.leases && tenant.leases.length > 0 ? (
                    <div className="space-y-2">
                      {tenant.leases.map((lease, index) => (
                        <div key={index} className="space-y-1">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            lease.lease_end ? (new Date(lease.lease_end) > new Date() ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800") : "bg-green-100 text-green-800"
                          }`}>
                            {lease.lease_end ? (new Date(lease.lease_end) > new Date() ? "Actif" : "Terminé") : "Actif"}
                          </span>
                          <div className="text-xs text-gray-500">
                            {new Date(lease.lease_start).toLocaleDateString('fr-FR')}
                            {lease.lease_end && (
                              <> → {new Date(lease.lease_end).toLocaleDateString('fr-FR')}</>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">Aucun bail</span>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="hover:bg-gray-100"
                      onClick={() => onView(tenant.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="hover:bg-gray-100"
                      onClick={() => onEdit(tenant.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      onClick={() => onDelete(tenant.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}

          {filteredTenants.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                Aucun locataire trouvé
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {filteredTenants.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="text-sm text-gray-500">
            Affichage de <span className="font-medium">1</span> à{" "}
            <span className="font-medium">{filteredTenants.length}</span> sur{" "}
            <span className="font-medium">{filteredTenants.length}</span> locataires
          </div>
        </div>
      )}
    </div>
  )
}
