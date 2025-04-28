import React from 'react';

interface RentabiliteGraphProps {
  purchasePrice: number;
  purchaseDate: string;
  durationYears: number;
}

/**
 * Graphique de rentabilité linéaire (exemple simple)
 */
const RentabiliteGraph: React.FC<RentabiliteGraphProps> = ({ purchasePrice, purchaseDate, durationYears }) => {
  // Génère les données de rentabilité linéaire
  const startYear = purchaseDate ? new Date(purchaseDate).getFullYear() : new Date().getFullYear();
  const amortPerYear = purchasePrice / durationYears;
  const data = Array.from({ length: durationYears + 1 }, (_, i) => ({
    year: startYear + i,
    amortized: Math.min(amortPerYear * i, purchasePrice),
    remaining: Math.max(purchasePrice - amortPerYear * i, 0),
  }));

  // Affichage texte simple (remplacer par un vrai graphique plus tard)
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs text-center border mt-4">
        <thead>
          <tr className="bg-gray-100">
            <th>Année</th>
            <th>Montant amorti (€)</th>
            <th>Valeur nette (€)</th>
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.year}>
              <td>{row.year}</td>
              <td>{row.amortized.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</td>
              <td>{row.remaining.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-xs text-gray-500 mt-2">(Rentabilité linéaire sur {durationYears} ans)</div>
    </div>
  );
};

export default RentabiliteGraph;
