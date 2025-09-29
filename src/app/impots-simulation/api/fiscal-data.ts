'use server';

import { redirect } from 'next/navigation';

export interface FiscalData {
  loyersPercus: number;
  chargesDeductibles: number;
  transactions: Array<{
    id: string;
    amount: number;
    description: string;
    date: string;
    type: string;
    property_name: string;
  }>;
}

export async function getFiscalDataForYear(year?: number): Promise<FiscalData> {
  try {
    // Construire l'URL correctement pour Next.js 13+ App Router
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const yearParam = year ? `?year=${year}` : '';

    console.log('=== APPEL API ROUTE ===');
    console.log('URL appelée:', `${baseUrl}/impots-simulation/api/fiscal-data${yearParam}`);

    const response = await fetch(`${baseUrl}/impots-simulation/api/fiscal-data${yearParam}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error('Erreur 401 - Utilisateur non authentifié');
        throw new Error('Utilisateur non authentifié');
      }
      const errorText = await response.text();
      console.error('Erreur HTTP:', response.status, errorText);
      throw new Error(`Erreur HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('Données reçues:', {
      loyersPercus: data.loyersPercus,
      chargesDeductibles: data.chargesDeductibles,
      transactionsCount: data.transactions?.length || 0
    });

    return data;

  } catch (error) {
    console.error('Erreur lors de la récupération des données fiscales:', error);

    // Si c'est une erreur d'authentification, rediriger vers la page de login
    if (error instanceof Error && error.message === 'Utilisateur non authentifié') {
      redirect('/auth/login');
    }

    throw error;
  }
}
