'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import TaxSimulationForm from './components/TaxSimulationForm';
import type { TaxSimulationInput, TaxCalculationResult } from '@/types/tax-simulation';

export default function TaxSimulationPage() {
  const [results, setResults] = useState<TaxCalculationResult | null>(null);
  const [inputData, setInputData] = useState<TaxSimulationInput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // État pour les sliders interactifs
  const [sliderValues, setSliderValues] = useState({
    salaire_brut_annuel: 48000,
    loyers_percus_total: 25000,
    charges_foncieres_total: 0,
    travaux_deja_effectues: 0,
    versement_PER_deductible: 0
  });

  // État pour les valeurs optimales ajustées via sliders
  const [adjustedOptimalValues, setAdjustedOptimalValues] = useState({
    PER: 0,
    travaux: 0
  });

  // État pour la modal de détail des calculs d'impôt
  const [showTaxCalculationModal, setShowTaxCalculationModal] = useState(false);

  // Fonctions utilitaires
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getBenefitIcon = (value: number) => {
    if (value > 0) return '📈';
  };

  const getBenefitColor = (value: number) => {
    if (value > 0) return 'bg-green-100 text-green-800'; // Positif = vert (performance)
    if (value < 0) return 'bg-red-100 text-red-800';    // Négatif = rouge (charges)
    return 'bg-gray-100 text-gray-800';                // Neutre = gris
  };

  const handleSliderChange = (field: keyof typeof sliderValues, value: number) => {
    setSliderValues(prev => ({ ...prev, [field]: value }));
  };

  // Gestionnaire pour les sliders des valeurs optimales
  const handleOptimalSliderChange = (type: 'PER' | 'travaux', value: number) => {
    // S'assurer que la valeur ne dépasse pas le max du slider
    const maxValue = type === 'PER' ? 50000 : 40000;
    const clampedValue = Math.min(value, maxValue);

    setAdjustedOptimalValues(prev => ({ ...prev, [type]: clampedValue }));

    // Forcer le recalcul des recommandations en modifiant temporairement results
    // Cela va déclencher un re-rendu qui recalculera les recommandations avec les nouvelles valeurs optimales
    setTimeout(() => {
      setResults(prev => prev ? { ...prev } : null);
    }, 10);
  };

  // Calcul des recommandations avec les valeurs des sliders
  const calculateSmartRecommendations = (results: any, inputData: any) => {
    const recommendations = [];
    // Utiliser les valeurs des sliders si disponibles, sinon les valeurs de results
    const currentSalaire = sliderValues.salaire_brut_annuel || results?.salaire_brut_annuel || 0;
    const currentLoyers = sliderValues.loyers_percus_total || results?.loyers_percus_total || 0;
    const currentCharges = sliderValues.charges_foncieres_total || results?.charges_foncieres_total || 0;
    const currentTravaux = results?.travaux_deja_effectues || 0;
    const currentPER = inputData?.versement_PER_deductible || results?.versement_PER_deductible || 0;

    // Fonction pour calculer l'IR selon barème français 2025
    const calculateIR = (assietteImposable: number): number => {
      const tranches = [
        { limite: 11294, taux: 0 },
        { limite: 28797, taux: 0.11 },
        { limite: 82341, taux: 0.30 },
        { limite: 177106, taux: 0.41 },
        { limite: Infinity, taux: 0.45 }
      ];

      let ir = 0;
      let restant = assietteImposable;

      for (const tranche of tranches) {
        if (restant <= 0) break;

        const imposableDansTranche = Math.min(restant, tranche.limite - (tranches[tranches.indexOf(tranche) - 1]?.limite || 0));
        ir += imposableDansTranche * tranche.taux;
        restant -= imposableDansTranche;
      }

      return ir;
    };

    // 1. Analyse PER - Calcul selon règles fiscales 2025
    const salaireImposable = results.salaire_imposable;

    // Règles fiscales 2025 (revenus 2024)
    const PASS_2024 = 46368; // PASS 2024
    const PLAFOND_MAX_PER = PASS_2024 * 8 * 0.1; // 10% de 8 PASS = 37 094€
    const PLAFOND_MIN_PER = PASS_2024 * 0.1; // 10% du PASS = 4 636€

    // Calcul du plafond PER selon la réglementation
    const salaireBrut = sliderValues.salaire_brut_annuel || results.salaire_brut_annuel;
    const salaireImposableCalc = salaireBrut * 0.9; // Abattement 10%
    const plafondPER_brut = salaireImposableCalc * 0.1; // 10% du salaire imposable
    const perMaxAnneeEnCours = Math.max(
      PLAFOND_MIN_PER, // Minimum 4 636€
      Math.min(plafondPER_brut, PLAFOND_MAX_PER) // Maximum 37 094€
    );

    // Calcul du plafond PER avec reports des années précédentes (3 années max)
    const reportsAnnesPrecedentes = 3; // Nombre d'années de reports possibles
    const perMaxAvecReports = perMaxAnneeEnCours * (reportsAnnesPrecedentes + 1); // +1 pour l'année en cours

    // Le plafond effectif est le minimum entre le plafond avec reports et le plafond maximum légal
    const perMax = Math.min(perMaxAvecReports, PLAFOND_MAX_PER * 4);

    // Valeur optimale recommandée = plafond de l'année en cours (sans compter les reports pour l'objectif initial)
    const perOptimal = perMaxAnneeEnCours;

    // Calcul de la tranche marginale
    const tranches = [
      { seuil: 0, taux: 0 },
      { seuil: 11294, taux: 0.11 },
      { seuil: 28797, taux: 0.30 },
      { seuil: 82341, taux: 0.41 },
      { seuil: 177106, taux: 0.45 }
    ];

    let trancheMarginale = tranches[0].taux;
    for (const tranche of tranches) {
      if (salaireImposableCalc > tranche.seuil) {
        trancheMarginale = tranche.taux;
      } else {
        break;
      }
    }

    const economiePER = Math.min(perOptimal, salaireBrut * 0.1) * trancheMarginale;
    const optimalValue = adjustedOptimalValues.PER > 0 ? adjustedOptimalValues.PER : perOptimal;

    // L'économie ne peut pas dépasser le plafond avec reports, même si l'objectif est plus élevé
    const economieSupplementaire = Math.max(0, Math.min(perMax - currentPER, optimalValue - currentPER)) * trancheMarginale;

    recommendations.push({
      type: 'PER',
      title: 'Optimisation PER',
      current: currentPER,
      baseOptimal: Math.round(perMax), // Valeur optimale de base (non ajustée)
      optimal: adjustedOptimalValues.PER > 0 ? adjustedOptimalValues.PER : Math.round(perOptimal),
      potential: Math.round(economieSupplementaire),
      ratio: perOptimal > 0 ? economiePER / perOptimal : 0,
      details: {
        trancheMarginale: Math.round(trancheMarginale * 100),
        perMax: Math.round(perMax),
        perOptimal: Math.round(perOptimal),
        perMaxAnneeEnCours: Math.round(perMaxAnneeEnCours),
        reportsAnnesPrecedentes: reportsAnnesPrecedentes,
        plafondMax: Math.round(PLAFOND_MAX_PER),
        plafondMin: Math.round(PLAFOND_MIN_PER),
        economieSupplementaire: Math.round(economieSupplementaire),
        investissementSupplementaire: Math.round(Math.max(0, Math.min(perMax - currentPER, optimalValue - currentPER))),
        optimalValue: Math.round(optimalValue)
      },
      description: `Votre tranche marginale est de ${Math.round(trancheMarginale * 100)}%. Plafond PER avec ${reportsAnnesPrecedentes} reports : max ${formatCurrency(perMax)} (au lieu de ${formatCurrency(perMaxAnneeEnCours)} pour 1 année). L'économie est limitée au plafond légal.`,
      icon: '📈'
    });

    // 2. Analyse des travaux - Calcul basé sur données réelles
    const loyersBruts = sliderValues.loyers_percus_total || results.loyers_percus_total;
    const chargesTotales = sliderValues.charges_foncieres_total || results.charges_foncieres_total;
    const revenuFoncierNet = loyersBruts - chargesTotales;
    const deficitActuel = Math.max(0, -revenuFoncierNet);
    const plafondDeficit = 10700;
    const travauxDejaEffectues = results.travaux_deja_effectues || 0;

    if (loyersBruts > 0) {
      const loyers = loyersBruts;

      // Calcul de la valeur optimale qui amène le déficit foncier à 0 (sans les travaux actuels)
      const revenuFoncierSansTravaux = loyersBruts - chargesTotales; // Sans les travaux actuels
      const chargesSupplementaires = Math.max(0, -revenuFoncierSansTravaux); // Charges à ajouter pour équilibrer
      const deficitNulOptimal = Math.min(chargesSupplementaires, 40000); // Limité au max du slider

      // Si les charges à ajouter dépassent le plafond, le déficit nul est au plafond
      // car on ne peut pas déduire plus que le plafond fiscal

      // Proposer plusieurs scénarios de travaux au lieu d'un seul montant
      const scenariosTravaux = [
        { montant: deficitNulOptimal, label: "Déficit nul", description: "Équilibre revenus/charges" },
        { montant: Math.max(results.revenu_foncier_net, 0) + 10700, label: "Plafond fiscal", description: "Plafond légal 2025" },
        { montant: 15000, label: "Report possible", description: "Report 2026" }
      ].filter(scenario => scenario.montant > 0);

      // Calculer l'impact pour chaque scénario avec calcul fiscal réaliste
      const scenarios = scenariosTravaux.map(scenario => {
        const travaux = scenario.montant;

        // Assiette imposable totale SANS travaux
        const assietteSansTravaux = results.salaire_imposable + revenuFoncierNet;

        // Assiette imposable totale AVEC travaux
        const revenusFonciersApresTravaux = Math.max(0, revenuFoncierNet - travaux);
        const assietteAvecTravaux = results.salaire_imposable + revenusFonciersApresTravaux;

        // Calcul de l'IR selon barème progressif français 2025
        const irSansTravaux = calculateIR(assietteSansTravaux);
        const irAvecTravaux = calculateIR(assietteAvecTravaux);

        // Calcul des prélèvements sociaux (17,2% sur revenus fonciers uniquement)
        const psSansTravaux = Math.max(0, revenuFoncierNet) * 0.172;
        const psAvecTravaux = Math.max(0, revenusFonciersApresTravaux) * 0.172;

        // Impôt total sans travaux
        const impotSansTravaux = irSansTravaux + psSansTravaux;

        // Impôt total avec travaux
        const impotAvecTravaux = irAvecTravaux + psAvecTravaux;

        // Économie fiscale réelle
        const economieReelle = impotSansTravaux - impotAvecTravaux;

        return {
          ...scenario,
          travaux: travaux,
          economie: economieReelle,
          revenusApres: revenusFonciersApresTravaux,
          assietteSansTravaux: assietteSansTravaux,
          assietteAvecTravaux: assietteAvecTravaux,
          irSansTravaux: irSansTravaux,
          irAvecTravaux: irAvecTravaux,
          psSansTravaux: psSansTravaux,
          psAvecTravaux: psAvecTravaux,
          ratio: travaux > 0 ? economieReelle / travaux : 0
        };
      });

      // Trier par ratio coût/bénéfice
      scenarios.sort((a, b) => b.ratio - a.ratio);

      recommendations.push({
        type: 'travaux_scenarios',
        title: 'Travaux - Analyse comparative',
        current: travauxDejaEffectues,
        baseOptimal: scenarios[0]?.travaux || 0, // Valeur optimale de base (non ajustée)
        optimal: adjustedOptimalValues.travaux > 0 ? adjustedOptimalValues.travaux : Math.max(results.revenu_foncier_net, 0),
        potential: adjustedOptimalValues.travaux > 0
          ? (() => {
              // Si l'utilisateur a choisi une valeur personnalisée, calculer l'économie pour cette valeur
              const userValue = adjustedOptimalValues.travaux;
              const revenusApresTravaux = Math.max(0, revenuFoncierNet - userValue);
              const assietteAvecTravaux = results.salaire_imposable + revenusApresTravaux;
              const irAvecTravaux = calculateIR(assietteAvecTravaux);
              const psAvecTravaux = Math.max(0, revenusApresTravaux) * 0.172;
              const impotAvecTravaux = irAvecTravaux + psAvecTravaux;

              // Calculer aussi les valeurs sans travaux pour la comparaison
              const irSansTravaux = calculateIR(results.salaire_imposable + revenuFoncierNet);
              const psSansTravaux = Math.max(0, revenuFoncierNet) * 0.172;
              const economieReelle = (irSansTravaux + psSansTravaux) - impotAvecTravaux;
              return Math.round(economieReelle);
            })()
          : scenarios[0]?.economie || 0,
        ratio: adjustedOptimalValues.travaux > 0
          ? (() => {
              const userValue = adjustedOptimalValues.travaux;
              const revenusApresTravaux = Math.max(0, revenuFoncierNet - userValue);
              const assietteAvecTravaux = results.salaire_imposable + revenusApresTravaux;
              const irAvecTravaux = calculateIR(assietteAvecTravaux);
              const psAvecTravaux = Math.max(0, revenusApresTravaux) * 0.172;
              const impotAvecTravaux = irAvecTravaux + psAvecTravaux;

              const irSansTravaux = calculateIR(results.salaire_imposable + revenuFoncierNet);
              const psSansTravaux = Math.max(0, revenuFoncierNet) * 0.172;
              const economieReelle = (irSansTravaux + psSansTravaux) - impotAvecTravaux;

              return userValue > 0 ? economieReelle / userValue : 0;
            })()
          : scenarios[0]?.ratio || 0,
        scenarios: scenarios,
        optimalValue: Math.max(results.revenu_foncier_net, 0) + 10700, // Valeur pour le flag orange
        icon: '🔨'
      });
    }

    // 3. Analyse globale - Ordonnancement fixe : PER puis Travaux
    // Trier d'abord par type pour avoir un ordre fixe, puis par ratio
    recommendations.sort((a, b) => {
      // PER en premier, puis Travaux
      if (a.type === 'PER' && b.type === 'travaux_scenarios') return -1;
      if (a.type === 'travaux_scenarios' && b.type === 'PER') return 1;
      // Si même type, trier par ratio décroissant
      return (b.ratio || 0) - (a.ratio || 0);
    });

    return recommendations;
  };

  const handleFormSubmit = async (formData: TaxSimulationInput) => {
    setIsLoading(true);
    setError(null);
    setInputData(formData); // Stocker les données d'entrée

    try {
      const response = await fetch('/api/tax/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors du calcul');
      }

      const calculationResults = await response.json();
      setResults(calculationResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      console.error('Erreur lors de la simulation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSimulation = () => {
    setResults(null);
    setInputData(null);
    setError(null);
  };

  // Fonction d'export PDF stylé
  const handleExportPDF = async () => {
    if (!results) return;

    try {
      // Import dynamique de jsPDF
      const { jsPDF } = await import('jspdf');

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 25;
      let yPosition = margin;

      // Configuration pour l'encodage français
      doc.setProperties({
        title: 'Simulation Fiscale Immobilière',
        subject: 'Rapport de simulation fiscale',
        author: 'Application de simulation fiscale',
        keywords: 'impots, fiscalite, immobilier, simulation'
      });

      // En-tête avec fond bleu officiel français
      doc.setFillColor(0, 51, 160); // Bleu officiel français
      doc.rect(0, 0, pageWidth, 45, 'F');

      // Titre principal en blanc
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('RÉPUBLIQUE FRANÇAISE', pageWidth / 2, 22, { align: 'center' });

      doc.setFontSize(18);
      doc.text('MINISTÈRE DE L\'ÉCONOMIE ET DES FINANCES', pageWidth / 2, 32, { align: 'center' });

      // Sous-titre
      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      doc.text('Simulation fiscale de votre investissement immobilier', pageWidth / 2, 42, { align: 'center' });

      yPosition = 65;

      // Section données d'entrée avec bordure
      doc.setDrawColor(0, 51, 160);
      doc.setLineWidth(1.5);
      doc.rect(margin - 3, yPosition - 8, pageWidth - 2*margin + 6, 75, 'S');

      doc.setTextColor(0, 51, 160);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('DONNÉES D\'ENTRÉE', margin, yPosition);
      yPosition += 15;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      if (inputData) {
        const inputFields = [
          { label: 'Salaire brut annuel', value: formatCurrency(inputData.salaire_brut_annuel) },
          { label: 'Parts de quotient familial', value: inputData.parts_quotient_familial.toString() },
          { label: 'Loyers perçus total', value: formatCurrency(inputData.loyers_percus_total || 0) },
          { label: 'Charges déductibles', value: formatCurrency(inputData.charges_foncieres_total || 0) },
          { label: 'Travaux déjà effectués', value: formatCurrency(inputData.travaux_deja_effectues || 0) },
          { label: 'Régime foncier', value: inputData.regime_foncier === 'reel' ? 'Régime réel' : 'Micro-foncier' }
        ];

        inputFields.forEach((field, index) => {
          const x = index % 2 === 0 ? margin : pageWidth / 2 + 10;
          if (index % 2 === 0 && index > 0) yPosition += 12;

          // Label en gras
          doc.setFont('helvetica', 'bold');
          doc.text(field.label + ':', x, yPosition);
          // Valeur en normal
          doc.setFont('helvetica', 'normal');
          doc.text(field.value, x + 50, yPosition);
          yPosition += 12;
        });
      }

      yPosition += 10;

      // Section résultats avec bordure rouge
      if (yPosition > pageHeight - 110) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setDrawColor(220, 38, 38); // Rouge officiel
      doc.setLineWidth(1.5);
      doc.rect(margin - 3, yPosition - 8, pageWidth - 2*margin + 6, 85, 'S');

      doc.setTextColor(220, 38, 38);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('RÉSULTATS DE CALCUL', margin, yPosition);
      yPosition += 15;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const resultsData = [
        { label: 'Revenus fonciers nets', value: formatCurrency(results.revenu_foncier_net) },
        { label: 'Impôt sur le revenu', value: formatCurrency(results.IR_avec_foncier) },
        { label: 'Prélèvements sociaux (17,2%)', value: formatCurrency(results.PS_foncier) },
        { label: 'Total des impôts', value: formatCurrency(results.total_avec_foncier) },
        { label: 'Taux effectif d\'imposition', value: formatPercentage(results.taux_effectif_avec_foncier) },
        { label: 'Bénéfice net immobilier', value: formatCurrency(results.benefice_net) }
      ];

      resultsData.forEach((result, index) => {
        const x = index % 2 === 0 ? margin : pageWidth / 2 + 10;
        if (index % 2 === 0 && index > 0) yPosition += 12;

        // Surlignage pour les montants importants
        if (index >= 1 && index <= 3) {
          doc.setFillColor(254, 249, 195);
          doc.rect(x - 2, yPosition - 3, 65, 8, 'F');
        }

        doc.setFont('helvetica', 'bold');
        doc.text(result.label + ':', x, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(result.value, x + 50, yPosition);
        yPosition += 12;
      });

      // Recommandations avec style professionnel
      if (yPosition > pageHeight - 130) {
        doc.addPage();
        yPosition = margin;
      }

      yPosition += 15;

      // En-tête recommandations avec fond coloré
      doc.setFillColor(240, 253, 250);
      doc.rect(margin - 3, yPosition - 8, pageWidth - 2*margin + 6, 20, 'F');

      doc.setTextColor(0, 51, 160);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('RECOMMANDATIONS PERSONNALISÉES', margin, yPosition);
      yPosition += 20;

      // Récupérer les recommandations
      const recommendations = calculateSmartRecommendations(results, inputData);

      recommendations.forEach((rec: any, index: number) => {
        if (yPosition > pageHeight - 70) {
          doc.addPage();
          yPosition = margin;
        }

        // Fond alterné pour chaque recommandation
        if (index % 2 === 1) {
          doc.setFillColor(249, 250, 251);
          doc.rect(margin, yPosition - 5, pageWidth - 2*margin, 20, 'F');
        }

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${rec.icon} ${rec.title}`, margin + 5, yPosition);
        yPosition += 8;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        if (rec.type === 'PER' && rec.details) {
          const perDetails = [
            `Tranche marginale: ${rec.details.trancheMarginale}%`,
            `PER maximum déductible: ${formatCurrency(rec.details.perMax)}`,
            `Économie d'impôt: ${formatCurrency(rec.details.economieSupplementaire)}`
          ];
          perDetails.forEach(line => {
            doc.text(`• ${line}`, margin + 10, yPosition);
            yPosition += 7;
          });
        } else if (rec.type === 'travaux_scenarios' && rec.scenarios) {
          rec.scenarios.slice(0, 2).forEach((scenario: any) => {
            doc.text(`• ${scenario.label}: ${formatCurrency(scenario.economie)} d'économie (${scenario.ratio?.toFixed(1)}:1)`, margin + 10, yPosition);
            yPosition += 7;
          });
        }
        yPosition += 10;
      });

      // Pied de page stylé
      const footerY = pageHeight - 18;
      doc.setFillColor(0, 51, 160);
      doc.rect(0, footerY - 8, pageWidth, 15, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')} - Simulation fiscale personnalisée - Confidentiel`, pageWidth / 2, footerY, { align: 'center' });

      // Sauvegarder le PDF
      doc.save(`simulation-fiscale-${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      alert('Erreur lors de l\'export PDF. Vérifiez que jsPDF est installé.');
    }
  };

  // Fonction pour synchroniser les sliders avec le formulaire
  const handleExternalFormUpdate = (field: keyof TaxSimulationInput, value: any) => {
    setInputData(prev => prev ? ({ ...prev, [field]: value }) : null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 py-4">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Grille principale 4 colonnes */}
        <div className="grid grid-cols-4 grid-rows-[auto_auto_auto_auto_auto_auto_auto] gap-3">

          {/* Ligne 1 : Titre sur toutes les colonnes */}
          <div className="col-span-4 flex justify-between items-center p-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg text-white">
            <div>
              <h1 className="text-2xl font-bold">SIMULATION IMPÔT FR</h1>
              <p className="text-blue-100 mt-1">Calcul d'impact fiscal de votre investissement immobilier</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportPDF}
                className="px-4 py-2 text-sm bg-green-600 text-white hover:bg-green-700 rounded-md transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l4-4m-4 4l-4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Exporter PDF
              </button>
              <button
                onClick={handleNewSimulation}
                className="px-4 py-2 text-sm bg-white text-blue-600 hover:bg-blue-50 rounded-md transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Nouvelle simulation
              </button>
            </div>
          </div>

          {/* Ligne 2-4 : Formulaire de saisie (colonnes 1-2) */}
          <div className="col-span-2 row-span-3 bg-white rounded-lg p-4 border">
            <TaxSimulationForm onSubmit={handleFormSubmit} isLoading={isLoading} />

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <div className="text-center text-red-700">
                  <p className="font-semibold text-sm">Erreur</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Ligne 2, Colonne 3 : Salaire (maintenant au-dessus) */}
          {results && (
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <h4 className="text-sm font-semibold mb-2 text-slate-700">Salaire</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Brut:</span>
                  <span className="font-semibold text-slate-700">{formatCurrency(results.salaire_brut_annuel)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Abattement 10%:</span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(results.salaire_brut_annuel * 0.1)}</span>
                </div>
                {/* Afficher le PER déductible s'il y en a un saisi */}
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">PER déductible:</span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(inputData?.versement_PER_deductible || 0)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-blue-100 text-xs">
                  <span className="text-gray-600 font-semibold">Nets imposables:</span>
                  <span className="font-bold text-blue-700">{formatCurrency(results.salaire_imposable)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Ligne 2, Colonne 4 : Fonciers (maintenant au-dessus) */}
          {results && (
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <h4 className="text-sm font-semibold mb-2 text-slate-700">Fonciers</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Loyers:</span>
                  <span className="font-semibold text-slate-700">{formatCurrency(results.loyers_percus_total)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Charges:</span>
                  <span className="font-semibold text-orange-600">{formatCurrency(results.charges_foncieres_total)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Travaux actuels:</span>
                  <span className="font-semibold text-orange-600">{formatCurrency(results.travaux_deja_effectues || 0)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-blue-100 text-xs">
                  <span className="text-gray-600 font-semibold">Nets imposables:</span>
                  <span className="font-bold text-blue-700">{formatCurrency(Math.max(results.revenu_foncier_net, 0))}</span>
                </div>
              </div>
            </div>
          )}

          {/* Ligne 3, Colonne 3 : Impot détaillé (maintenant en-dessous) */}
          {results && (
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <h3 className="text-sm font-semibold mb-2 text-blue-700">Impot</h3>
              <div className="space-y-3">
                {/* Impôt salaire */}
                <div className="bg-white/70 rounded p-2 border border-blue-100">
                  <h4 className="text-xs font-semibold mb-1 text-blue-600">💼 Impôt salaire</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base imposable:</span>
                      <span className="font-semibold">{formatCurrency(results.salaire_imposable)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">IR:</span>
                      <span className="font-semibold text-orange-600">{formatCurrency(results.IR_sans_foncier)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-blue-50">
                      <span className="text-gray-600 font-medium">Total salaire:</span>
                      <span className="font-bold text-blue-700">{formatCurrency(results.total_sans_foncier)}</span>
                    </div>
                  </div>
                </div>

                {/* Impôt foncier */}
                <div className="bg-white/70 rounded p-2 border border-green-100">
                  <h4 className="text-xs font-semibold mb-1 text-green-600">🏠 Impôt foncier</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base imposable:</span>
                      <span className="font-semibold">{formatCurrency(results.revenu_foncier_net)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">IR foncier:</span>
                      <span className="font-semibold text-orange-600">{formatCurrency(results.IR_avec_foncier - results.IR_sans_foncier)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">PS (17,2%):</span>
                      <span className="font-semibold text-orange-600">{formatCurrency(results.PS_foncier)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-green-50">
                      <span className="text-gray-600 font-medium">Total foncier:</span>
                      <span className="font-bold text-blue-700">{formatCurrency((results.IR_avec_foncier - results.IR_sans_foncier) + results.PS_foncier)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ligne 3, Colonne 4 : TOTAL impot (maintenant en-dessous) */}
          {results && (
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-blue-700">TOTAL impot</h3>
                <Dialog open={showTaxCalculationModal} onOpenChange={setShowTaxCalculationModal}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs">
                      📊 Détail
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Détail des calculs d&apos;impôt</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {/* Assiette imposable totale */}
                      <div className="bg-white rounded-lg p-4 border border-slate-200">
                        <h4 className="font-semibold text-slate-700 mb-3">📊 Assiette imposable totale</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Salaire imposable:</span>
                            <span className="font-semibold">{formatCurrency(results.salaire_imposable)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Revenus fonciers imposables:</span>
                            <span className="font-semibold">{formatCurrency(Math.max(results.revenu_foncier_net, 0))}</span>
                          </div>
                          <div className="border-t pt-2">
                            <div className="flex justify-between font-semibold text-blue-700">
                              <span>Assiette imposable totale:</span>
                              <span>{formatCurrency(results.salaire_imposable + Math.max(results.revenu_foncier_net, 0))}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Calcul de l'IR par tranches */}
                      <div className="bg-white rounded-lg p-4 border border-slate-200">
                        <h4 className="font-semibold text-slate-700 mb-3">💰 Calcul de l&apos;impôt sur le revenu (Barème 2025)</h4>
                        <div className="space-y-3 text-sm">
                          {(() => {
                            const assietteTotale = results.salaire_imposable + Math.max(results.revenu_foncier_net, 0);
                            const tranches = [
                              { seuil: 0, limite: 11294, taux: 0, label: "0% (0-11 294€)" },
                              { seuil: 11294, limite: 28797, taux: 0.11, label: "11% (11 294-28 797€)" },
                              { seuil: 28797, limite: 82341, taux: 0.30, label: "30% (28 797-82 341€)" },
                              { seuil: 82341, limite: 177106, taux: 0.41, label: "41% (82 341-177 106€)" },
                              { seuil: 177106, limite: Infinity, taux: 0.45, label: "45% (177 106€+)" }
                            ];

                            let restant = assietteTotale;
                            let irTotal = 0;

                            return tranches.map((tranche, index) => {
                              if (restant <= 0) return null;

                              const imposableDansTranche = Math.min(restant, tranche.limite - tranche.seuil);
                              const irTranche = imposableDansTranche * tranche.taux;
                              irTotal += irTranche;
                              restant -= imposableDansTranche;

                              return (
                                <div key={index} className="flex justify-between items-center p-2 bg-white rounded border">
                                  <div>
                                    <div className="font-medium">Tranche {tranche.label}</div>
                                    <div className="text-xs text-gray-600">
                                      {formatCurrency(imposableDansTranche)} × {Math.round(tranche.taux * 100)}% = {formatCurrency(irTranche)}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold text-blue-600">{formatCurrency(irTranche)}</div>
                                  </div>
                                </div>
                              );
                            }).filter(Boolean);
                          })()}
                          <div className="border-t pt-2">
                            <div className="flex justify-between font-semibold text-green-700">
                              <span>Total IR:</span>
                              <span>{formatCurrency(results.IR_avec_foncier)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Calcul des prélèvements sociaux */}
                      <div className="bg-white rounded-lg p-4 border border-slate-200">
                        <h4 className="font-semibold text-slate-700 mb-3">📋 Prélèvements sociaux (17,2%)</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Revenus fonciers imposables:</span>
                            <span className="font-semibold">{formatCurrency(Math.max(results.revenu_foncier_net, 0))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Taux des prélèvements sociaux:</span>
                            <span className="font-semibold">17,2%</span>
                          </div>
                          <div className="border-t pt-2">
                            <div className="flex justify-between font-semibold text-orange-700">
                              <span>Total PS:</span>
                              <span>{formatCurrency(results.PS_foncier)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Résumé total */}
                      <div className="bg-white rounded-lg p-4 border border-slate-200">
                        <h4 className="font-semibold text-slate-700 mb-3">🎯 Résumé total</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Impôt sur le revenu:</span>
                            <span className="font-semibold">{formatCurrency(results.IR_avec_foncier)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Prélèvements sociaux:</span>
                            <span className="font-semibold">{formatCurrency(results.PS_foncier)}</span>
                          </div>
                          <div className="border-t pt-2">
                            <div className="flex justify-between font-bold text-purple-700">
                              <span>Total impôts:</span>
                              <span>{formatCurrency(results.total_avec_foncier)}</span>
                            </div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-600 mt-1">
                            <span>Taux effectif d&apos;imposition:</span>
                            <span className="font-semibold">{formatPercentage(results.taux_effectif_avec_foncier)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Total salaire:</span>
                  <span className="font-semibold text-blue-600">{formatCurrency(results.total_sans_foncier)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Total foncier:</span>
                  <span className="font-semibold text-blue-600">{formatCurrency((results.IR_avec_foncier - results.IR_sans_foncier) + results.PS_foncier)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-100 text-xs">
                  <span className="text-slate-600 font-medium">Total global:</span>
                  <span className="font-bold text-blue-700">{formatCurrency(results.total_avec_foncier)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Taux effectif:</span>
                  <span className="font-semibold text-orange-600">{formatPercentage(results.taux_effectif_avec_foncier)}</span>
                </div>
                {(() => {
                  const recommendations = calculateSmartRecommendations(results, inputData);
                  const perDetails = recommendations.find(rec => rec.type === 'PER')?.details;
                  const tmi = perDetails?.trancheMarginale || 0;

                  return (
                    <div className="flex justify-between text-xs pt-1 border-t border-slate-100">
                      <span className="text-slate-600 font-semibold">TMI:</span>
                      <span className="font-bold text-orange-600">
                        {tmi}% {tmi === 11 ? '(0-11k€)' : tmi === 30 ? '(11k-29k€)' : tmi === 41 ? '(29k-82k€)' : tmi === 45 ? '(82k€+)' : '(0€)'}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Ligne 4, Colonne 3 : Optimisation fiscale */}
          {results && (
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <h4 className="text-sm font-semibold mb-2 text-slate-700">Optimisation Fiscale</h4>
              <div className="space-y-2">
                <div className="bg-white/70 rounded p-2 border border-purple-100">
                  <h5 className="font-semibold text-purple-700 mb-1 text-xs">Déficit Foncier</h5>
                  <p className="text-xs text-gray-600 mb-1">
                    {results.revenu_foncier_net < 0
                      ? `Déficit actuel: ${formatCurrency(Math.abs(results.revenu_foncier_net))}`
                      : `Excédent actuel: ${formatCurrency(results.revenu_foncier_net)}`}
                  </p>
                  <div className="bg-purple-100 rounded p-1">
                    <p className="text-xs text-purple-700 font-medium">💡 Plafond: 10 700€/an</p>
                    {results.revenu_foncier_net >= 0 && (
                      <>
                        <p className="text-xs text-purple-600 mt-1">
                          📊 Déficit nul: {formatCurrency(Math.abs(results.revenu_foncier_net))} de charges
                        </p>
                        <p className="text-xs text-purple-600">
                          🎯 Optimisation max: {formatCurrency(Math.abs(results.revenu_foncier_net) + 10700)} de charges
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ligne 4, Colonne 4 : PER */}
          {results && (
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <h4 className="text-sm font-semibold mb-2 text-slate-700">PER</h4>
              <div className="space-y-2">
                <div className="bg-white/70 rounded p-2 border border-purple-100">
                  <p className="text-xs text-gray-600 mb-1">
                    {results.salaire_imposable > 75000 ? "Tranche élevée" : "Continuez"}
                  </p>
                  <div className="bg-purple-100 rounded p-1">
                    <p className="text-xs text-purple-700 font-medium">📊 Économie: {formatCurrency((inputData?.versement_PER_deductible || 0) * 0.3)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ligne 5 : Bénéfice net immobilier (toutes colonnes) */}
          {results && (
            <div className="col-span-4 bg-white rounded-lg p-4 border border-slate-200">
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-2xl">{getBenefitIcon(results.benefice_net)}</span>
                  <span className="text-lg font-semibold text-slate-700">Bénéfice net immobilier</span>
                </div>
                <div className="text-3xl font-bold">
                  <Badge className={`${getBenefitColor(results.benefice_net)} text-lg px-3 py-1`}>
                    {formatCurrency(results.benefice_net)}
                  </Badge>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-emerald-50 rounded p-2 relative group">
                    <div className="text-xs text-emerald-600 mb-1 flex items-center gap-1">
                      Cash-flow brut
                      <span className="cursor-help text-emerald-400 hover:text-emerald-600" title="Revenus locatifs bruts moins charges déductibles. Représente le flux de trésorerie avant impôts et charges financières.">
                        ℹ️
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-emerald-700">
                      {formatCurrency(results.benefice_brut)}
                    </div>
                  </div>
                  <div className="bg-emerald-50 rounded p-2 relative group">
                    <div className="text-xs text-emerald-600 mb-1 flex items-center gap-1">
                      Cash-flow net
                      <span className="cursor-help text-emerald-400 hover:text-emerald-600" title="Cash-flow brut après déduction des impôts. Représente le revenu net réellement perçu après fiscalité.">
                        ℹ️
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-emerald-700">
                      {formatCurrency(results.benefice_net)}
                    </div>
                  </div>
                  <div className="bg-emerald-50 rounded p-2 relative group">
                    <div className="text-xs text-emerald-600 mb-1 flex items-center gap-1">
                      Rendement brut
                      <span className="cursor-help text-emerald-400 hover:text-emerald-600" title="Rapport entre loyers annuels et valeur du bien. N/C = Non calculable (valeur du bien inconnue)">
                        ℹ️
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-emerald-700">
                      {results.autofill_from_db && results.loyers_percus_total > 0 ? `${((results.loyers_percus_total / 200000) * 100).toFixed(1)}%` : 'N/C'}
                    </div>
                  </div>
                  <div className="bg-emerald-50 rounded p-2 relative group">
                    <div className="text-xs text-emerald-600 mb-1 flex items-center gap-1">
                      Rendement net
                      <span className="cursor-help text-emerald-400 hover:text-emerald-600" title="Rapport entre cash-flow net et valeur du bien. N/C = Non calculable (valeur du bien inconnue)">
                        ℹ️
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-emerald-700">
                      {results.autofill_from_db && results.loyers_percus_total > 0 ? `${((results.benefice_net / 200000) * 100).toFixed(1)}%` : 'N/C'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ligne 7 : Recommandation intelligente (toutes colonnes) */}
          {results && (
            <div className="col-span-4 bg-white rounded-lg p-4 border border-slate-200">
              <h3 className="text-lg font-semibold mb-4 text-slate-700 text-center">Recommandations personnalisées</h3>

              {(() => {
                const recommendations = calculateSmartRecommendations(results, inputData);

                return (
                  <div className="space-y-4">
                    {/* Résumé global */}
                    <div className="bg-white rounded-lg p-4 border border-slate-100">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div className="space-y-2">
                          <div className="text-2xl">{recommendations[0]?.icon || '🎯'}</div>
                          <h4 className="font-semibold text-slate-700">Priorité #1</h4>
                          <p className="text-sm text-slate-600">{recommendations[0]?.title || 'Optimisation fiscale'}</p>
                          <div className="text-xs text-slate-500">
                            Économie potentielle: <span className="font-semibold text-emerald-600">{formatCurrency(recommendations[0]?.potential || 0)}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-3xl font-bold text-blue-600">
                            {(() => {
                              // Calculer l'économie totale PER + travaux
                              const economiePER = recommendations.find(rec => rec.type === 'PER')?.potential || 0;
                              const economieTravaux = recommendations.find(rec => rec.type === 'travaux_scenarios')?.scenarios?.[0]?.economie || 0;
                              const economieTotale = economiePER + economieTravaux;
                              return formatCurrency(economieTotale);
                            })()}
                          </div>
                          <h4 className="font-semibold text-slate-700">Économie fiscale réalisée</h4>
                          <p className="text-sm text-slate-600">
                            {(() => {
                              // Calculer l'investissement total PER + travaux
                              const investissementPER = recommendations.find(rec => rec.type === 'PER')?.optimal || 0;
                              const investissementTravaux = recommendations.find(rec => rec.type === 'travaux_scenarios')?.scenarios?.[0]?.travaux || 0;
                              const investissementTotal = investissementPER + investissementTravaux;

                              // Recalculer l'économie totale pour le ratio
                              const economiePER = recommendations.find(rec => rec.type === 'PER')?.potential || 0;
                              const economieTravaux = recommendations.find(rec => rec.type === 'travaux_scenarios')?.scenarios?.[0]?.economie || 0;
                              const economieTotale = economiePER + economieTravaux;

                              const ratioOptimisation = investissementTotal > 0 ? economieTotale / investissementTotal : 0;
                              return `Investissement: ${formatCurrency(investissementTotal)} (${ratioOptimisation.toFixed(1)}:1)`;
                            })()}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="text-2xl">⚡</div>
                          <h4 className="font-semibold text-slate-700">Optimisation globale</h4>
                          <p className="text-sm text-slate-600">Juste équilibre trouvé</p>
                        </div>
                      </div>
                    </div>

                    {/* Graphiques de comparaison */}
                    <div className="bg-white rounded-lg p-4 border border-slate-100">
                      <h4 className="font-semibold text-slate-700 mb-3 text-center">📊 Analyse comparative</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {recommendations.slice(0, 2).map((rec, index) => (
                          <div key={rec.type} className="space-y-2">
                            <h5 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              {rec.icon} {rec.title}
                            </h5>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="w-16 text-xs text-gray-500">Actuel:</div>
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-gray-400 h-2 rounded-full"
                                    style={{ width: `${Math.min(100, (((rec.current || 0) / Math.max((rec.baseOptimal || rec.optimal || 1), 1)) * 100))}%` }}
                                  ></div>
                                </div>
                                <div className="w-12 text-xs text-right">{formatCurrency(rec.current || 0)}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-16 text-xs text-gray-500">Optimal:</div>
                                <div className="flex-1 relative">
                                  <div className="progress-slider" style={{
                                    '--slider-progress': `${((rec.optimal || 0) / Math.max((rec.type === 'PER' ? 50000 : 40000), 1)) * 100}%`,
                                    '--marker-position': `${rec.type === 'PER' && rec.details?.perMax ? ((rec.details.perMax || 0) / Math.max(50000, 1)) * 100 : rec.type === 'travaux_scenarios' && rec.optimalValue ? (rec.optimalValue / Math.max(40000, 1)) * 100 : 0}%`
                                  } as React.CSSProperties}>
                                    <input
                                      type="range"
                                      min={0}
                                      max={rec.type === 'PER' ? 50000 : 40000}
                                      step={100}
                                      value={rec.optimal || 0}
                                      onChange={(e) => {
                                        const newValue = parseInt(e.target.value);
                                        handleOptimalSliderChange(rec.type === 'PER' ? 'PER' : 'travaux', newValue);
                                      }}
                                      className="w-full h-2 bg-transparent rounded-lg appearance-none cursor-pointer"
                                    />
                                  </div>
                                </div>
                                <div className="w-12 text-xs text-right text-green-600">{formatCurrency(rec.optimal || 0)}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    {/* Détail des recommandations */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {recommendations.map((rec, index) => (
                        <div key={rec.type} className="bg-white/70 rounded-lg p-3 border border-purple-100">
                          <div className="flex items-start gap-3">
                            <div className="text-xl">{rec.icon}</div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-800 text-sm">{rec.title}</h4>
                              <p className="text-xs text-gray-600 mt-1">{rec.description}</p>

                              {/* Calculs détaillés pour PER */}
                              {rec.type === 'PER' && rec.details && (
                                <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                                  <div className="font-semibold text-blue-700 mb-1">💡 Calcul détaillé PER :</div>
                                  <div className="space-y-1 text-gray-600">
                                    <div>• Tranche marginale : {rec.details?.trancheMarginale || 0}%</div>
                                    <div>• PER année en cours : {formatCurrency(rec.details?.perOptimal || 0)}</div>
                                    <div>• Reports années précédentes : {rec.details?.reportsAnnesPrecedentes || 0} années</div>
                                    <div className="bg-blue-100 p-1 rounded">
                                      <div className="text-blue-700 font-medium">💰 PER maximum avec reports : {formatCurrency(rec.details?.perMax || 0)}</div>
                                    </div>
                                    <div>• Plafond maximum (10% de 8 PASS) : {formatCurrency(rec.details?.plafondMax || 0)}</div>
                                    <div>• Plafond minimum (10% PASS) : {formatCurrency(rec.details?.plafondMin || 0)}</div>
                                    <div>• Économie d'impôt : {formatCurrency(rec.details?.economieSupplementaire || 0)}</div>
                                    <div className="text-blue-600 text-xs">💡 L'économie est limitée au plafond légal avec reports</div>
                                    {(rec.details?.investissementSupplementaire || 0) > 0 && (
                                      <div className="text-gray-700 font-semibold">
                                        → Si vous investissez {formatCurrency(rec.details?.investissementSupplementaire || 0)}€ de plus,
                                        vous économiserez {formatCurrency(rec.details?.economieSupplementaire || 0)}€ d'impôts
                                        {rec.details?.optimalValue > rec.details?.perMax && (
                                          <span className="text-orange-600 text-xs block mt-1">
                                            💡 Au-delà de {formatCurrency(rec.details?.perMax || 0)}, l'économie reste identique (plafond légal)
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Analyse comparative pour Travaux */}
                              {rec.type === 'travaux_scenarios' && rec.scenarios && (
                                <div className="mt-2 p-2 bg-emerald-50 rounded text-xs">
                                  <div className="font-semibold text-emerald-700 mb-1">💡 Analyse comparative Travaux :</div>
                                  <div className="space-y-2">
                                    {rec.scenarios.map((scenario: any, index: number) => (
                                      <div key={index} className="bg-white/70 rounded p-2 border border-green-200">
                                        <div className="font-semibold text-green-700 text-xs mb-1">{scenario.label}</div>
                                        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                                          <div>
                                            <div className="text-gray-500">Travaux :</div>
                                            <div className="font-semibold">{formatCurrency(scenario.travaux)}</div>
                                          </div>
                                          <div>
                                            <div className="text-gray-500">Économie :</div>
                                            <div className="font-semibold text-green-600">{formatCurrency(scenario.economie)}</div>
                                          </div>
                                          <div>
                                            <div className="text-gray-500">Revenus après :</div>
                                            <div className="font-semibold">{formatCurrency(scenario.revenusApres)}</div>
                                          </div>
                                          <div>
                                            <div className="text-gray-500">Ratio :</div>
                                            <div className="font-semibold text-purple-600">{(scenario.ratio || 0).toFixed(1)}:1</div>
                                          </div>
                                        </div>
                                        <div className="text-xs text-blue-600 bg-blue-50 p-1 rounded">
                                          <div>📊 Assiette totale : {formatCurrency(scenario.assietteSansTravaux)} → {formatCurrency(scenario.assietteAvecTravaux)}</div>
                                          <div>💰 IR : {formatCurrency(scenario.irSansTravaux)} → {formatCurrency(scenario.irAvecTravaux)}</div>
                                          <div>📋 PS : {formatCurrency(scenario.psSansTravaux)} → {formatCurrency(scenario.psAvecTravaux)}</div>
                                          <div className="mt-1 pt-1 border-t border-blue-200">
                                            <div className="text-gray-700">
                                              <strong>💡 Si vous investissez {formatCurrency(scenario.travaux - (rec.current || 0))}€ de plus,</strong><br/>
                                              <span className="text-gray-700">vous économiserez {formatCurrency(scenario.economie)}€ d'impôts</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                                <div className="text-center">
                                  <div className="text-gray-500">Actuel</div>
                                  <div className="font-semibold text-gray-700">{formatCurrency(rec.current || 0)}</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-gray-500">Optimal</div>
                                  <div className="font-semibold text-green-600">{formatCurrency(rec.optimal || rec.scenarios?.[0]?.travaux || 0)}</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-gray-500">Gain supplémentaire</div>
                                  <div className="font-semibold text-green-600">{formatCurrency(rec.potential || rec.scenarios?.[0]?.economie || 0)}</div>
                                </div>
                              </div>

                              <div className="mt-2 text-center">
                                <div className="text-xs text-gray-500">Rapport coût/bénéfice</div>
                                <div className="font-bold text-purple-600">{(rec.ratio || rec.scenarios?.[0]?.ratio || 0).toFixed(1)}:1</div>
                              </div>

                              {/* Graphique investissement/gain pour PER */}
                              {rec.type === 'PER' && (rec.potential >= 0 || rec.optimal > 0) && (
                                <div className="mt-3 p-3 bg-blue-50 rounded text-xs">
                                  <div className="font-semibold text-blue-700 mb-2">📈 Investissement vs Gain fiscal</div>
                                  <div className="h-32">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <LineChart data={
                                        (() => {
                                          const data = Array.from({ length: 21 }, (_, i) => {
                                            const investissement = (i / 20) * 50000; // 0 à 50000€
                                            const gain = investissement <= 18548
                                              ? investissement * 0.3 // Taux d'économie approximatif pour PER
                                              : 18548 * 0.3;
                                            return {
                                              investissement: Math.round(investissement),
                                              gain: Math.round(gain)
                                            };
                                          });
                                          console.log('Données PER:', data);
                                          return data;
                                        })()
                                      }>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                                        <XAxis
                                          dataKey="investissement"
                                          domain={[0, 50000]}
                                          tickFormatter={(value) => `${Math.round(value / 1000)}k€`}
                                          stroke="#6b7280"
                                        />
                                        <YAxis
                                          domain={[0, 6000]}
                                          tickFormatter={(value) => `${Math.round(value / 1000)}k€`}
                                          stroke="#6b7280"
                                        />
                                        <Tooltip
                                          formatter={(value: number, name: string) => [
                                            `${formatCurrency(value)}`,
                                            name === 'gain' ? 'Gain fiscal' : name
                                          ]}
                                          labelFormatter={(value) => `Investissement: ${formatCurrency(value)}`}
                                        />
                                        <Line
                                          type="monotone"
                                          dataKey="gain"
                                          stroke="#3b82f6"
                                          strokeWidth={3}
                                          dot={false}
                                        />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </div>
                                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                                    <span>Investissement (0-50k€)</span>
                                    <span>Gain fiscal</span>
                                  </div>
                                </div>
                              )}

                              {/* Graphique investissement/gain pour Travaux */}
                              {rec.type === 'travaux_scenarios' && (rec.potential >= 0 || (rec.scenarios && rec.scenarios.length > 0)) && (
                                <div className="mt-3 p-3 bg-emerald-50 rounded text-xs">
                                  <div className="font-semibold text-emerald-700 mb-2">📈 Investissement vs Gain fiscal</div>
                                  <div className="h-32">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <LineChart data={
                                        (() => {
                                          const data = Array.from({ length: 21 }, (_, i) => {
                                            const investissement = (i / 20) * 40000; // 0 à 40000€
                                            // Calcul simplifié du gain basé sur les scénarios
                                            let gain = 0;
                                            if (investissement <= 10700) {
                                              gain = investissement * 0.3; // Taux d'économie approximatif
                                            } else if (investissement <= 20000) {
                                              gain = 10700 * 0.3 + (investissement - 10700) * 0.2;
                                            } else {
                                              gain = 10700 * 0.3 + 9300 * 0.2 + (investissement - 20000) * 0.1;
                                            }
                                            return {
                                              investissement: Math.round(investissement),
                                              gain: Math.round(Math.min(gain, 6000))
                                            };
                                          });
                                          console.log('Données Travaux:', data);
                                          return data;
                                        })()
                                      }>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#dcfce7" />
                                        <XAxis
                                          dataKey="investissement"
                                          domain={[0, 40000]}
                                          tickFormatter={(value) => `${Math.round(value / 1000)}k€`}
                                          stroke="#6b7280"
                                        />
                                        <YAxis
                                          domain={[0, 6000]}
                                          tickFormatter={(value) => `${Math.round(value / 1000)}k€`}
                                          stroke="#6b7280"
                                        />
                                        <Tooltip
                                          formatter={(value: number, name: string) => [
                                            `${formatCurrency(value)}`,
                                            name === 'gain' ? 'Gain fiscal' : name
                                          ]}
                                          labelFormatter={(value) => `Investissement: ${formatCurrency(value)}`}
                                        />
                                        <Line
                                          type="monotone"
                                          dataKey="gain"
                                          stroke="#059669"
                                          strokeWidth={3}
                                          dot={false}
                                        />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </div>
                                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                                    <span>Investissement (0-40k€)</span>
                                    <span>Gain fiscal</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      </div>
                    </div>

                    {/* Conclusion */}
                    <div className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-lg p-3 border border-blue-200">
                      <div className="text-center">
                        <h4 className="font-semibold text-slate-700 mb-2">🎯 Stratégie recommandée</h4>
                        <p className="text-sm text-gray-600">
                          {(() => {
                            const investissementPER = recommendations.find(rec => rec.type === 'PER')?.optimal || 0;
                            const investissementTravaux = recommendations.find(rec => rec.type === 'travaux_scenarios')?.scenarios?.[0]?.travaux || 0;
                            const investissementTotal = investissementPER + investissementTravaux;

                            const economiePER = recommendations.find(rec => rec.type === 'PER')?.potential || 0;
                            const economieTravaux = recommendations.find(rec => rec.type === 'travaux_scenarios')?.scenarios?.[0]?.economie || 0;
                            const economieTotale = economiePER + economieTravaux;

                            if (economieTotale > 0) {
                              return `Optimisez avec ${formatCurrency(investissementTotal)} d'investissement pour ${formatCurrency(economieTotale)} d'économie fiscale (${(economieTotale/investissementTotal).toFixed(1)}:1).`;
                            }
                            return "Maintenez votre stratégie actuelle - elle est déjà optimisée.";
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Ligne 8 : États de chargement et d'erreur */}
          {isLoading && (
            <div className="col-span-4 bg-white rounded-lg p-8 border">
              <div className="text-center text-gray-500">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-lg font-semibold">Calcul en cours...</p>
              </div>
            </div>
          )}

          {!results && !isLoading && !inputData && (
            <div className="col-span-4 bg-white rounded-lg p-8 border border-dashed border-gray-300">
              <div className="text-center text-gray-500">
                <div className="text-4xl mb-4">📊</div>
                <p className="text-lg font-semibold mb-2">Formulaire de simulation</p>
                <p className="text-sm">
                  Utilisez le formulaire pour saisir vos données et voir les résultats apparaître
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
