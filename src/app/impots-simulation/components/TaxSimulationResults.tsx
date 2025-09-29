import jsPDF from 'jspdf';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { TaxCalculationResult, TaxSimulationInput } from '@/types/tax-simulation';

interface TaxSimulationResultsProps {
  results: TaxCalculationResult;
  inputData?: TaxSimulationInput | null;
}

export default function TaxSimulationResults({ results, inputData }: TaxSimulationResultsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getBenefitColor = (value: number) => {
    if (value > 0) return 'bg-green-100 text-green-800';
    if (value < 0) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getBenefitIcon = (value: number) => {
    if (value > 0) return '📈';
    if (value < 0) return '📉';
    return '➡️';
  };

  const exportToPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Configuration des couleurs
    const primaryColor = [59, 130, 246]; // Bleu
    const secondaryColor = [34, 197, 94]; // Vert
    const textColor = [31, 41, 55]; // Gris foncé

    // Titre principal
    doc.setFontSize(24);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('SIMULATION IMPÔT FR', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 25;

    // Sous-titre
    doc.setFontSize(10);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(`Simulation générée le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 35;

    // Section comparaison fiscale
    doc.setFontSize(18);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPARAISON FISCALE', margin, yPosition);
    yPosition += 20;

    // Situation sans immobilier
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('SITUATION SANS IMMOBILIER', margin, yPosition);
    yPosition += 15;

    doc.setFontSize(11);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(`Impôt sur le revenu: ${formatCurrency(results.IR_sans_foncier)}`, margin + 5, yPosition);
    yPosition += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`TOTAL: ${formatCurrency(results.total_sans_foncier)}`, margin + 5, yPosition);
    yPosition += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Taux effectif: ${formatPercentage(results.taux_effectif_sans_foncier)}`, margin + 5, yPosition);
    yPosition += 25;

    // Situation avec immobilier
    doc.setFontSize(14);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('SITUATION AVEC IMMOBILIER', margin, yPosition);
    yPosition += 15;

    doc.setFontSize(11);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(`Impôt sur le revenu: ${formatCurrency(results.IR_avec_foncier)}`, margin + 5, yPosition);
    yPosition += 10;
    doc.text(`Prélèvements sociaux: ${formatCurrency(results.PS_foncier)}`, margin + 5, yPosition);
    yPosition += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`TOTAL: ${formatCurrency(results.total_avec_foncier)}`, margin + 5, yPosition);
    yPosition += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Taux effectif: ${formatPercentage(results.taux_effectif_avec_foncier)}`, margin + 5, yPosition);
    yPosition += 30;

    // Section détail des revenus
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(18);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('DÉTAIL DES REVENUS', margin, yPosition);
    yPosition += 20;

    doc.setFontSize(11);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(`• Salaire brut: ${formatCurrency(results.salaire_brut_annuel)}`, margin, yPosition);
    yPosition += 8;
    doc.text(`• Abattement (10%): ${formatCurrency(results.salaire_brut_annuel * 0.1)}`, margin, yPosition);
    yPosition += 8;
    doc.text(`• Salaire imposable: ${formatCurrency(results.salaire_imposable)}`, margin, yPosition);
    yPosition += 12;

    if (results.versement_PER_deductible && results.versement_PER_deductible > 0) {
      doc.text(`• PER déduit: ${formatCurrency(results.versement_PER_deductible)}`, margin, yPosition);
      yPosition += 8;
    }

    // Section immobilier
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Revenus immobiliers:', margin, yPosition);
    yPosition += 12;

    doc.setFont('helvetica', 'normal');
    doc.text(`• Loyers perçus: ${formatCurrency(results.loyers_percus_total)}`, margin + 5, yPosition);
    yPosition += 8;
    doc.text(`• Charges déductibles: ${formatCurrency(results.charges_foncieres_total)}`, margin + 5, yPosition);
    yPosition += 8;
    doc.setFont('helvetica', 'bold');
    doc.text(`Revenus fonciers nets: ${formatCurrency(results.revenu_foncier_net)}`, margin + 5, yPosition);
    yPosition += 15;

    // Bénéfice net
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const benefitText = results.benefice_net > 0 ? 'BÉNÉFICE NET IMMOBILIER' : 'DÉFICIT NET IMMOBILIER';
    doc.text(benefitText, margin, yPosition);
    yPosition += 15;

    doc.setFontSize(20);
    const benefitColor = results.benefice_net > 0 ? [34, 197, 94] : [239, 68, 68]; // Vert ou rouge
    doc.setTextColor(benefitColor[0], benefitColor[1], benefitColor[2]);
    doc.text(`${formatCurrency(results.benefice_net)}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 25;

    // Métriques
    doc.setFontSize(12);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(`Cash-flow brut: ${formatCurrency(results.loyers_percus_total - results.charges_foncieres_total)} | Rendement brut: ${results.loyers_percus_total > 0 ? ((results.loyers_percus_total / 200000) * 100).toFixed(1) : '0'}%`, margin, yPosition);
    yPosition += 8;
    doc.text(`Rendement net: ${results.loyers_percus_total > 0 ? ((results.benefice_net / 200000) * 100).toFixed(1) : '0'}% | Delta impôt: ${formatCurrency(results.delta_impot)}`, margin, yPosition);
    yPosition += 20;

    // Recommandation
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(16);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('RECOMMANDATION', margin, yPosition);
    yPosition += 20;

    doc.setFontSize(11);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('helvetica', 'normal');

    const recommendation = results.benefice_net > 0
      ? "L'investissement immobilier génère un bénéfice net positif après impôts. C'est une bonne opportunité."
      : results.benefice_net < 0
      ? "L'investissement immobilier génère une perte nette après impôts. Réévaluez la rentabilité."
      : "L'investissement immobilier est neutre fiscalement. Considérez d'autres critères.";

    const splitText = doc.splitTextToSize(recommendation, pageWidth - 2 * margin);
    doc.text(splitText, margin, yPosition);

    // Pied de page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} sur ${pageCount}`, pageWidth - 30, pageHeight - 10);
    }

    // Sauvegarder le PDF
    doc.save(`simulation-impot-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="grid grid-cols-4 grid-rows-[auto_auto_auto_auto_auto] gap-3 min-h-screen">
      {/* Ligne 1 : Titre sur toutes les colonnes */}
      <div className="col-span-4 flex justify-between items-center p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-white">
        <div>
          <h1 className="text-2xl font-bold">SIMULATION IMPÔT FR</h1>
          <p className="text-blue-100 mt-1">Calcul d'impact fiscal de votre investissement immobilier</p>
        </div>
        <Button onClick={exportToPDF} className="flex items-center gap-2 bg-white text-blue-600 hover:bg-blue-50">
          <Download className="w-4 h-4" />
          Exporter PDF
        </Button>
      </div>

      {/* Ligne 2-3 : Panel données d'entrée (colonnes 1-2) */}
      <div className="col-span-2 row-span-2 bg-gray-50 rounded-lg p-4 border">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Données d'entrée</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded border">
              <label className="text-xs font-medium text-gray-600 block mb-1">Salaire brut</label>
              <p className="font-semibold text-blue-700">{formatCurrency(inputData?.salaire_brut_annuel || 0)}</p>
            </div>
            <div className="bg-white p-3 rounded border">
              <label className="text-xs font-medium text-gray-600 block mb-1">Loyers perçus</label>
              <p className="font-semibold text-green-700">{formatCurrency(inputData?.loyers_percus_total || 0)}</p>
            </div>
            <div className="bg-white p-3 rounded border">
              <label className="text-xs font-medium text-gray-600 block mb-1">Charges déductibles</label>
              <p className="font-semibold text-red-600">{formatCurrency(inputData?.charges_foncieres_total || 0)}</p>
            </div>
            <div className="bg-white p-3 rounded border">
              <label className="text-xs font-medium text-gray-600 block mb-1">PER déductible</label>
              <p className="font-semibold text-purple-700">{formatCurrency(inputData?.versement_PER_deductible || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ligne 2, Colonne 3 : Situation fiscale sans immobilier */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h3 className="text-base font-semibold mb-3 text-blue-700">Sans immobilier</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">IR:</span>
            <span className="font-semibold">{formatCurrency(results.IR_sans_foncier)}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-blue-100">
            <span className="text-gray-600 font-medium">Total:</span>
            <span className="font-bold text-blue-700">{formatCurrency(results.total_sans_foncier)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Taux:</span>
            <span className="font-semibold">{formatPercentage(results.taux_effectif_sans_foncier)}</span>
          </div>
        </div>
      </div>

      {/* Ligne 2, Colonne 4 : Situation fiscale avec immobilier */}
      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
        <h3 className="text-base font-semibold mb-3 text-green-700">Avec immobilier</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">IR:</span>
            <span className="font-semibold">{formatCurrency(results.IR_avec_foncier)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">PS:</span>
            <span className="font-semibold text-orange-600">{formatCurrency(results.PS_foncier)}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-green-100">
            <span className="text-gray-600 font-medium">Total:</span>
            <span className="font-bold text-green-700">{formatCurrency(results.total_avec_foncier)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Taux:</span>
            <span className="font-semibold">{formatPercentage(results.taux_effectif_avec_foncier)}</span>
          </div>
        </div>
      </div>

      {/* Ligne 3, Colonne 3 : Détail des revenus */}
      <div className="bg-white rounded-lg p-3 border">
        <h4 className="text-sm font-semibold mb-2 text-gray-700">Détail revenus</h4>
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">Brut:</span>
            <span className="font-medium">{formatCurrency(results.salaire_brut_annuel)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Abattement:</span>
            <span className="font-medium">{formatCurrency(results.salaire_brut_annuel * 0.1)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span className="text-gray-600">Imposable:</span>
            <span className="text-green-700">{formatCurrency(results.salaire_imposable)}</span>
          </div>
        </div>
      </div>

      {/* Ligne 3, Colonne 4 : Impact immobilier */}
      <div className="bg-white rounded-lg p-3 border">
        <h4 className="text-sm font-semibold mb-2 text-gray-700">Impact immobilier</h4>
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">Loyers:</span>
            <span className="font-medium text-green-700">{formatCurrency(results.loyers_percus_total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Charges:</span>
            <span className="font-medium text-red-600">{formatCurrency(results.charges_foncieres_total)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span className="text-gray-600">Nets:</span>
            <span className="text-blue-700">{formatCurrency(results.revenu_foncier_net)}</span>
          </div>
        </div>
      </div>

      {/* Ligne 4 : Bénéfice net immobilier (toutes colonnes) */}
      <div className="col-span-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border-2 border-dashed border-blue-300">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-2xl">{getBenefitIcon(results.benefice_net)}</span>
            <span className="text-lg font-semibold">Bénéfice net immobilier</span>
          </div>
          <div className="text-3xl font-bold">
            <Badge className={`${getBenefitColor(results.benefice_net)} text-lg px-3 py-1`}>
              {formatCurrency(results.benefice_net)}
            </Badge>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded p-2">
              <div className="text-xs text-gray-500 mb-1">Cash-flow brut</div>
              <div className="text-sm font-semibold">
                {formatCurrency(results.loyers_percus_total - results.charges_foncieres_total)}
              </div>
            </div>
            <div className="bg-blue-50 rounded p-2">
              <div className="text-xs text-blue-600 mb-1">Cash-flow net</div>
              <div className="text-sm font-semibold text-blue-700">
                {formatCurrency(results.benefice_net)}
              </div>
            </div>
            <div className="bg-green-50 rounded p-2">
              <div className="text-xs text-green-600 mb-1">Rendement brut</div>
              <div className="text-sm font-semibold text-green-700">
                {results.loyers_percus_total > 0 ? `${((results.loyers_percus_total / 200000) * 100).toFixed(1)}%` : '0%'}
              </div>
            </div>
            <div className="bg-purple-50 rounded p-2">
              <div className="text-xs text-purple-600 mb-1">Rendement net</div>
              <div className="text-sm font-semibold text-purple-700">
                {results.loyers_percus_total > 0 ? `${((results.benefice_net / 200000) * 100).toFixed(1)}%` : '0%'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ligne 5 : Optimisation fiscale et recommandation (toutes colonnes) */}
      <div className="col-span-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Optimisation fiscale */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-purple-700">
              <span className="text-xl">🎯</span>
              Optimisation Fiscale
            </h3>
            <div className="space-y-3">
              <div className="bg-white/70 rounded p-3 border border-purple-100">
                <h4 className="font-semibold text-purple-700 mb-2 text-sm">Déficit Foncier</h4>
                <p className="text-xs text-gray-600 mb-2">
                  {results.revenu_foncier_net < 0
                    ? `Déficit de ${formatCurrency(Math.abs(results.revenu_foncier_net))}`
                    : "Pas de déficit foncier"}
                </p>
                <div className="bg-purple-100 rounded p-2">
                  <p className="text-xs text-purple-700 font-medium">💡 Limite: 10 700€/an</p>
                </div>
              </div>

              <div className="bg-white/70 rounded p-3 border border-indigo-100">
                <h4 className="font-semibold text-indigo-700 mb-2 text-sm">PER</h4>
                <p className="text-xs text-gray-600 mb-2">
                  {results.salaire_imposable > 75000 ? "Tranche élevée" : "Continuez"}
                </p>
                <div className="bg-indigo-100 rounded p-2">
                  <p className="text-xs text-indigo-700 font-medium">📊 Économie: {formatCurrency((results.versement_PER_deductible || 0) * 0.3)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recommandation */}
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Recommandation</h3>
            <div className="bg-white/70 rounded-lg p-4 border">
              <p className="text-sm text-gray-600">
                {results.benefice_net > 0
                  ? "✅ Bonne opportunité d'investissement"
                  : results.benefice_net < 0
                  ? "❌ Rentabilité à réévaluer"
                  : "⚪ Situation neutre"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
