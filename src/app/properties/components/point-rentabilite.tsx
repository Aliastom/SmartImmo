import React from 'react';
import PointRentabiliteGraph from './point-rentabilite-graph';

interface PointRentabiliteProps {
  purchasePrice: number;
  loanAmount?: number; // nouveau: montant du crédit
  fraisAcquisition: number; // notaire, agence, etc
  loyerAnnuel: number;
  chargesAnnuelles: number;
  interetsParAnnee: number[];
  duree: number; // en années
  tauxImpot: number; // ex : 0.3 pour 30%
  purchaseDate?: string; // nouvelle prop pour l'année de départ
}

/**
 * Calcule et affiche l'année de rentabilité estimée (point mort)
 */
const PointRentabilite: React.FC<PointRentabiliteProps> = ({
  purchasePrice,
  loanAmount = 0,
  fraisAcquisition,
  loyerAnnuel,
  chargesAnnuelles,
  interetsParAnnee,
  duree,
  tauxImpot,
  purchaseDate
}) => {
  // Calcul automatique de l'apport
  const apport = Math.max(0, purchasePrice - loanAmount);
  const cashflows: number[] = [];
  const rows: any[] = [];
  let cashflowCumule = -(apport + fraisAcquisition);
  let anneeRentable = null;

  for (let i = 0; i < duree; i++) {
    const annee = purchaseDate ? new Date(purchaseDate).getFullYear() + i : new Date().getFullYear() + i;
    const interetsAnnuel = interetsParAnnee[i] || 0;
    const resultatNet = loyerAnnuel - chargesAnnuelles - interetsAnnuel;
    const impot = Math.max(0, resultatNet * tauxImpot);
    const cashflow = resultatNet - impot;
    cashflowCumule += cashflow;
    rows.push({
      annee,
      loyerAnnuel,
      chargesAnnuelles,
      interetsAnnuel,
      resultatNet,
      impot,
      cashflow,
      cashflowCumule,
    });
    if (anneeRentable === null && cashflowCumule > 0) {
      anneeRentable = annee;
    }
    cashflows.push(cashflowCumule);
  }

  return (
    <div className="bg-blue-50 rounded-lg p-4 mt-4">
      <div className="font-semibold mb-2">
        {apport > 0 && (
          <span>
            Apport initial calculé : <span className="font-bold">{apport.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</span>
            <span className="text-gray-500 text-xs ml-2">(Prix d'achat {purchasePrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })} - Crédit {loanAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })})</span>
          </span>
        )}
      </div>
      {anneeRentable && (
        <div className="text-lg font-bold mb-2">
          Vous devenez rentable à partir de l'année {anneeRentable}.
          <div className="text-xs text-gray-500">(Cashflow cumulé positif en {anneeRentable})</div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs text-center border bg-white">
          <thead className="bg-blue-100">
            <tr>
              <th>Année</th>
              <th>Loyer annuel</th>
              <th>Charges</th>
              <th>Intérêts</th>
              <th>Résultat net</th>
              <th>Impôt</th>
              <th>Cashflow</th>
              <th>Cashflow cumulé</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any, idx: number) => (
              <tr key={idx} className={r.cashflowCumule > 0 && r.cashflowCumule - r.cashflow <= 0 ? 'bg-green-50' : ''}>
                <td className="px-2">{r.annee}</td>
                <td className="px-2">{r.loyerAnnuel.toLocaleString('fr-FR')}</td>
                <td className="px-2">{r.chargesAnnuelles.toLocaleString('fr-FR')}</td>
                <td className="px-2">{r.interetsAnnuel.toLocaleString('fr-FR')}</td>
                <td className="px-2">{r.resultatNet.toLocaleString('fr-FR')}</td>
                <td className="px-2">{r.impot.toLocaleString('fr-FR')}</td>
                <td className="px-2">{r.cashflow.toLocaleString('fr-FR')}</td>
                <td className="px-2">{r.cashflowCumule.toLocaleString('fr-FR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-gray-500 mt-2">
        Hypothèses : impôt simplifié, cashflow = revenus - charges - intérêts - impôt. <br />Apport initial = prix d'achat - montant du crédit.
      </div>
    </div>
  );
};

export default PointRentabilite;
