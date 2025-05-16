import React from "react";

interface RendementLocatifProps {
  purchasePrice: number;
  rent: number;
  propertyTax?: number;
  housingTax?: number;
  insurance?: number;
  managementFeePercentage?: number;
  acquisitionFees?: number; // frais de notaire, etc. (optionnel)
  landTax?: number; // Impôt sur les revenus fonciers (nouveau)
  loyerAnnuel?: number; // Pour transparence calcul
  chargesAnnuelles?: number; // Pour transparence calcul
  landTaxSource?: 'manual' | 'auto' | 'none'; // Pour afficher la source
  impotsLink?: string; // Pour lien direct
}

/**
 * Composant d'affichage du rendement locatif (brut et net) avec détail des calculs.
 */
const RendementLocatif: React.FC<RendementLocatifProps> = ({
  purchasePrice,
  rent,
  propertyTax = 0,
  housingTax = 0,
  insurance = 0,
  managementFeePercentage = 0,
  acquisitionFees = 0,
  landTax = 0,
  loyerAnnuel,
  chargesAnnuelles,
  landTaxSource = 'none',
  impotsLink,
}) => {
  if (!purchasePrice || purchasePrice <= 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 border mt-4">
        <h3 className="text-lg font-semibold mb-2">Rendement locatif</h3>
        <div className="text-sm text-gray-600 mb-2">Vous n’avez pas investi de capital dans ce bien. Le rendement classique n’est pas représentatif de votre situation réelle.</div>
      </div>
    );
  }

  // Calculs
  const annualRent = loyerAnnuel ?? rent * 12;
  const annualCharges = chargesAnnuelles ?? (propertyTax + housingTax + insurance + (annualRent * (managementFeePercentage / 100)));
  const brut = purchasePrice > 0 ? (annualRent / purchasePrice) * 100 : 0;
  const net = (purchasePrice + acquisitionFees) > 0 ? ((annualRent - annualCharges) / (purchasePrice + acquisitionFees)) * 100 : 0;
  const netNet = (purchasePrice + acquisitionFees) > 0 ? ((annualRent - annualCharges - landTax) / (purchasePrice + acquisitionFees)) * 100 : 0;

  let landTaxLabel = '';
  if (landTaxSource === 'manual') {
    landTaxLabel = "Valeur renseignée manuellement dans la déclaration fiscale.";
  } else if (landTaxSource === 'auto') {
    landTaxLabel = "Estimation automatique au prorata du loyer annuel.";
  } else {
    landTaxLabel = "Aucune déclaration trouvée ou ventilation non renseignée. Estimation automatique si possible.";
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 border mt-4">
      <h3 className="text-lg font-semibold mb-2">Rendement locatif</h3>
      <div className="flex flex-col md:flex-row gap-4">
        <div>
          <span className="font-medium">Brut :</span>
          <span className="ml-2 text-green-700 font-bold">{brut.toFixed(2)} %</span>
        </div>
        <div>
          <span className="font-medium">Net :</span>
          <span className="ml-2 text-blue-700 font-bold">{net.toFixed(2)} %</span>
        </div>
        {landTax > 0 && (
          <div>
            <span className="font-medium">Net-net :</span>
            <span className="ml-2 text-purple-700 font-bold">{netNet.toFixed(2)} %</span>
          </div>
        )}
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer text-sm text-gray-600">Détail du calcul</summary>
        <ul className="text-xs mt-2 text-gray-700 space-y-1">
          <li>Loyer annuel utilisé : <b>{annualRent.toLocaleString()} €</b></li>
          <li>Charges annuelles utilisées : <b>{annualCharges.toLocaleString()} €</b></li>
          <li>Prix d'achat : <b>{purchasePrice.toLocaleString()} €</b></li>
          <li>Frais d'acquisition : <b>{acquisitionFees.toLocaleString()} €</b></li>
          {landTax > 0 && (
            <li>Impôt sur les revenus fonciers : <b>{landTax.toLocaleString()} €</b></li>
          )}
        </ul>
        <div className="mt-1 text-xs text-gray-500">
          <div>Brut = (Loyer annuel / Prix d'achat) × 100</div>
          <div>Net = ((Loyer annuel – Charges annuelles) / (Prix d'achat + Frais d'acquisition)) × 100</div>
          {landTax > 0 && (
            <div>Net-net = ((Loyer annuel – Charges annuelles – Impôt sur les revenus fonciers) / (Prix d'achat + Frais d'acquisition)) × 100</div>
          )}
        </div>
        <div className="mt-2 text-xs text-gray-500">
          {landTaxLabel}
        </div>
        {impotsLink && (
          <div className="mt-2 text-xs">
            <a href={impotsLink} className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">
              Aller à la déclaration fiscale / ventilation
            </a>
          </div>
        )}
        {landTax === 0 && (
          <div className="mt-2 text-xs text-gray-400">Pour afficher le rendement net-net, renseignez l'impôt sur les revenus fonciers.</div>
        )}
      </details>
      {/* Champ de saisie pour l'impôt foncier (readonly, info UX) */}
      <div className="mt-2">
        <label htmlFor="landTax" className="block text-xs text-gray-600 mb-1">Impôt sur les revenus fonciers (optionnel)</label>
        <input
          type="number"
          id="landTax"
          min="0"
          step="0.01"
          className="border rounded px-2 py-1 text-xs w-full"
          value={landTax}
          disabled
        />
        <span className="text-xs text-gray-400">(À renseigner dans le menu Impôts ou lors de l'édition du bien)</span>
      </div>
    </div>
  );
};

export default RendementLocatif;
