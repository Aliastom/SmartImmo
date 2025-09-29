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
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/database';

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
};

interface LeaseListProps {
  leases: Lease[];
  isLoading: boolean;
  onEdit: (lease: Lease) => void;
  onDelete: (leaseId: string) => void;
}

export function LeaseList({ leases, isLoading, onEdit, onDelete }: LeaseListProps) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState<string | null>(null);
  const supabase = createClientComponentClient<Database>();

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
          .single();
          
        if (error) return;
        
        const fullName = (profile as any)?.landlord_name || 
          [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
        setLandlord(fullName);
      } catch (e) {
        // silent fail; landlord info is optional
      }
    };
    
    loadProfile();
  }, [supabase]);

  const handleSendEmail = async (lease: Lease) => {
    if (!lease.id) return;
    
    setIsSending(lease.id);
    try {
      // Préparer les données pour le PDF
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
          firstName: landlord ? landlord.split(' ')[0] : 'Prénom',
          lastName: landlord ? landlord.split(' ').slice(1).join(' ') : 'Nom',
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
          charges: lease.financial?.charges_provision || 0,
          deposit: lease.financial?.security_deposit || 0,
          paymentDueDay: 5,
          indexationClause: true,
          chargesIncluded: ['Eau froide', 'Chauffage collectif']
        },
        specialClauses: [],
        createdAt: new Date()
      };
      
      // Générer le PDF en mémoire
      const pdfArrayBuffer = await generateLeasePDF(leaseData, 'buffer');
      
      if (!pdfArrayBuffer) {
        throw new Error('Échec de la génération du PDF');
      }
      
      // Convertir en base64 pour l'envoi par email
      const pdfBase64 = btoa(
        new Uint8Array(pdfArrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      // Envoyer l'email avec le PDF en pièce jointe
      const response = await fetch('/api/send-lease', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: lease.tenant?.email,
          subject: `Votre contrat de bail - ${lease.property?.name || 'Sans titre'}`,
          pdfBase64: pdfBase64,
          leaseId: lease.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi de l\'email');
      }

      toast({
        title: 'Succès',
        description: 'Le bail a été envoyé par email avec succès',
      });
    } catch (error) {
      console.error('Erreur lors de l\'envoi du bail par email:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de l\'envoi du bail par email',
        variant: 'destructive',
      });
    } finally {
      setIsSending(null);
    }
  };

  // Fonction utilitaire pour formater une date en français
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Non spécifiée';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Paris'
    });
  };

// Formatage de la monnaie
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);
};

// Formatage des dates en français
const formatDate = (dateString?: string): string => {
  if (!dateString) return 'Non spécifié';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  });
};

// Composant principal de la liste des baux
export function LeaseList({ leases, isLoading, onEdit, onDelete }: LeaseListProps) {
  const { toast } = useToast();

  // Gestion de la génération du PDF
  const handleGeneratePDF = async (lease: Lease) => {
    try {
      // Préparer les données pour le PDF
      const leaseData: LeaseData = {
        id: lease.id,
        title: 'CONTRAT DE BAIL D\'HABITATION',
        property: {
          type: lease.property?.property_type || 'Appartement',
          address: {
            street: lease.property?.address || 'Adresse non spécifiée',
            postalCode: '75000',
            city: 'Paris',
            country: 'France',
          },
          area: lease.property?.area || 0,
          floor: lease.property?.floor,
          description: lease.property?.address || '',
          rooms: lease.property?.rooms,
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
            country: 'France',
          },
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
            country: 'France',
          },
        },
        period: {
          startDate: lease.duration?.start_date ? new Date(lease.duration.start_date) : new Date(),
          endDate: lease.duration?.end_date
            ? new Date(lease.duration.end_date)
            : new Date(
                new Date(lease.duration?.start_date || new Date()).setFullYear(
                  new Date(lease.duration?.start_date || new Date()).getFullYear() + 3
                )
              ),
          noticePeriod: 3,
        },
        financialTerms: {
          rent: lease.financial?.rent || 0,
          charges: lease.financial?.charges || 0,
          deposit: lease.financial?.security_deposit || 0,
          paymentDueDay: lease.financial?.payment_day || 5,
          indexationClause: true,
          chargesIncluded: ['Eau froide', 'Chauffage collectif'],
        },
        specialClauses: [],
        createdAt: new Date(),
      };

      // Générer le PDF en mémoire
      const pdfArrayBuffer = await generateLeasePDF(leaseData, 'buffer');

      if (!pdfArrayBuffer) {
        throw new Error('Échec de la génération du PDF');
      }

      // Créer un blob à partir du buffer
      const blob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      // Créer un lien de téléchargement
      const a = document.createElement('a');
      a.href = url;
      a.download = `bail-${lease.id}.pdf`;
      document.body.appendChild(a);
      a.click();

      // Nettoyer
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);

      // Afficher un message de succès
      toast({
        title: 'Succès',
        description: 'Le PDF a été généré avec succès',
      });
    } catch (error) {
      console.error('Erreur lors de la génération du PDF :', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la génération du PDF',
        variant: 'destructive',
      });
    }
  };    month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Paris'
    });
  };
    
  const handleGeneratePDF = async (lease: Lease) => {
    try {
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
    }
  };
    
    if (y > pageHeight && pageBreak) {
      doc.addPage();
      y = 45; // Réinitialiser Y après un saut de page
    }
          day: 'numeric',
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
        charges: lease.financial?.charges_provision || 0,
        deposit: lease.financial?.security_deposit || 0,
        paymentDueDay: 5,
        indexationClause: true,
        chargesIncluded: ['Eau froide', 'Chauffage collectif']
      },
      specialClauses: [],
      createdAt: new Date()
          { align: 'center' }
        );
      };
      
      // La génération du PDF est maintenant gérée par la fonction generateLeasePDF
      
      // Détails du bailleur
      currentY = addText(lease.landlord.name, 25, currentY + 10);
      currentY = addText(lease.landlord.address, 25, currentY + 5);
      
      // Numéro de page
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Page ${pageNumber} sur ${totalPages}`, 
        pageWidth / 2, 
        pageHeight - 15, 
        { align: 'center' }
      );
    };
    
    // ===== GÉNÉRATION DU PDF =====
    // La génération du PDF est maintenant gérée par la fonction generateLeasePDF
    
    // Logo ou image
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    currentY = addText('ENTRE LES SOUSSIGNÉS :', 20, currentY + 10, { style: 'bold' });
    
    // Section Bailleur avec fond coloré
    doc.setFillColor(240, 240, 240);
    doc.rect(20, currentY, 170, 10, 'F');
    currentY = addText('LE BAILLEUR :', 25, currentY + 7, { style: 'bold' });
    
    // Détails du bailleur
    currentY = addText(lease.landlord.name, 25, currentY + 10);
    currentY = addText(lease.landlord.address, 25, currentY + 5);
    if (lease.landlord.siret) {
      currentY = addText(`SIRET: ${lease.landlord.siret}`, 25, currentY + 5);
    }
    if (lease.landlord.phone) {
      currentY = addText(`Tél: ${lease.landlord.phone}`, 25, currentY + 5);
    }
    if (lease.landlord.email) {
      currentY = addText(`Email: ${lease.landlord.email}`, 25, currentY + 5);
    }
    
    // Section Locataire avec fond coloré
    currentY += 10;
    doc.setFillColor(240, 240, 240);
    doc.rect(20, currentY, 170, 10, 'F');
    currentY = addText('LE(S) LOCATAIRE(S) :', 25, currentY + 7, { style: 'bold' });
    
    // Détails du locataire
    currentY = addText(`${lease.tenant.first_name} ${lease.tenant.last_name}`, 25, currentY + 10);
    if (lease.tenant.birth_date) {
      currentY = addText(`Né(e) le: ${formatDate(lease.tenant.birth_date)}`, 25, currentY + 5);
    }
    if (lease.tenant.birth_place) {
      currentY = addText(`À: ${lease.tenant.birth_place}`, 25, currentY + 5);
    }
    currentY = addText(`Adresse: ${lease.tenant.current_address || 'Non spécifiée'}`, 25, currentY + 5);
    
    // Garant si spécifié
    if (lease.tenant.guarantor_name) {
      currentY += 10;
      doc.setFillColor(240, 240, 240);
      doc.rect(20, currentY, 170, 10, 'F');
      currentY = addText('GARANT :', 25, currentY + 7, { style: 'bold' });
      
      currentY = addText(lease.tenant.guarantor_name, 25, currentY + 10);
      if (lease.tenant.guarantor_address) {
        currentY = addText(`Adresse: ${lease.tenant.guarantor_address}`, 25, currentY + 5);
      }
    }
    
    // ===== PAGE 2 - OBJET DU CONTRAT =====
    doc.addPage();
    currentY = addHeader(doc, 'OBJET DU CONTRAT', 'ARTICLE 1 - DÉSIGNATION DU BIEN LOUÉ');
    
    // Description du bien
    currentY = addText('Le présent contrat a pour objet la location du bien décrit ci-après :', 20, currentY + 10);
    
    // Détails du bien
    currentY = addText('Type de bien : ' + (lease.property.property_type || 'Non spécifié'), 25, currentY + 10);
    // Render the leases table
    return (
    }
    
    if (lease.property.rooms) {
      currentY = addText(`Nombre de pièces : ${lease.property.rooms}`, 25, currentY + 5);
    }
    
    if (lease.property.floor !== undefined) {
      const floorText = lease.property.floor === 0 
        ? 'Rez-de-chaussée' 
        : `Étage n°${lease.property.floor}`;
      currentY = addText(`Étage : ${floorText}`, 25, currentY + 5);
    }
    
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
      
      // Détails du bien
      currentY = addText('Type de bien : ' + (lease.property.property_type || 'Non spécifié'), 25, currentY + 10);
      currentY = addText('Adresse : ' + lease.property.address, 25, currentY + 5);
      
      if (lease.property.area) {
        currentY = addText(`Surface habitable : ${lease.property.area} m²`, 25, currentY + 5);
      }
      
      if (lease.property.rooms) {
        currentY = addText(`Nombre de pièces : ${lease.property.rooms}`, 25, currentY + 5);
      }
      
      if (lease.property.floor !== undefined) {
        const floorText = lease.property.floor === 0 
          ? 'Rez-de-chaussée' 
          : `Étage n°${lease.property.floor}`;
        currentY = addText(`Étage : ${floorText}`, 25, currentY + 5);
      }
      
      // Équipements
      const equipments = [];
      if (lease.property.has_elevator) equipments.push('Ascenseur');
      if (lease.property.has_garage) equipments.push('Garage');
      if (lease.property.has_parking) equipments.push('Place de parking');
      if (lease.property.has_balcony) equipments.push('Balcon');
      if (lease.property.has_terrace) equipments.push('Terrasse');
      if (lease.property.has_garden) equipments.push('Jardin');
      
      if (equipments.length > 0) {
        currentY = addText('Équipements : ' + equipments.join(', '), 25, currentY + 5);
      }
      
      // DPE
      if (lease.property.dpe_class) {
        currentY = addText(`Classe DPE : ${lease.property.dpe_class}`, 25, currentY + 5);
      }
      
      if (lease.property.energy_consumption) {
        currentY = addText(
          `Consommation énergétique : ${lease.property.energy_consumption} kWh/m²/an (${lease.property.energy_consumption_year || 'année de référence'})`, 
          25, 
          currentY + 5
        );
      }
      
      // Destination des lieux
      currentY = addSectionHeader('ARTICLE 2 - DESTINATION DES LIEUX', currentY + 10);
      currentY = addText(
        'Le présent contrat est consenti à usage exclusif d\'habitation principale. Le locataire ne pourra en faire usage pour un autre but sans l\'accord écrit du bailleur.',
        20, 
        currentY + 5
      );
      
      // Durée du bail
      currentY = addSectionHeader('ARTICLE 3 - DURÉE DU BAIL', currentY + 10);
      currentY = addText(
        `Le présent bail est consenti pour une durée de 3 ans à compter du ${formatDate(lease.duration.start_date)}.`,
        20, 
        currentY + 5
      );
      
      if (lease.duration.end_date) {
        currentY = addText(
          `Il prendra fin le ${formatDate(lease.duration.end_date)}.`,
          20, 
          currentY + 5
        );
      } else {
        currentY = addText(
          'Il se renouvellera par tacite reconduction par périodes triennales, sauf dénonciation par l\'une ou l\'autre des parties dans les délais légaux.',
          20, 
          currentY + 5
        );
      }
      
      // Ajout du pied de page
      addFooter(doc, 2, 8);
      
      // ===== PAGE 3 - CONDITIONS FINANCIÈRES =====
      doc.addPage();
      currentY = addHeader(doc, 'CONDITIONS FINANCIÈRES');
      
      // Loyer et charges
      currentY = addSectionHeader('ARTICLE 4 - LOYER ET CHARGES', currentY);
      currentY = addText(
        `Le loyer mensuel est fixé à la somme de ${formatCurrency(lease.financial.rent)} (${lease.financial.rent.toLocaleString('fr-FR')} euros) hors charges.`,
        20, 
        currentY + 5
      );
      
      currentY = addText(
        `Une provision sur charges mensuelles est fixée à ${formatCurrency(lease.financial.charges)} (${lease.financial.charges.toLocaleString('fr-FR')} euros).`,
        20, 
        currentY + 5
      );
      
      currentY = addText(
        `Soit un total de ${formatCurrency(lease.financial.rent + lease.financial.charges)} (${(lease.financial.rent + lease.financial.charges).toLocaleString('fr-FR')} euros) charges comprises.`,
        20, 
        currentY + 5
      );
      
      // Modalités de paiement
      currentY = addSectionHeader('ARTICLE 5 - MODALITÉS DE PAIEMENT', currentY + 10);
      currentY = addText(
        `Le loyer est payable mensuellement à terme échu, le ${lease.financial.payment_day} de chaque mois.`,
        20, 
        currentY + 5
      );
      
      currentY = addText(
        `Le paiement s'effectuera par ${lease.financial.payment_method}.`,
        20, 
        currentY + 5
      );
      
      // Dépôt de garantie
      currentY = addSectionHeader('ARTICLE 6 - DÉPÔT DE GARANTIE', currentY + 10);
      currentY = addText(
        `Un dépôt de garantie est fixé à ${formatCurrency(lease.financial.security_deposit)} (${lease.financial.security_deposit.toLocaleString('fr-FR')} euros).`,
        20, 
        currentY + 5
      );
      
      currentY = addText(
        'Il sera restitué dans un délai maximum de 2 mois à compter de la restitution des clés, déduction faite des sommes restant dues au bailleur et des éventuels dommages constatés à l\'état des lieux de sortie.',
        20, 
        currentY + 5
      );
      
      // Assurance
      currentY = addSectionHeader('ARTICLE 7 - ASSURANCE', currentY + 10);
      
      if (lease.financial.insurance_required) {
        currentY = addText(
          'Le locataire est tenu de souscrire une assurance garantissant les risques locatifs (incendie, dégâts des eaux, etc.) pour le compte du bailleur.',
          20, 
          currentY + 5
        );
        
        if (lease.financial.insurance_company && lease.financial.insurance_policy_number) {
          currentY = addText(
            `Assureur : ${lease.financial.insurance_company} - N° de police : ${lease.financial.insurance_policy_number}`,
            20, 
            currentY + 5
          );
        }
      } else {
        currentY = addText(
          'Le locataire n\'est pas tenu de souscrire une assurance spécifique, mais reste responsable des dommages causés au bien loué.',
          20, 
          currentY + 5
        );
      }
      
      // Ajout du pied de page
      addFooter(doc, 3, 8);
      
      // ===== PAGE 4 - ÉTAT DES LIEUX ET ENTRETIEN =====
      doc.addPage();
      currentY = addHeader(doc, 'ÉTAT DES LIEUX ET ENTRETIEN');
      
      // État des lieux
      currentY = addSectionHeader('ARTICLE 8 - ÉTAT DES LIEUX', currentY);
      
      if (lease.conditions.entry_inventory_date) {
        currentY = addText(
          `Un état des lieux d'entrée a été établi le ${formatDate(lease.conditions.entry_inventory_date)}.`,
          20, 
          currentY + 5
        );
        
        if (lease.conditions.entry_condition) {
          currentY = addText(
            `État des lieux : ${lease.conditions.entry_condition}`,
            20, 
            currentY + 5
          );
        }
      } else {
        currentY = addText(
          'Un état des lieux d\'entrée sera établi lors de la remise des clés, conformément aux dispositions légales en vigueur.',
          20, 
          currentY + 5
        );
      }
      
      // Entretien et réparations
      currentY = addSectionHeader('ARTICLE 9 - ENTRETIEN ET RÉPARATIONS', currentY + 10);
      
      currentY = addText(
        'Le locataire est tenu d\'entretenir les lieux loués et de réparer les dégradations qu\'il pourrait causer. Les réparations locatives restent à sa charge, conformément à l\'article 1754 du Code civil.',
        20, 
        currentY + 5
      );
      
      // Travaux
      if (lease.conditions.works_planned || lease.conditions.works_completed) {
        currentY = addSectionHeader('ARTICLE 10 - TRAVAUX', currentY + 10);
        
        if (lease.conditions.works_completed) {
          currentY = addText(
            'Les travaux suivants ont été effectués avant l\'entrée dans les lieux :',
            20, 
            currentY + 5
          );
          
          currentY = addText(
            lease.conditions.works_completed,
            25, 
            currentY + 5
          );
        }
        
        if (lease.conditions.works_planned) {
          currentY = addText(
            'Les travaux suivants sont prévus pendant la durée du bail :',
            20, 
            currentY + 10
          );
          
          currentY = addText(
            lease.conditions.works_planned,
            25, 
            currentY + 5
          );
        }
      }
      
      // Ajout du pied de page
      addFooter(doc, 4, 8);
      
      // ===== PAGE 5 - DOCUMENTS ANNEXES =====
      doc.addPage();
      currentY = addHeader(doc, 'DOCUMENTS ANNEXES');
      
      currentY = addSectionHeader('ARTICLE 11 - DOCUMENTS REMIS', currentY);
      
      const documents = [
        { name: 'Diagnostic de performance énergétique (DPE)', available: lease.documents.dpe_available },
        { name: 'État des risques et pollutions (ERP)', available: true },
        { name: 'Constat de risque d\'exposition au plomb', available: lease.documents.lead_report_available },
        { name: 'État d\'amiante', available: lease.documents.asbestos_report_available },
        { name: 'État de l\'installation électrique', available: lease.documents.electricity_report_available },
        { name: 'État de l\'installation de gaz', available: lease.documents.gas_report_available },
        { name: 'État des risques naturels et technologiques', available: lease.documents.natural_risks_report_available },
      ];
      
      currentY = addText('Les documents suivants sont remis au locataire :', 20, currentY + 5);
      
      for (const docItem of documents) {
        if (docItem.available) {
          currentY = addText(`• ${docItem.name}`, 25, currentY + 5);
        }
      }
      
      // Dépôt de garantie
      currentY = addSectionHeader('ARTICLE 12 - DÉPÔT DE GARANTIE', currentY + 10);
      
      currentY = addText(
        `Un dépôt de garantie d'un montant de ${formatCurrency(lease.financial.security_deposit)} (${lease.financial.security_deposit.toLocaleString('fr-FR')} euros) est versé par le locataire au moment de la signature du présent contrat.`,
        20, 
        currentY + 5
      );
      
      currentY = addText(
        'Ce dépôt sera restitué dans un délai maximum de deux mois à compter de la remise des clés, déduction faite, le cas échéant, des sommes restant dues au bailleur et des sommes correspondant aux dégradations constatées lors de l\'état des lieux de sortie.',
        20, 
        currentY + 5
      );
      
      // Ajout du pied de page
      addFooter(doc, 5, 8);
      
      // ===== PAGE 6 - RÉSILIATION ET FIN DE BAIL =====
      doc.addPage();
      currentY = addHeader(doc, 'RÉSILIATION ET FIN DE BAIL');
      
      // Congé et préavis
      currentY = addSectionHeader('ARTICLE 13 - CONGÉ ET PRÉAVIS', currentY);
      
      currentY = addText(
        'En cas de résiliation à l\'initiative du locataire, celui-ci est tenu de respecter un préavis de trois mois.',
        20, 
        currentY + 5
      );
      
      currentY = addText(
        'En cas de résiliation à l\'initiative du bailleur, celui-ci est tenu de respecter un préavis de six mois, sauf dans les cas prévus par la loi.',
        20, 
        currentY + 5
      );
      
      // Restitution des lieux
      currentY = addSectionHeader('ARTICLE 14 - RESTITUTION DES LIEUX', currentY + 10);
      
      currentY = addText(
        'À l\'expiration du bail, le locataire est tenu de restituer les lieux dans l\'état où il les a reçus, compte tenu de leur vétusté normale et des améliorations apportées avec l\'accord du bailleur.',
        20, 
        currentY + 5
      );
      
      currentY = addText(
        'Un état des lieux de sortie sera établi contradictoirement entre les parties. À défaut, l\'état des lieux d\'entrée fera foi.',
        20, 
        currentY + 5
      );
      
      // Droit de rétractation
      currentY = addSectionHeader('ARTICLE 15 - DROIT DE RÉTRACTATION', currentY + 10);
      
      currentY = addText(
        'Conformément à l\'article L. 121-20-4 du Code de la consommation, le locataire dispose d\'un délai de 14 jours à compter de la signature du présent contrat pour se rétracter, sans avoir à justifier de motifs ni à payer de pénalités.',
        20, 
        currentY + 5
      );
      
      // Ajout du pied de page
      addFooter(doc, 6, 8);
      
      // ===== PAGE 7 - DIVERS =====
      doc.addPage();
      currentY = addHeader(doc, 'DIVERS');
      
      // Élection de domicile
      currentY = addSectionHeader('ARTICLE 16 - ÉLECTION DE DOMICILE', currentY);
      
      currentY = addText(
        'Pour l\'exécution du présent contrat, les parties élisent domicile en leur demeure respective, telle que mentionnée dans le préambule du présent contrat.',
        20, 
        currentY + 5
      );
      
      // Loi applicable et juridiction compétente
      currentY = addSectionHeader('ARTICLE 17 - LOI APPLICABLE ET JURIDICTION COMPÉTENTE', currentY + 10);
      
      currentY = addText(
        'Le présent contrat est soumis au droit français. En cas de litige, les tribunaux du lieu de situation de l\'immeuble seront seuls compétents.',
        20, 
        currentY + 5
      );
      
      // Règlement amiable des litiges
      currentY = addSectionHeader('ARTICLE 18 - RÈGLEMENT AMIABLE DES LITIGES', currentY + 10);
      
      currentY = addText(
        'En cas de litige, les parties s\'engagent à rechercher une solution amiable avant toute action en justice. À défaut d\'accord amiable, le litige sera porté devant le tribunal compétent.',
        20, 
        currentY + 5
      );
      
      // Ajout du pied de page
      addFooter(doc, 7, 8);
      
      // ===== PAGE 8 - SIGNATURES =====
      doc.addPage();
      currentY = addHeader(doc, 'SIGNATURES');
      
      currentY = addText(
        'Fait en deux exemplaires originaux, à ___________________________________, le ________________',
        60, 
        currentY + 20,
        { align: 'center' }
      );
      
      // Signature du locataire
      currentY = addText('Le(s) Locataire(s) :', 40, currentY + 30, { style: 'bold' });
      
      doc.line(40, currentY + 10, 120, currentY + 10);
      currentY = addText('Nom et prénom :', 40, currentY + 20);
      
      doc.line(40, currentY + 10, 120, currentY + 10);
      currentY = addText('Signature :', 40, currentY + 20);
      
      // Signature du bailleur
      currentY = addText('Le Bailleur :', 40, currentY + 30, { style: 'bold' });
      
      doc.line(40, currentY + 10, 120, currentY + 10);
      currentY = addText('Nom et prénom :', 40, currentY + 20);
      
      doc.line(40, currentY + 10, 120, currentY + 10);
      currentY = addText('Signature :', 40, currentY + 20);
      
      // Signature du garant (si applicable)
      if (lease.tenant.guarantor_name) {
        currentY = addText('Le Garant :', 40, currentY + 30, { style: 'bold' });
        
        doc.line(40, currentY + 10, 120, currentY + 10);
        currentY = addText('Nom et prénom :', 40, currentY + 20);
        
        doc.line(40, currentY + 10, 120, currentY + 10);
        currentY = addText('Signature :', 40, currentY + 20);
      }
      
      // Ajout du pied de page
      addFooter(doc, 8, 8);
      
      // Sauvegarde du PDF
      doc.save(`bail_location_${lease.tenant.last_name}_${formatDate(lease.duration.start_date)}.pdf`);
      
      doc.setFont('helvetica', 'bold');
      currentY = addText('DÉSIGNATION DU BIEN LOUÉ :', 25, currentY + 15);
      doc.setFont('helvetica', 'normal');
      currentY = addText(`• Type: ${lease.property?.property_type || 'Non spécifié'}`, 30, currentY + 3);
      currentY = addText(`• Adresse: ${lease.property?.address || 'Non spécifiée'}`, 30, currentY + 3);
      currentY = addText(`• Surface habitable: ${lease.property?.area || '0'} m²`, 30, currentY + 3);
      currentY = addText(`• Étage: ${lease.property?.floor ? `Étage ${lease.property.floor}` : 'Rez-de-chaussée'}`, 30, currentY + 3);
      currentY = addText(`• Destination: Usage d'habitation principale`, 30, currentY + 3);
      
      // Pied de page
      addFooter(doc, 1, 5);
      
      // ===== PAGE 2 - DURÉE ET EFFET DU CONTRAT =====
      doc.addPage();
      currentY = addHeader(doc, 'DURÉE ET EFFET DU CONTRAT');
      
      doc.setFont('helvetica', 'bold');
      currentY = addText('ARTICLE 1 - DURÉE', 20, currentY + 10);
      doc.setFont('helvetica', 'normal');
      currentY = addText(`Le présent bail est consenti pour une durée de 3 ans à compter du ${formatDate(lease.lease_start)}.`, 20, currentY + 5);
      currentY = addText(`Date d'effet: ${formatDate(lease.lease_start)}`, 20, currentY + 3);
      currentY = addText(`Date de fin: ${lease.lease_end ? formatDate(lease.lease_end) : 'Non spécifiée (bail de 3 ans)'}`, 20, currentY + 3);
      
      doc.setFont('helvetica', 'bold');
      currentY = addText('ARTICLE 2 - RENOUVELLEMENT', 20, currentY + 10);
      doc.setFont('helvetica', 'normal');
      currentY = addText('Le présent bail se renouvelle par tacite reconduction par périodes triennales, sauf dénonciation par l\'une ou l\'autre des parties dans les délais légaux.', 20, currentY + 5);
      
      doc.setFont('helvetica', 'bold');
      currentY = addText('ARTICLE 3 - DESTINATION DES LIEUX', 20, currentY + 10);
      doc.setFont('helvetica', 'normal');
      currentY = addText('Les lieux sont loués à usage d\'habitation principale et pour la durée nécessaire à cet usage.', 20, currentY + 5);
      
      // Pied de page
      addFooter(doc, 2, 5);
      
      // ===== PAGE 3 - CONDITIONS FINANCIÈRES =====
      doc.addPage();
      currentY = addHeader(doc, 'CONDITIONS FINANCIÈRES');
      
      doc.setFont('helvetica', 'bold');
      currentY = addText('ARTICLE 4 - LOYER ET CHARGES', 20, currentY + 10);
      doc.setFont('helvetica', 'normal');
      currentY = addText(`Le loyer mensuel est fixé à la somme de ${formatCurrency(lease.rent)} (${(lease.rent || 0).toLocaleString('fr-FR')} euros) hors charges.`, 20, currentY + 5);
      currentY = addText(`Une provision sur charges mensuelles est fixée à ${formatCurrency(lease.charges_provision)} (${(lease.charges_provision || 0).toLocaleString('fr-FR')} euros).`, 20, currentY + 3);
      currentY = addText(`Soit un total de ${formatCurrency((lease.rent || 0) + (lease.charges_provision || 0))} (${((lease.rent || 0) + (lease.charges_provision || 0)).toLocaleString('fr-FR')} euros) charges comprises.`, 20, currentY + 3);
      
      doc.setFont('helvetica', 'bold');
      currentY = addText('ARTICLE 5 - DÉPÔT DE GARANTIE', 20, currentY + 10);
      doc.setFont('helvetica', 'normal');
      currentY = addText(`Le dépôt de garantie est fixé à ${formatCurrency(lease.security_deposit)} (${(lease.security_deposit || 0).toLocaleString('fr-FR')} euros).`, 20, currentY + 5);
      currentY = addText('Il sera restitué dans un délai maximum de 2 mois à compter de la restitution des clés, déduction faite des sommes restant dues au bailleur.', 20, currentY + 3);
      
      doc.setFont('helvetica', 'bold');
      currentY = addText('ARTICLE 6 - MODALITÉS DE PAIEMENT', 20, currentY + 10);
      doc.setFont('helvetica', 'normal');
      currentY = addText('Le loyer est payable mensuellement à terme échu. Le paiement s\'effectuera par virement bancaire sur le compte désigné par le bailleur.', 20, currentY + 5);
      
      // Pied de page
      addFooter(doc, 3, 5);
      
      // ===== PAGE 4 - ÉTAT DES LIEUX ET ENTRETIEN =====
      doc.addPage();
      currentY = addHeader(doc, 'ÉTAT DES LIEUX ET ENTRETIEN');
      
      doc.setFont('helvetica', 'bold');
      currentY = addText('ARTICLE 7 - ÉTAT DES LIEUX', 20, currentY + 10);
      doc.setFont('helvetica', 'normal');
      currentY = addText('Un état des lieux contradictoire et détaillé sera établi à l\'entrée dans les lieux et à la sortie, selon les modalités légales en vigueur.', 20, currentY + 5);
      
      doc.setFont('helvetica', 'bold');
      currentY = addText('ARTICLE 8 - ENTRETIEN ET RÉPARATIONS', 20, currentY + 10);
      doc.setFont('helvetica', 'normal');
      currentY = addText('Le locataire est tenu d\'entretenir les lieux loués et de réparer les dégradations qu\'il pourrait causer. Les réparations locatives restent à sa charge.', 20, currentY + 5);
      
      doc.setFont('helvetica', 'bold');
      currentY = addText('ARTICLE 9 - ASSURANCE', 20, currentY + 10);
      doc.setFont('helvetica', 'normal');
      currentY = addText('Le locataire est tenu de souscrire une assurance garantissant les risques locatifs (incendie, dégâts des eaux, etc.) pour le compte du bailleur.', 20, currentY + 5);
      
      // Pied de page
      addFooter(doc, 4, 5);
      
      // ===== PAGE 5 - SIGNATURES =====
      doc.addPage();
      currentY = addHeader(doc, 'SIGNATURES');
      
      doc.setFont('helvetica', 'normal');
      currentY = addText('Fait en deux exemplaires originaux, à', 60, currentY + 20);
      
      // Signature locataire
      doc.setFont('helvetica', 'bold');
      currentY = addText('Le(s) Locataire(s) :', 40, currentY + 20);
      doc.setFont('helvetica', 'normal');
      currentY = addText('Nom et prénom :', 40, currentY + 10);
      currentY = addText('Signature :', 40, currentY + 20);
      doc.line(40, currentY + 5, 100, currentY + 5);
      
      // Signature bailleur
      doc.setFont('helvetica', 'bold');
      currentY = addText('Le Bailleur :', 130, currentY - 30);
      doc.setFont('helvetica', 'normal');
      currentY = addText('Nom et prénom :', 130, currentY + 10);
      currentY = addText('Signature :', 130, currentY + 20);
      doc.line(130, currentY + 5, 190, currentY + 5);
      
      // Date et lieu
      currentY = addText('Fait à ____________________, le _____ / _____ / __________', 60, currentY + 30);
      
      // Pied de page
      addFooter(doc, 5, 5);
      
      // Enregistrer le PDF
      doc.save(`bail-location-${lease.id}.pdf`);
      
      toast({
        title: 'Succès',
        description: 'Le bail a été généré avec succès',
      });
      
    } catch (error) {
      console.error('Erreur lors de la génération du PDF :', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la génération du PDF',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div>Chargement des baux...</div>;
  }

  if (leases.length === 0) {
    return <div>Aucun bail trouvé</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Propriété</TableHead>
          <TableHead>Locataire</TableHead>
          <TableHead>Loyer</TableHead>
          <TableHead>Début</TableHead>
          <TableHead>Fin</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leases.map((lease) => (
          <TableRow key={lease.id}>
            <TableCell>{lease.property?.name || 'Non spécifié'}</TableCell>
            <TableCell>
              {lease.tenant ? `${lease.tenant.first_name} ${lease.tenant.last_name}` : 'Non spécifié'}
            </TableCell>
            <TableCell>{lease.rent ? `${lease.rent} €` : 'Non spécifié'}</TableCell>
            <TableCell>
              {lease.lease_start ? new Date(lease.lease_start).toLocaleDateString('fr-FR') : 'Non spécifié'}
            </TableCell>
            <TableCell>
              {lease.lease_end ? new Date(lease.lease_end).toLocaleDateString('fr-FR') : 'Non spécifié'}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Ouvrir le menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => onEdit(lease)}>
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleGeneratePDF(lease)}
                    className="cursor-pointer"
                  >
                    Télécharger le PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleSendEmail(lease)} 
                    disabled={isSending === lease.id}
                    className="cursor-pointer"
                  >
                    {isSending === lease.id ? 'Envoi en cours...' : 'Envoyer par email'}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(lease.id!)} 
                    className="text-red-600 cursor-pointer"
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
  );
}
