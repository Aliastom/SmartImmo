import React, { useMemo } from 'react';
import { computeYearlyInterests } from '../utils/interest-details';

interface RentabiliteTabProps {
  property: any;
  loans: any[];
}

const getAllCharges = (property: any) => {
  return (
    Number(property?.charges) || 0
    + Number(property?.property_tax) || 0
    + Number(property?.housing_tax) || 0
    + Number(property?.insurance) || 0
    + Number(property?.management_fee_percentage) * (Number(property?.rent) * 12 || 0) / 100 || 0
    + Number(property?.land_tax) || 0
    + Number(property?.acquisition_fees) || 0
  );
};

const vignetteStyle = {
  base: 'flex flex-row items-center justify-between rounded-lg px-7 py-3 text-base font-semibold shadow border min-w-[220px] h-[60px] whitespace-nowrap',
  teal: 'bg-teal-50 border-teal-200 text-teal-700',
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  red: 'bg-red-50 border-red-200 text-red-700',
  gray: 'bg-gray-50 border-gray-200 text-gray-700',
};

const RentabiliteTab: React.FC<RentabiliteTabProps> = ({ property, loans }) => {
  const purchasePrice = Number(property?.purchase_price) || 0;
  const purchaseDate = property?.purchase_date || '';
  const durationYears = 20;
  const startYear = purchaseDate ? new Date(purchaseDate).getFullYear() : new Date().getFullYear();
  const endYear = startYear + durationYears - 1;

  const yearlyInterests = useMemo(() => computeYearlyInterests(loans, startYear, endYear), [loans, startYear, endYear]);

  // Calculs vignettes corrigés
  const totalCredit = loans.reduce((sum, l) => sum + Number(l.amount || 0), 0);
  // Coût du crédit = somme des intérêts de chaque crédit (par prêt)
  const coutsCredits = loans.reduce((sum, loan) => {
    // Pour chaque prêt, somme des intérêts sur toute la durée du prêt
    const start = loan.start_date ? new Date(loan.start_date).getFullYear() : startYear;
    const end = loan.end_date ? new Date(loan.end_date).getFullYear() : (start + (loan.loan_duration_years ? Number(loan.loan_duration_years) : durationYears));
    let totalInterets = 0;
    for (let y = start; y <= end; y++) {
      // Cherche la ligne d'intérêts pour ce prêt et cette année
      const yearInterest = yearlyInterests.find(row => row.year === y && row.details?.some((d: any) => d.loanId === loan.id));
      if (yearInterest) {
        const detail = yearInterest.details.find((d: any) => d.loanId === loan.id);
        if (detail) totalInterets += detail.interest;
      }
    }
    return sum + totalInterets;
  }, 0);

  const apportInitial = Math.max(0, purchasePrice - totalCredit);
  const fraisAcquisition = Number(property?.acquisition_fees) || 0;
  // Investissement total = apport + frais d'acquisition + montant des crédits + coût des crédits
  const investissementTotal = apportInitial + fraisAcquisition + totalCredit + coutsCredits;

  // Calcul du break-even (année où le cashflow cumulé devient positif)
  let breakEvenYear: number | null = null;
  let cumul = -apportInitial;
  for (let i = 0; i < yearlyInterests.length; i++) {
    const loyerAnnuel = Number(property?.rent) * 12 || 0;
    const charges = getAllCharges(property);
    const interets = yearlyInterests[i].totalInterest;
    const resultatNet = loyerAnnuel - charges - interets;
    const impot = resultatNet > 0 ? resultatNet * 0.3 : 0;
    const cashflow = resultatNet - impot;
    cumul += cashflow;
    if (breakEvenYear === null && cumul >= 0) {
      breakEvenYear = yearlyInterests[i].year;
    }
  }

  return (
    <div className="space-y-8">
      {/* Vignettes synthétiques allongées sur une seule ligne */}
      <div className="flex flex-row flex-wrap gap-4 mb-4 w-full justify-between">
        <div className={`${vignetteStyle.base} ${vignetteStyle.teal}`}>
          <span>Apport initial</span>
          <span className="text-xl font-bold ml-4">{apportInitial.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</span>
        </div>
        <div className={`${vignetteStyle.base} ${vignetteStyle.blue}`}>
          <span>Frais d'acquisition</span>
          <span className="text-xl font-bold ml-4">{fraisAcquisition.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</span>
        </div>
        <div className={`${vignetteStyle.base} ${vignetteStyle.red} flex-col items-start justify-center text-left min-w-[260px] relative`}>
          <div className="flex flex-row items-center w-full justify-between">
            <span>Crédit</span>
            <span className="text-xl font-bold ml-4">{(totalCredit + coutsCredits).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</span>
          </div>
        </div>
        <div className={`${vignetteStyle.base} ${vignetteStyle.gray}`}>
          <span>Investissement total</span>
          <span className="text-xl font-bold ml-4">{investissementTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</span>
        </div>
      </div>
      {/* Break-even info animé et stylé, couleurs harmonisées avec la ligne du tableau */}
      {breakEvenYear && (
        <div className="bg-green-50 p-4 rounded flex items-center animate-fade-in-up shadow-md border border-green-200">
          <svg className="w-7 h-7 mr-3 text-green-500 animate-bounce" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z" />
          </svg>
          <span className="text-green-800 font-semibold text-lg">
            Vous devenez rentable à partir de l'année
            <span className="underline font-bold text-green-900 animate-pop-in ml-1">{breakEvenYear}</span>.
          </span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs border border-gray-200 bg-white">
          <thead className="bg-blue-100">
            <tr>
              <th className="px-2 py-1">Année</th>
              <th className="px-2 py-1">Loyer annuel</th>
              <th className="px-2 py-1">Charges</th>
              <th className="px-2 py-1">Intérêts</th>
              <th className="px-2 py-1">Résultat net</th>
              <th className="px-2 py-1">Impôt</th>
              <th className="px-2 py-1">Cashflow</th>
              <th className="px-2 py-1">Cashflow cumulé</th>
            </tr>
          </thead>
          <tbody>
            {yearlyInterests.map((row, idx) => {
              const loyerAnnuel = Number(property?.rent) * 12 || 0;
              const charges = getAllCharges(property);
              const interets = row.totalInterest;
              const resultatNet = loyerAnnuel - charges - interets;
              const impot = resultatNet > 0 ? resultatNet * 0.3 : 0;
              const cashflow = resultatNet - impot;
              const prevCumul = idx === 0 ? -apportInitial :
                yearlyInterests.slice(0, idx).reduce((sum, r) => {
                  const loyer = Number(property?.rent) * 12 || 0;
                  const ch = getAllCharges(property);
                  const inter = r.totalInterest;
                  const res = loyer - ch - inter;
                  const imp = res > 0 ? res * 0.3 : 0;
                  const cf = res - imp;
                  return sum + cf;
                }, -apportInitial);
              const cashflowCumul = prevCumul + cashflow;
              const highlight = breakEvenYear === row.year;
              return (
                <tr key={row.year} className={`text-center ${highlight ? 'bg-green-50 text-green-900 font-bold border-y-2 border-green-300' : ''}`}>
                  <td className="px-2 py-1">{row.year}</td>
                  <td className="px-2 py-1">{loyerAnnuel.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>
                  <td className="px-2 py-1">{charges.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>
                  <td className="px-2 py-1">{interets.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>
                  <td className="px-2 py-1">{resultatNet.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>
                  <td className="px-2 py-1">{impot.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>
                  <td className="px-2 py-1">{cashflow.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>
                  <td className="px-2 py-1">{cashflowCumul.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RentabiliteTab;

/* Ajout des animations Tailwind CSS custom */
// Dans le fichier global.css (à ajouter si pas déjà présent)
// .animate-fade-in-up { animation: fadeInUp 0.7s cubic-bezier(0.39, 0.575, 0.565, 1) both; }
// @keyframes fadeInUp { 0% { opacity: 0; transform: translateY(30px); } 100% { opacity: 1; transform: translateY(0); } }
// .animate-pop-in { animation: popIn 0.5s cubic-bezier(0.39, 0.575, 0.565, 1) both; }
// @keyframes popIn { 0% { transform: scale(0.6); opacity: 0; } 80% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); } }