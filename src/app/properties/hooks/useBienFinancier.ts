import { useEffect, useState } from "react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface BienFinancierData {
  loyerAnnuel: number;
  chargesAnnuelles: number;
  landTax: number; // part d'impôt foncier affectée
  landTaxSource: 'manual' | 'auto' | 'none'; // source de la ventilation
}

export function useBienFinancier(userId: string, propertyId: string, year?: number): BienFinancierData | null {
  const [data, setData] = useState<BienFinancierData | null>(null);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClientComponentClient();

      // 1. Récupérer toutes les transactions income/expense de l'année fiscale pour tous les biens de l'utilisateur, en filtrant sur le mois comptable
      const yearToUse = year || new Date().getFullYear();
      const transactionsYear = yearToUse - 1;
      const { data: transactions, error: tError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .ilike('accounting_month', `${transactionsYear}-%`);

      if (tError || !transactions) {
        if (typeof window !== 'undefined') {
          console.error('Erreur Supabase transactions:', tError, 'userId:', userId, 'année:', transactionsYear);
        }
        setData(null);
        return;
      }
      if (typeof window !== 'undefined') {
        console.log('Transactions récupérées:', transactions);
      }

      // 2. Calculer loyer annuel et charges pour le bien courant
      const loyerAnnuel = transactions
        .filter((t: any) => t.property_id === propertyId && t.transaction_type === 'income')
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      const chargesAnnuelles = transactions
        .filter((t: any) => t.property_id === propertyId && t.transaction_type === 'expense' && t.is_deductible)
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      // 3. Calculer le loyer annuel total pour tous les biens
      const loyerAnnuelTotal = transactions
        .filter((t: any) => t.transaction_type === 'income')
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      // 4. Récupérer la déclaration fiscale de l'année (ou la dernière)
      let { data: declaration, error: dError } = await supabase
        .from('tax_declarations')
        .select('id, user_id, year, salary, foncier_net, impot_calcule, data, created_at, updated_at, impot_par_bien')
        .eq('user_id', userId)
        .eq('year', yearToUse)
        .maybeSingle();

      if (dError || !declaration) {
        const { data: lastDeclaration } = await supabase
          .from('tax_declarations')
          .select('id, user_id, year, salary, foncier_net, impot_calcule, data, created_at, updated_at, impot_par_bien')
          .eq('user_id', userId)
          .order('year', { ascending: false })
          .limit(1)
          .maybeSingle();
        declaration = lastDeclaration;
      }

      let landTax = 0;
      let landTaxSource: 'manual' | 'auto' | 'none' = 'none';
      if (declaration) {
        const impotGlobal = declaration.impot_calcule || 0;
        const impotParBien = declaration.impot_par_bien || {};
        if (impotParBien[propertyId]) {
          landTax = impotParBien[propertyId];
          landTaxSource = 'manual';
        } else if (loyerAnnuelTotal > 0) {
          landTax = Math.round((impotGlobal * loyerAnnuel) / loyerAnnuelTotal);
          landTaxSource = landTax > 0 ? 'auto' : 'none';
        }
      }

      setData({ loyerAnnuel, chargesAnnuelles, landTax, landTaxSource });
    }

    if (userId && propertyId) {
      fetchData();
    }
  }, [userId, propertyId, year]);

  return data;
}
