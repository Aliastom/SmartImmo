'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from "@/components/ui/button";
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
  lease_start: string;
  lease_end: string | null;
  rent: number;
  charges_provision: number | null;
  security_deposit: number;
  signature_place: string | null;
  property: {
    name: string | null;
    address: string;
    property_type: string | null;
    furnishing: string | null;
    area: number | null;
  };
  tenant: {
    first_name: string;
    last_name: string;
    email: string;
    birth_date: string | null;
    birth_place: string | null;
  };
  document_url?: string;
}

interface LeaseListProps {
  leases: Lease[];
  isLoading: boolean;
  onEdit: (lease: Lease) => void;
  onDelete: (id: string) => void;
}

export function LeaseList({ leases, isLoading, onEdit, onDelete }: LeaseListProps) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState<string | null>(null);
  
  const handleGeneratePDF = async (lease: Lease) => {
    setIsSending(lease.id);
    // Désactivé temporairement en raison de problèmes de dépendances
    toast({
      title: 'Fonctionnalité temporairement désactivée',
      description: 'La génération de PDF est actuellement en cours de maintenance.',
      variant: 'destructive',
    });
    setIsSending(null);
  };

  if (isLoading) {
    return <div>Chargement des baux...</div>;
  }

  if (leases.length === 0) {
    return <div>Aucun bail trouvé.</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Adresse</TableHead>
            <TableHead>Locataire</TableHead>
            <TableHead>Période</TableHead>
            <TableHead>Loyer</TableHead>
            <TableHead>État</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leases.map((lease) => (
            <TableRow key={lease.id}>
              <TableCell className="font-medium">
                {lease.property?.address}
              </TableCell>
              <TableCell>
                {lease.tenant?.first_name} {lease.tenant?.last_name}
              </TableCell>
              <TableCell>
                {new Date(lease.lease_start).toLocaleDateString('fr-FR')}
                {lease.lease_end && ` - ${new Date(lease.lease_end).toLocaleDateString('fr-FR')}`}
              </TableCell>
              <TableCell>
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(lease.rent)}
                {lease.charges_provision && ` + ${lease.charges_provision}€ de charges`}
              </TableCell>
              <TableCell>
                <Badge variant={!lease.lease_end || new Date(lease.lease_end) > new Date() ? 'default' : 'destructive'}>
                  {!lease.lease_end || new Date(lease.lease_end) > new Date() ? 'Actif' : 'Expiré'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => handleGeneratePDF(lease)}
                      disabled={!!isSending}
                    >
                      {isSending === lease.id ? 'Génération...' : 'Générer PDF'}
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
