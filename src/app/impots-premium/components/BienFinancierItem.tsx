import React, { useEffect, useState } from "react";
import { useBienFinancier } from "../../properties/hooks/useBienFinancier";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface BienFinancierItemProps {
  userId: string;
  bien: any;
  regimeLibelle: string;
  checklistData: string[];
}

export function BienFinancierItem({ userId, bien, regimeLibelle, checklistData }: BienFinancierItemProps) {
  const financier = useBienFinancier(userId, bien.id);
  const [deductibleCharges, setDeductibleCharges] = useState<number | null>(null);

  useEffect(() => {
    async function fetchDeductibleCharges() {
      const supabase = createClientComponentClient();
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, type(deductible)')
        .eq('property_id', bien.id);
      if (data) {
        const total = data.filter((t: any) => t.type && t.type.deductible === true)
          .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
        setDeductibleCharges(total);
      }
    }
    fetchDeductibleCharges();
  }, [bien.id]);

  return (
    <div className="bg-white rounded-xl shadow p-4 border border-gray-200 mb-2">
      <div className="font-bold mb-2 flex items-center gap-2">
        {bien.name} <span className="text-xs text-gray-400">({regimeLibelle})</span>
      </div>
      <div className="mb-2">
        <span className="font-semibold text-xs">Checklist :</span>
        <ul className="list-disc ml-5 text-xs">
          {checklistData.map((item: string) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <span>Loyer annuel</span><span className="text-right font-semibold">{financier?.loyerAnnuel ?? '-' } €</span>
        <span>Charges déductibles</span><span className="text-right">{deductibleCharges !== null ? deductibleCharges + ' €' : '-'} </span>
        <span>Taxe foncière</span><span className="text-right">{financier?.landTax ?? '-' } €</span>
      </div>
    </div>
  );
}
