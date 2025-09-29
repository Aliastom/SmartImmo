'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from "@/components/ui/button";
import { generateLeasePDF, type LeaseData } from '@/lib/lease-pdf-generator';
import { MoreHorizontal } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Lease {
  id: string;
  property: {
    property_type?: string;
    address: string;
    area?: number;
    floor?: number;
    rooms?: number;
    dpe_class?: string;
    year_built?: string;
    has_elevator?: boolean;
    has_garage?: boolean;
    has_parking?: boolean;
    has_balcony?: boolean;
    has_terrace?: boolean;
    has_garden?: boolean;
    energy_consumption?: number;
    energy_consumption_year?: number;
  };
  landlord: {
    name: string;
    address: string;
    email?: string;
    phone?: string;
    is_company?: boolean;
    siret?: string;
  };
  tenant: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    birth_date?: string;
    birth_place?: string;
    guarantor_name?: string;
    guarantor_address?: string;
    current_address?: string;
  };
  duration: {
    start_date: string;
    end_date?: string;
    lease_start?: string;
    lease_end?: string;
  };
  financial: {
    rent: number;
    charges: number;
    security_deposit: number;
    payment_method: string;
    payment_day: number;
    insurance_required: boolean;
    insurance_company?: string;
    insurance_policy_number?: string;
    charges_provision?: number;
  };
  conditions: {
    entry_inventory_date?: string;
    entry_condition?: string;
    works_planned?: string;
    works_completed?: string;
  };
  documents: {
    dpe_available: boolean;
    lead_report_available: boolean;
    asbestos_report_available: boolean;
    electricity_report_available: boolean;
    gas_report_available: boolean;
    natural_risks_report_available: boolean;
  };
  created_at: string;
  updated_at: string;
}

interface LeaseListProps {
  leases: Lease[];
  isLoading: boolean;
  onEdit: (lease: Lease) => void;
  onDelete: (leaseId: string) => void;
}

export function LeaseList({ leases, isLoading, onEdit, onDelete }: LeaseListProps) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState<string | null>(null);

  const handleGeneratePDF = async (lease: Lease) => {
    try {
      setIsSending(lease.id);
      
      const leaseData: LeaseData = {
        id: lease.id,
        title: 'CONTRAT DE BAIL D\'HABITATION',
        property: {
          type: lease.property?.property_type || 'Appartement',
          address: {
            street: lease.property?.address || 'Adresse non spécifiée',
            postalCode: '75000',
            city: 'Paris',
            country: 'France'
          },
          area: lease.property?.area || 0,
          floor: lease.property?.floor,
          description: lease.property?.address || '',
          rooms: lease.property?.rooms
        },
        landlord: {
          firstName: lease.landlord?.name?.split(' ')[0] || 'Prénom',
          lastName: lease.landlord?.name?.split(' ').slice(1).join(' ') || 'Nom',
          phone: lease.landlord?.phone || '',
          email: lease.landlord?.email || '',
          address: {
            street: lease.landlord?.address || '',
            postalCode: '',
            city: '',
            country: 'France'
          }
        },
        tenant: {
          firstName: lease.tenant?.first_name || 'Prénom',
          lastName: lease.tenant?.last_name || 'Nom',
          birthDate: lease.tenant?.birth_date ? new Date(lease.tenant.birth_date) : new Date(),
          birthPlace: lease.tenant?.birth_place || 'Lieu de naissance non spécifié',
          phone: lease.tenant?.phone || '',
          email: lease.tenant?.email || '',
          address: {
            street: lease.tenant?.current_address || '',
            postalCode: '',
            city: '',
            country: 'France'
          }
        },
        period: {
          startDate: lease.duration?.start_date ? new Date(lease.duration.start_date) : new Date(),
          endDate: lease.duration?.end_date ? new Date(lease.duration.end_date) : 
            new Date(new Date(lease.duration?.start_date || new Date()).setFullYear(new Date(lease.duration?.start_date || new Date()).getFullYear() + 3)),
          noticePeriod: 3
        },
        financialTerms: {
          rent: lease.financial?.rent || 0,
          charges: lease.financial?.charges || 0,
          deposit: lease.financial?.security_deposit || 0,
          paymentDueDay: lease.financial?.payment_day || 5,
          indexationClause: true,
          chargesIncluded: ['Eau froide', 'Chauffage collectif']
        },
        specialClauses: [],
        createdAt: new Date()
      };

      const pdfArrayBuffer = await generateLeasePDF(leaseData, 'buffer');
      if (!pdfArrayBuffer) throw new Error('Échec de la génération du PDF');
      
      const blob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bail-${lease.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
      
      toast({ title: 'Succès', description: 'Le PDF a été généré avec succès' });
    } catch (error) {
      console.error('Erreur lors de la génération du PDF :', error);
      toast({ 
        title: 'Erreur', 
        description: 'Une erreur est survenue lors de la génération du PDF', 
        variant: 'destructive' 
      });
    } finally {
      setIsSending(null);
    }
  };

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Adresse</TableHead>
            <TableHead>Locataire</TableHead>
            <TableHead>Prix</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-4">
                Chargement des baux...
              </TableCell>
            </TableRow>
          ) : leases.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-4">
                Aucun bail trouvé
              </TableCell>
            </TableRow>
          ) : (
            leases.map((lease) => (
              <TableRow key={lease.id}>
                <TableCell className="font-medium">{lease.id}</TableCell>
                <TableCell>{lease.property.address}</TableCell>
                <TableCell>{lease.tenant?.first_name} {lease.tenant?.last_name}</TableCell>
                <TableCell>{lease.financial?.rent?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</TableCell>
                <TableCell>
                  <Badge variant="outline">Actif</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Ouvrir le menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem 
                        onClick={() => handleGeneratePDF(lease)}
                        disabled={isSending === lease.id}
                      >
                        {isSending === lease.id ? 'Génération...' : 'Télécharger le bail'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(lease)}>
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => onDelete(lease.id)}
                      >
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
