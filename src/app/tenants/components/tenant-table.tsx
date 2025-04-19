'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Database } from '@/types/database'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { motion } from 'framer-motion'

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

export interface TenantTableProps {
  searchQuery: string;
  filterStatus: string;
  onView?: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  tenants: TenantWithProperties[];
  isLoading: boolean;
}

export default function TenantTable({
  searchQuery,
  filterStatus,
  onView,
  onEdit,
  onDelete,
  tenants,
  isLoading
}: TenantTableProps) {
  
  // Filtrer les locataires en fonction de la recherche
  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = 
      tenant.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.phone?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const hasProperty = tenant.properties && tenant.properties.length > 0;
    
    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'with-property') return matchesSearch && hasProperty;
    if (filterStatus === 'without-property') return matchesSearch && !hasProperty;
    
    return matchesSearch;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: fr });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
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
          {filteredTenants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                Aucun locataire trouvé
              </TableCell>
            </TableRow>
          ) : (
            filteredTenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 016 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <div>
                      {tenant.first_name} {tenant.last_name}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{tenant.email}</TableCell>
                <TableCell>{tenant.phone || 'N/A'}</TableCell>
                <TableCell>
                  {tenant.properties && tenant.properties.length > 0 ? (
                    <div className="space-y-1">
                      {tenant.properties.map((property) => (
                        <div key={property.id} className="flex items-center">
                          <Badge variant={property.status === 'rented' ? 'success' : 'secondary'} className="mr-2">
                            {property.status === 'rented' ? 'Loué' : 'Vacant'}
                          </Badge>
                          <span>{property.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-500">Aucun bien</span>
                  )}
                </TableCell>
                <TableCell>
                  {tenant.leases && tenant.leases.length > 0 ? (
                    <div className="space-y-1">
                      {tenant.leases.map((lease) => (
                        <div key={lease.id} className="text-sm">
                          <div>
                            <Badge variant="outline" className="mr-1">Actif</Badge>
                            <span>{formatDate(lease.lease_start)}</span>
                            {lease.lease_end && (
                              <span> → {formatDate(lease.lease_end)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-500">Aucun bail</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    {onView && (
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
                    )}
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
            ))
          )}
        </TableBody>
      </Table>
      <div className="mt-4 text-sm text-gray-500">
        Affichage de {filteredTenants.length} sur {tenants.length} locataires
      </div>
    </div>
  )
}
