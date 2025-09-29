'use client';

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { generateLeasePDF } from "@/lib/lease-pdf-generator";

export function GenerateLeaseButton() {
  const handleGenerateLease = async () => {
    try {
      // Exemple de données de bail (à remplacer par vos données réelles)
      const leaseData = {
        id: 'bail-123',
        title: 'CONTRAT DE BAIL D\'HABITATION',
        property: {
          type: 'Appartement',
          address: {
            street: '123 Rue de la Paix',
            postalCode: '75001',
            city: 'Paris',
            country: 'France'
          },
          area: 75,
          floor: 3,
          description: 'Appartement lumineux avec vue dégagée, cuisine équipée, double vitrage.'
        },
        landlord: {
          firstName: 'Jean',
          lastName: 'Dupont',
          phone: '01 23 45 67 89',
          email: 'jean.dupont@example.com',
          address: {
            street: '456 Avenue des Champs-Élysées',
            postalCode: '75008',
            city: 'Paris',
            country: 'France'
          }
        },
        tenant: {
          firstName: 'Marie',
          lastName: 'Martin',
          birthDate: new Date('1990-05-15'),
          birthPlace: 'Lyon',
          phone: '06 12 34 56 78',
          email: 'marie.martin@example.com',
          address: {
            street: '789 Boulevard Saint-Germain',
            postalCode: '75006',
            city: 'Paris',
            country: 'France'
          }
        },
        period: {
          startDate: new Date('2023-01-01'),
          endDate: new Date('2026-12-31'),
          noticePeriod: 3 // 3 mois de préavis
        },
        financialTerms: {
          rent: 1200,
          charges: 150,
          deposit: 1200,
          paymentDueDay: 5,
          indexationClause: true,
          chargesIncluded: ['Eau froide', 'Chauffage collectif', 'Ascenseur', 'Ordures ménagères']
        },
        specialClauses: [
          'Animaux interdits',
          'Travaux interdits sans autorisation écrite du bailleur',
          'Interdiction de fumer à l\'intérieur du logement'
        ],
        createdAt: new Date()
      };

      // Générer et télécharger le PDF
      await generateLeasePDF(leaseData, 'download');
      
    } catch (error) {
      console.error('Erreur lors de la génération du bail :', error);
      // Ici, vous pouvez ajouter une notification d'erreur à l'utilisateur
      alert('Une erreur est survenue lors de la génération du bail. Veuillez réessayer.');
    }
  };

  return (
    <Button 
      onClick={handleGenerateLease}
      className="flex items-center gap-2"
    >
      <Download className="h-4 w-4" />
      Générer le bail
    </Button>
  );
}
