'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/formatters';
import TaxSimulationForm from './components/TaxSimulationForm';
import { TaxSimulationInput, TaxCalculationResult } from '@/types/tax-simulation';

export default function TaxSimulationPage() {
  const [inputData, setInputData] = useState<TaxSimulationInput | null>(null);
  const [results, setResults] = useState<TaxCalculationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTaxCalculationModal, setShowTaxCalculationModal] = useState(false);
  const [showDecoteModal, setShowDecoteModal] = useState(false);

  // Gestionnaire de formulaire
  const handleFormSubmit = async (data: TaxSimulationInput) => {
    setIsLoading(true);
    setError(null);
    setInputData(data);

    try {
      const response = await fetch('/api/tax/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Erreur serveur: ${response.status}`);
      }

      const results = await response.json();
      setResults(results);
    } catch (error) {
      console.error('Erreur lors du calcul:', error);
      setError(error instanceof Error ? error.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  // Gestionnaire d'export PDF
  const handleExportPDF = async () => {
    if (!results || !inputData) return;

    try {
      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputData, results }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'export PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'simulation-fiscale.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erreur export PDF:', error);
      setError('Erreur lors de l\'export PDF');
    }
  };

  // Gestionnaire de nouvelle simulation
  const handleNewSimulation = () => {
    setInputData(null);
    setResults(null);
    setError(null);
    setShowTaxCalculationModal(false);
    setShowDecoteModal(false);
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
                className="px-6 py-3 text-sm bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 rounded-lg transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105 border-2 border-green-500/20"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l4-4m-4 4l-4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex flex-col items-start">
                  <span className="font-semibold">Dossier Fiscal Complet</span>
                  <span className="text-xs opacity-90">Export professionnel</span>
                </div>
              </button>
              <button
                onClick={handleNewSimulation}
                className="px-4 py-2 text-sm bg-white text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                Nouvelle simulation
              </button>
            </div>
          </div>

          {/* Ligne 2-5 : Formulaire de saisie (colonnes 1-2) */}
          <div className="col-span-2 row-span-4 bg-white rounded-lg p-4 border">
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

          {/* Ligne 2, Colonne 3 : Salaire */}
          {results && (
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <h4 className="text-sm font-semibold mb-2 text-blue-700">💼 Salaire</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Brut:</span>
                  <span className="font-semibold text-slate-700">{formatCurrency(results.salaire_brut_annuel)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Abattement 10%:</span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(results.salaire_brut_annuel * 0.1)}</span>
                </div>
                {inputData?.versement_PER_deductible !== undefined && inputData.versement_PER_deductible > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">PER déductible:</span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(inputData.versement_PER_deductible)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-blue-100 text-xs">
                  <span className="text-gray-600 font-semibold">Base imposable:</span>
                  <span className="font-bold text-blue-700">{formatCurrency(results.salaire_imposable)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Ligne 2, Colonne 4 : Fonciers */}
          {results && (
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <h4 className="text-sm font-semibold mb-2 text-blue-700">🏠 Fonciers</h4>
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
                  <span className="text-slate-600">Frais gestion:</span>
                  <span className="font-semibold text-orange-600">{formatCurrency(results.frais_gestion)}</span>
                </div>
                {results.travaux_deja_effectues !== undefined && results.travaux_deja_effectues > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Travaux actuels:</span>
                    <span className="font-semibold text-orange-600">{formatCurrency(results.travaux_deja_effectues)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-blue-100 text-xs">
                  <span className="text-gray-600 font-semibold">Base imposable:</span>
                  <span className="font-bold text-blue-700">{formatCurrency(Math.max(results.revenu_foncier_net, 0))}</span>
                </div>
              </div>
            </div>
          )}

          {/* Ligne 3, Colonne 3 : Impacts fiscaux */}
          {results && (
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <h3 className="text-sm font-semibold mb-2 text-blue-700">💰 Impacts fiscaux</h3>
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
                      <span className="text-gray-600">Impôt simulé si seul:</span>
                      <span className="font-semibold text-orange-600">{formatCurrency(results.IR_brut_sans_foncier)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-blue-50">
                      <span className="text-gray-600 font-medium">Total salaire:</span>
                      <span className="font-bold text-blue-700">{formatCurrency(results.IR_brut_sans_foncier)}</span>
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
                      <span className="text-gray-600">Impôt simulé si seul:</span>
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

          {/* Ligne 3, Colonne 4 : Résumé */}
          {results && (
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-blue-700">📊 Résumé</h3>
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
                            <span>Base imposable:</span>
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
                          {/* Application de la décote fiscale */}
                          {results.decote_avec_foncier > 0 && (
                            <>
                              <div className="border-t pt-3 mt-3">
                                <div className="flex justify-between items-center p-2 bg-blue-50 rounded border border-blue-200 mb-2">
                                  <div>
                                    <div className="font-medium text-blue-700">Décote fiscale appliquée:</div>
                                    <div className="text-xs text-blue-600">Réduction automatique selon barème 2025</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold text-green-600">-{formatCurrency(results.decote_avec_foncier)}</div>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
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
                            <span>Base imposable:</span>
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

                      {/* Calcul de la décote fiscale */}
                      {results.decote_avec_foncier > 0 && (
                        <div className="bg-white rounded-lg p-4 border border-slate-200">
                          <h4 className="font-semibold text-slate-700 mb-3">💰 Calcul de la décote fiscale</h4>
                          <div className="space-y-3 text-sm">
                            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <h5 className="font-semibold text-green-700 mb-2">📊 Paramètres applicables</h5>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span>Situation familiale:</span>
                                      <span className="font-semibold">{inputData?.situation_familiale === 'celibataire' ? 'Célibataire' : 'Couple'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Seuil applicable:</span>
                                      <span className="font-semibold">{formatCurrency(results.tax_params?.seuilCelibataire || results.tax_params?.seuilCouple || 1964)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Forfait décote:</span>
                                      <span className="font-semibold">{formatCurrency(results.tax_params?.forfaitCelibataire || results.tax_params?.forfaitCouple || 889)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Taux décote:</span>
                                      <span className="font-semibold">{((results.tax_params?.taux || 0.4525) * 100).toFixed(2)}%</span>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <h5 className="font-semibold text-green-700 mb-2">🔍 Calcul détaillé</h5>
                                  <div className="space-y-2 text-sm">
                                    <div className="bg-white rounded p-2 border">
                                      <div className="font-medium text-green-600 mb-1">Formule fiscale:</div>
                                      <div className="text-gray-700">
                                        Décote = Forfait - (IR brut × Taux)
                                      </div>
                                    </div>
                                    <div className="bg-white rounded p-2 border">
                                      <div className="font-medium text-green-600 mb-1">Application:</div>
                                      <div className="text-gray-700">
                                        {formatCurrency(results.tax_params?.forfaitCelibataire || results.tax_params?.forfaitCouple || 889)} - ({formatCurrency(results.IR_brut_avec_foncier)} × {((results.tax_params?.taux || 0.4525) * 100).toFixed(2)}%) = {formatCurrency(results.decote_avec_foncier)}
                                      </div>
                                    </div>
                                    <div className="bg-green-100 rounded p-2 border border-green-300">
                                      <div className="font-medium text-green-700 mb-1">💰 Économie réalisée:</div>
                                      <div className="text-green-800 font-semibold">
                                        -{formatCurrency(results.decote_avec_foncier)} (réduction d&apos;impôt)
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between pt-1 border-t border-slate-100 text-xs">
                  <span className="text-slate-600 font-medium">Impôt brut global:</span>
                  <span className="font-bold text-blue-700">{formatCurrency(results.IR_brut_avec_foncier)}</span>
                </div>
                {results.decote_avec_foncier > 0 && (
                  <div className="flex justify-between pt-1 border-t border-slate-100 text-xs">
                    <span className="text-slate-600 font-medium">Décote fiscale:</span>
                    <span className="font-bold text-green-600">-{formatCurrency(results.decote_avec_foncier)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-slate-100 text-xs">
                  <span className="text-slate-600 font-medium">Impôt net sur le revenu:</span>
                  <span className="font-bold text-blue-700">{formatCurrency(results.IR_avec_foncier)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-100 text-xs">
                  <span className="text-gray-600">PS (17,2%):</span>
                  <span className="font-semibold text-orange-600">{formatCurrency(results.PS_foncier)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Taux effectif:</span>
                  <span className="font-semibold text-orange-600">{((results.total_avec_foncier / (results.salaire_imposable + Math.max(results.revenu_foncier_net, 0))) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between pt-2 mt-2 border-t-2 border-blue-200 bg-blue-50 rounded p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🎯</span>
                    <span className="text-slate-700 font-bold text-sm">Total impôts à payer:</span>
                  </div>
                  <span className="text-xl font-bold text-blue-700">{formatCurrency(results.total_avec_foncier)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Modal décote fiscale */}
          <Dialog open={showDecoteModal} onOpenChange={setShowDecoteModal}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Détail des calculs de décote fiscale</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <h4 className="font-semibold text-slate-700 mb-3">📋 Qu&apos;est-ce que la décote fiscale ?</h4>
                  <div className="space-y-3 text-sm">
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <p className="text-blue-700 mb-2">
                        💡 <strong>La décote s&apos;applique automatiquement</strong> sur vos revenus imposables totaux
                        (salaire + revenus fonciers) selon les paramètres fiscaux actifs.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <div className="font-medium text-blue-600 mb-1">Paramètres actuels :</div>
                          <div className="text-gray-600 space-y-1">
                            <div>• Seuil célibataire : {formatCurrency(results?.tax_params?.seuilCelibataire || 1000)}€</div>
                            <div>• Seuil couple : {formatCurrency(results?.tax_params?.seuilCouple || 1000)}€</div>
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-blue-600 mb-1">Application :</div>
                          <div className="text-gray-600 space-y-1">
                            <div>• Décote = Forfait - (Revenus × Taux)</div>
                            <div>• Max : {formatCurrency(results?.tax_params?.forfaitCelibataire || 1000)}€</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded p-3 border border-green-100">
                      <h5 className="font-semibold text-green-700 mb-2 text-sm">📊 Décote appliquée dans votre simulation :</h5>
                      <div className="space-y-3 text-sm">
                        {(() => {
                          const assietteTotale = (results?.salaire_imposable || 0) + Math.max(results?.revenu_foncier_net || 0, 0);
                          const impotBrut = results?.IR_brut_avec_foncier || 0;
                          const forfait = results?.tax_params?.forfaitCelibataire || 889;
                          const seuil = results?.tax_params?.seuilCelibataire || 1964;

                          // Debug logs
                          console.log('=== DEBUG INTERFACE DÉCOTE ===');
                          console.log('results reçu:', results);
                          console.log('salaire_imposable:', results?.salaire_imposable);
                          console.log('revenu_foncier_net:', results?.revenu_foncier_net);
                          console.log('assietteTotale calculée:', assietteTotale);
                          console.log('IR_brut_avec_foncier:', results?.IR_brut_avec_foncier);
                          console.log('decote_avec_foncier:', results?.decote_avec_foncier);
                          console.log('tax_params:', results?.tax_params);

                          // Utiliser directement les valeurs calculées par l'API (qui sont correctes)
                          const decoteReelle = results?.decote_avec_foncier || 0;

                          // Vérifier si la décote s'applique selon la logique fiscale
                          const decoteApplicable = impotBrut < seuil;

                          return (
                            <div className="space-y-2">
                              <div className="text-gray-700">
                                <strong>Assiette totale :</strong> {formatCurrency(assietteTotale)}<br/>
                                <strong>Seuil décote :</strong> {formatCurrency(seuil)}<br/>
                                <strong>Impôt brut :</strong> {formatCurrency(impotBrut)}<br/>
                                <strong>Forfait décote :</strong> {formatCurrency(forfait)}<br/>
                                <strong>Décote applicable :</strong> {decoteApplicable ? 'OUI' : 'NON'}<br/>
                                <strong>Décote appliquée :</strong> {formatCurrency(decoteReelle)}
                              </div>
                            </div>
                          );
                        })()}

                        <div className="flex justify-between items-center pt-2 border-t border-green-100">
                          <span className="text-gray-600 font-medium">Décote totale économisée :</span>
                          <span className="font-bold text-green-700">-{formatCurrency(results?.decote_avec_foncier || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Ligne 4, Colonne 3 : Optimisation fiscale */}
          {results && (
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <h4 className="text-sm font-semibold mb-2 text-blue-700">🔧 Optimisation Fiscale</h4>
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
              <h4 className="text-sm font-semibold mb-2 text-slate-700">📈 PER</h4>
              <div className="space-y-2">
                <div className="bg-white/70 rounded p-2 border border-purple-100">
                  <p className="text-xs text-gray-600 mb-1">
                    {results.salaire_imposable > 75000 ? "Tranche élevée" : "Continuez"}
                  </p>
                  <div className="bg-purple-100 rounded p-1">
                    {inputData?.versement_PER_deductible && inputData.versement_PER_deductible > 0 ? (
                      <>
                        <p className="text-xs text-purple-700 font-medium">💰 Économie: {formatCurrency(inputData.versement_PER_deductible * 0.3)}</p>
                        <p className="text-xs text-purple-600 mt-1">
                          📈 Versement PER: {formatCurrency(inputData.versement_PER_deductible)} (30% déductible)
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-purple-700 font-medium">💰 Économie: Aucun versement PER</p>
                    )}
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
                  <span className="text-2xl">😊</span>
                  <span className="text-lg font-semibold text-slate-700">Bénéfice net immobilier</span>
                </div>
                <div className="text-3xl font-bold">
                  <Badge className="bg-green-100 text-green-800 text-lg px-3 py-1">
                    {formatCurrency(results.benefice_net)}
                  </Badge>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-emerald-50 rounded p-2">
                    <div className="text-xs text-emerald-600 mb-1">Cash-flow brut</div>
                    <div className="text-sm font-semibold text-emerald-700">
                      {formatCurrency(results.benefice_brut)}
                    </div>
                  </div>
                  <div className="bg-emerald-50 rounded p-2">
                    <div className="text-xs text-emerald-600 mb-1">Cash-flow net</div>
                    <div className="text-sm font-semibold text-emerald-700">
                      {formatCurrency(results.benefice_net)}
                    </div>
                  </div>
                  <div className="bg-emerald-50 rounded p-2">
                    <div className="text-xs text-emerald-600 mb-1">Rendement brut</div>
                    <div className="text-sm font-semibold text-emerald-700">
                      {results.autofill_from_db && results.loyers_percus_total > 0 ? `${((results.loyers_percus_total / 200000) * 100).toFixed(1)}%` : 'N/C'}
                    </div>
                  </div>
                  <div className="bg-emerald-50 rounded p-2">
                    <div className="text-xs text-emerald-600 mb-1">Rendement net</div>
                    <div className="text-sm font-semibold text-emerald-700">
                      {results.autofill_from_db && results.loyers_percus_total > 0 ? `${((results.benefice_net / 200000) * 100).toFixed(1)}%` : 'N/C'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* États de chargement et d'erreur */}
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
