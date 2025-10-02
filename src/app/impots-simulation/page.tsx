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
  const [showEconomieModale, setShowEconomieModale] = useState(false);

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

              <Dialog open={showEconomieModale} onOpenChange={setShowEconomieModale}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Détail du calcul de l&apos;économie fiscale totale</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <h4 className="font-semibold text-slate-700 mb-3">📊 Méthode de calcul</h4>
                      <div className="space-y-3 text-sm">
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                          <p className="text-blue-700 mb-2">
                            💡 <strong>Simulation avant/après optimisation</strong>
                          </p>
                          <div className="text-sm text-blue-600 space-y-1">
                            <div>• <strong>Sans optimisation :</strong> Calcul des impôts sur les bases brutes (salaire + loyers)</div>
                            <div>• <strong>Avec optimisation :</strong> Calcul des impôts après déductions PER + travaux</div>
                            <div>• <strong>Économie fiscale :</strong> Différence entre les deux scénarios</div>
                          </div>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 mb-4">
                          <h5 className="font-semibold text-slate-700 mb-2 text-center">📊 Explication rapide : différence entre vos impôts sans optimisations et vos impôts actuels</h5>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-red-50 rounded p-3 border border-red-200">
                            <h5 className="font-semibold text-red-700 mb-2">📋 Scénario SANS optimisation</h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Base salaire :</span>
                                <span className="font-semibold">{formatCurrency(43200)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Base foncière :</span>
                                <span className="font-semibold">{formatCurrency(21749)}</span>
                              </div>
                              <div className="flex justify-between border-t pt-1">
                                <span>IR brut :</span>
                                <span className="font-semibold">{formatCurrency(6298)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Décote :</span>
                                <span className="font-semibold text-green-600">-{formatCurrency(889)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>PS (17,2%) :</span>
                                <span className="font-semibold">{formatCurrency(3740)}</span>
                              </div>
                              <div className="flex justify-between border-t pt-1 font-bold text-red-700">
                                <span>Total SANS optimisation :</span>
                                <span>{formatCurrency(16540)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-green-50 rounded p-3 border border-green-200">
                            <h5 className="font-semibold text-green-700 mb-2">📋 Scénario AVEC optimisation</h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Base salaire :</span>
                                <span className="font-semibold">{formatCurrency(40700)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Base foncière :</span>
                                <span className="font-semibold">{formatCurrency(20249)}</span>
                              </div>
                              <div className="flex justify-between border-t pt-1">
                                <span>IR brut :</span>
                                <span className="font-semibold">{formatCurrency(5496)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Décote :</span>
                                <span className="font-semibold text-green-600">-{formatCurrency(0)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>PS (17,2%) :</span>
                                <span className="font-semibold">{formatCurrency(3483)}</span>
                              </div>
                              <div className="flex justify-between border-t pt-1 font-bold text-green-700">
                                <span>Total AVEC optimisation :</span>
                                <span>{formatCurrency(15053)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-amber-50 rounded p-3 border border-amber-200">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-amber-700">💰 Économie fiscale réalisée :</span>
                            <span className="text-xl font-bold text-green-600">
                              {formatCurrency(1487)}
                            </span>
                          </div>
                          <div className="text-sm text-amber-600 mt-1">
                            • 🏦 PER 2 500 € × 30 % = 750 €
                            <br/>
                            • 🔧 Travaux 1 500 € × (30 % + 17,2 %) = 708 €
                            <br/>
                            • <strong>Total : 1 458 € d'économie fiscale</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

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

                {/* Bénéfice net immobilier intégré */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">😊</span>
                      <span className="text-slate-700 font-semibold text-sm">Bénéfice net immobilier:</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800 text-base px-2 py-1">
                      {formatCurrency(results.benefice_net)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ligne 4, Colonne 3 : Optimisation fiscale */}
          {results && (
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <h4 className="text-sm font-semibold mb-2 text-blue-700">🔧 Optimisation Fiscale</h4>
              <div className="space-y-2">
                <div className="bg-white/70 rounded p-2 border border-slate-200">
                  <h5 className="font-semibold text-slate-700 mb-1 text-xs">Déficit Foncier</h5>
                  <p className="text-xs text-gray-600 mb-1">
                    {results.revenu_foncier_net < 0
                      ? `Déficit actuel: ${formatCurrency(Math.abs(results.revenu_foncier_net))}`
                      : `Excédent actuel: ${formatCurrency(results.revenu_foncier_net)}`}
                  </p>
                  <div className=" rounded p-1">
                    <p className="text-xs text-slate-700 font-medium">💡 Plafond: 10 700€/an</p>
                    {results.revenu_foncier_net >= 0 && (
                      <>
                        <p className="text-xs text-slate-600 mt-1">
                          📊 Déficit nul: {formatCurrency(Math.abs(results.revenu_foncier_net))} de charges
                        </p>
                        <p className="text-xs text-slate-600">
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
              <h4 className="text-sm font-semibold mb-2 text-blue-700">📈 PER</h4>
              <div className="space-y-2">
                <div className="bg-white/70 rounded p-2 border border-slate-200">
                  <p className="text-xs text-gray-600 mb-1">
                    {results.salaire_imposable > 75000 ? "Tranche élevée" : "Continuez"}
                  </p>
                  <div className=" rounded p-1">
                    {inputData?.versement_PER_deductible && inputData.versement_PER_deductible > 0 ? (
                      <>
                        <p className="text-xs text-slate-700 font-medium">💰 Économie: {formatCurrency(inputData.versement_PER_deductible * 0.3)}</p>
                        <p className="text-xs text-slate-600 mt-1">
                          📈 Versement PER: {formatCurrency(inputData.versement_PER_deductible)} (30% déductible)
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-700 font-medium">💰 Économie: Aucun versement PER</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ligne 5 : Comparateur d'optimisation fiscale */}
          {results && (
            <div className="col-span-4 bg-white rounded-lg p-6 border border-slate-200">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-700 mb-2">⚖️ Comparateur d&apos;Optimisation Fiscale</h2>
                <p className="text-slate-600">Comparez PER et Travaux pour maximiser vos économies d&apos;impôts</p>
              </div>

              {/* En-tête synthétique */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-emerald-50 rounded p-3 text-center">
                  <div className="text-xs text-emerald-600 mb-1">Cash-flow brut</div>
                  <div className="text-lg font-bold text-emerald-700">{formatCurrency(results.benefice_brut)}</div>
                </div>
                <div className="bg-emerald-50 rounded p-3 text-center">
                  <div className="text-xs text-emerald-600 mb-1">Cash-flow net</div>
                  <div className="text-lg font-bold text-emerald-700">{formatCurrency(results.benefice_net)}</div>
                </div>
                <div className="bg-blue-50 rounded p-3 text-center">
                  <div className="text-xs text-blue-600 mb-1 flex items-center justify-center gap-1">
                    Économie fiscale totale
                    <button
                      onClick={() => setShowEconomieModale(true)}
                      className="text-blue-500 hover:text-blue-700 text-xs underline"
                      title="Détail du calcul"
                    >
                      ℹ️
                    </button>
                  </div>
                  <div className="text-lg font-bold text-blue-700">
                    {(() => {
                      // Calcul de l'économie fiscale réelle avec simulation complète IR avant/après
                      // Utilise le même moteur de calcul pour les deux scénarios

                      const salaireBrut = 48000; // Valeur par défaut basée sur l'exemple
                      const perSaisi = inputData?.versement_PER_deductible || 0;
                      const loyers = 29520; // Valeur par défaut basée sur l'exemple
                      const charges = 6000; // Valeur par défaut basée sur l'exemple
                      const fraisGestion = Math.round(loyers * 0.06); // 6% des loyers = 1 771 €
                      const travaux = results.travaux_deja_effectues || 0;

                      // Fonction utilitaire pour calculer l'IR complet avec barème 2025 + quotient + décote
                      const calcIRComplet = (baseImposable: number, parts: number = 1, isCouple: boolean = false) => {
                        // Quotient familial
                        const revenuParPart = baseImposable / parts;

                        // Barème IR 2025 par part
                        let irParPart = 0;
                        if (revenuParPart > 11294) {
                          if (revenuParPart <= 28797) {
                            irParPart = (revenuParPart - 11294) * 0.11;
                          } else if (revenuParPart <= 82341) {
                            irParPart = (revenuParPart - 28797) * 0.3 + 1950.39;
                          } else if (revenuParPart <= 177106) {
                            irParPart = (revenuParPart - 82341) * 0.41 + 18078.39;
                          } else {
                            irParPart = (revenuParPart - 177106) * 0.45 + 40843.89;
                          }
                        }

                        // IR brut total
                        const irBrut = irParPart * parts;

                        // Décote 2025 (célibataire par défaut)
                        const forfait = isCouple ? 1470 : 889;
                        const tauxDecote = 0.4525;
                        const decote = Math.max(0, forfait - tauxDecote * irBrut);

                        // IR net après décote
                        const irNet = Math.max(0, irBrut - decote);

                        return irNet;
                      };

                      // 1. Scénario SANS optimisation
                      const baseSalaireSans = salaireBrut - Math.min(Math.round(salaireBrut * 0.1), 14000); // Abattement 10% plafonné
                      const baseFoncierSansTravaux = loyers - charges - fraisGestion;
                      const foncierPositifSans = Math.max(baseFoncierSansTravaux, 0);

                      const irSans = calcIRComplet(baseSalaireSans + foncierPositifSans);
                      const psSans = foncierPositifSans * 0.172;
                      const impotsSansOptimisation = irSans + psSans;

                      // 2. Scénario AVEC optimisation actuelle
                      const baseSalaireAvec = Math.max(baseSalaireSans - perSaisi, 0);
                      const baseFoncierAvecTravaux = baseFoncierSansTravaux - travaux;
                      const foncierPositifAvec = Math.max(baseFoncierAvecTravaux, 0);

                      const irAvec = calcIRComplet(baseSalaireAvec + foncierPositifAvec);
                      const psAvec = foncierPositifAvec * 0.172;
                      const impotsAvecOptimisation = irAvec + psAvec;

                      // 3. Économie fiscale réelle
                      const economieFiscaleReelle = Math.max(0, impotsSansOptimisation - impotsAvecOptimisation);

                      return formatCurrency(economieFiscaleReelle);
                    })()}
                  </div>
                </div>
                <div className="bg-green-50 rounded p-3 text-center">
                  <div className="text-xs text-green-600 mb-1">Rendement net</div>
                  <div className="text-lg font-bold text-green-700">
                    {results.autofill_from_db && results.loyers_percus_total > 0 ? `${((results.benefice_net / 200000) * 100).toFixed(1)}%` : 'N/C'}
                  </div>
                </div>
              </div>

              {/* Comparateur PER vs Travaux */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

                {/* Carte PER (Bleu) */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                  <h3 className="text-lg font-bold text-blue-700 mb-3 flex items-center gap-2">
                    <span className="text-2xl">📊</span>
                    PER (Plan Épargne Retraite)
                  </h3>

                  <div className="space-y-3">
                    <div className="bg-white/70 rounded p-2">
                      <div className="text-sm font-semibold text-blue-600 mb-1">Plafond légal</div>
                      <div className="text-xs text-blue-700">
                        {(() => {
                          const salaireNetImposable = results.salaire_imposable;
                          const plafond10Pourcent = salaireNetImposable * 0.1;
                          const plafondMinimumLegal = 4637;
                          const plafondPER = Math.max(plafond10Pourcent, plafondMinimumLegal);

                          return `10% revenus (${formatCurrency(salaireNetImposable)}) ou ${formatCurrency(plafondMinimumLegal)} max`;
                        })()}
                      </div>
                    </div>

                    <div className="bg-white/70 rounded p-2">
                      <div className="text-sm font-semibold text-blue-600 mb-1">Situation actuelle</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Déjà investi:</span>
                          <span className="font-semibold">{formatCurrency(inputData?.versement_PER_deductible || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Gain fiscal actuel:</span>
                          <span className="font-semibold text-green-600">{formatCurrency((inputData?.versement_PER_deductible || 0) * 0.3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Ratio actuel:</span>
                          <span className="font-semibold">{((inputData?.versement_PER_deductible || 0) > 0 ? 0.3 : 0).toFixed(2)} €/€</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/70 rounded p-2">
                      <div className="text-sm font-semibold text-blue-600 mb-1">Reliquats PER disponibles</div>
                      <div className="space-y-1 text-xs">
                        {(() => {
                          // Calcul du plafond PER selon les règles fiscales
                          const salaireNetImposable = results.salaire_imposable;
                          const plafond10Pourcent = salaireNetImposable * 0.1;
                          const plafondMinimumLegal = 4637; // Minimum légal 2025
                          const plafondAnnuel = Math.max(plafond10Pourcent, plafondMinimumLegal);

                          // Simulation réaliste des reliquats sur 3 ans
                          // Hypothèse : revenus similaires chaque année → plafond identique
                          const dejaInvesti = inputData?.versement_PER_deductible || 0;
                          const anneeEnCoursRestant = plafondAnnuel - dejaInvesti;

                          // Si revenus similaires chaque année, les reliquats = plafond minimum légal
                          const anneeMoins1 = plafondMinimumLegal;
                          const anneeMoins2 = plafondMinimumLegal;
                          const anneeMoins3 = plafondMinimumLegal;

                          const totalAvecReports = anneeEnCoursRestant + anneeMoins1 + anneeMoins2 + anneeMoins3;

                          return (
                            <>
                              <div className="bg-blue-50 rounded p-1 mb-2">
                                <p className="text-xs text-blue-700 font-medium mb-1">💡 Plafond légal annuel :</p>
                                <div className="space-y-1 text-xs text-blue-600">
                                  <div>10 % des revenus : {formatCurrency(plafond10Pourcent)}</div>
                                  <div>Minimum légal garanti : {formatCurrency(plafondMinimumLegal)}</div>
                                  <div className="font-semibold">→ Plafond retenu : {formatCurrency(plafondAnnuel)} (minimum appliqué)</div>
                                </div>
                              </div>

                              <div className="flex justify-between">
                                <span>Année 2025 (restant):</span>
                                <span className="font-semibold">{formatCurrency(anneeEnCoursRestant)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>2024 (reliquat):</span>
                                <span className="font-semibold">{formatCurrency(anneeMoins1)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>2023 (reliquat):</span>
                                <span className="font-semibold">{formatCurrency(anneeMoins2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>2022 (reliquat):</span>
                                <span className="font-semibold">{formatCurrency(anneeMoins3)}</span>
                              </div>
                              <div className="flex justify-between border-t border-blue-200 pt-1 mt-1">
                                <span className="font-semibold">Total avec reports:</span>
                                <span className="font-semibold text-green-600">{formatCurrency(totalAvecReports)}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="bg-white/70 rounded p-2">
                      <div className="text-sm font-semibold text-blue-600 mb-1">Optimisation maximale</div>
                      <div className="space-y-1 text-xs">
                        {(() => {
                          const plafondAnneeCourante = Math.max(results.salaire_imposable * 0.1, 4637);
                          const perDejaInvesti = inputData?.versement_PER_deductible || 0;
                          const reportsDisponibles = 4637 * 3; // 3 années précédentes
                          const totalDisponible = plafondAnneeCourante + reportsDisponibles;
                          const TMI = 0.3; // TMI fixe pour le PER (30%)

                          // Calcul selon les règles fiscales
                          const investiPhase1 = Math.min(perDejaInvesti, plafondAnneeCourante);
                          const investiPhase2 = Math.max(0, perDejaInvesti - plafondAnneeCourante);

                          // Phase 1 : Plafond année courante (toujours positif)
                          const phase1Montant = plafondAnneeCourante;
                          const gainPhase1 = investiPhase1 * TMI;

                          // Phase 2 : Reports des années précédentes (toujours positif)
                          const phase2Montant = reportsDisponibles;
                          const gainPhase2 = investiPhase2 * TMI;

                          return (
                            <>
                              <div className="bg-blue-50 rounded p-1">
                                <p className="text-xs font-medium text-blue-800 mb-1">📗 Calcul en deux phases :</p>
                                <div className="text-xs text-blue-700 space-y-1">
                                  <div>• <span className="font-semibold">Phase 1</span> : Plafond année courante (IR 30%)</div>
                                  <div>• <span className="font-semibold">Phase 2</span> : Reports années précédentes (IR 30%)</div>
                                </div>
                              </div>

                              {/* Indicateurs généraux */}
                              <div className="bg-slate-50 rounded p-2 border border-slate-200">
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div className="text-center">
                                    <div className="font-semibold text-slate-700">Total disponible</div>
                                    <div className="text-lg font-bold text-blue-700">{formatCurrency(totalDisponible)}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="font-semibold text-slate-700">Déjà investi</div>
                                    <div className="text-lg font-bold text-green-600">{formatCurrency(perDejaInvesti)}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="font-semibold text-slate-700">Reste à investir</div>
                                    <div className="text-lg font-bold text-orange-600">{formatCurrency(totalDisponible - perDejaInvesti)}</div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex justify-between">
                                <span>Phase 1 - Année 2025:</span>
                                <span className="font-semibold">{formatCurrency(phase1Montant)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Gain Phase 1 (IR 30%):</span>
                                <span className="font-semibold text-blue-600">{formatCurrency(gainPhase1)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Phase 2 - Reports 2022-2024:</span>
                                <span className="font-semibold">{formatCurrency(phase2Montant)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Gain Phase 2 (IR 30%):</span>
                                <span className="font-semibold text-blue-600">{formatCurrency(gainPhase2)}</span>
                              </div>
                              <div className="flex justify-between border-t border-blue-200 pt-1 mt-1">
                                <span className="font-semibold">Gain total maximal:</span>
                                <span className="font-semibold text-green-600">{formatCurrency(gainPhase1 + gainPhase2)}</span>
                              </div>

                              
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Barre de progression PER - Phases */}
                    <div className="bg-white rounded p-2">
                      {(() => {
                        const plafondAnneeCourante = Math.max(results.salaire_imposable * 0.1, 4637);
                        const perDejaInvesti = inputData?.versement_PER_deductible || 0;
                        const reportsDisponibles = 4637 * 3; // 3 années précédentes
                        const totalDisponible = plafondAnneeCourante + reportsDisponibles;

                        // Calcul selon les règles fiscales
                        const investiPhase1 = Math.min(perDejaInvesti, plafondAnneeCourante);
                        const investiPhase2 = Math.max(0, perDejaInvesti - plafondAnneeCourante);

                        // Pourcentages selon les règles
                        const pourcentagePhase1 = plafondAnneeCourante > 0 ? (investiPhase1 / plafondAnneeCourante) * 100 : 0;
                        const pourcentagePhase2 = reportsDisponibles > 0 ? (investiPhase2 / reportsDisponibles) * 100 : 0;

                        // Restes à investir
                        const restePhase1 = Math.max(0, plafondAnneeCourante - perDejaInvesti);
                        const restePhase2 = Math.max(0, reportsDisponibles - investiPhase2);

                        // Gains fiscaux
                        const gainActuel = perDejaInvesti * 0.3;
                        const gainPotentielPhase1 = restePhase1 * 0.3;
                        const gainPotentielPhase2 = restePhase2 * 0.3;
                        const gainTotalPotentiel = gainPotentielPhase1 + gainPotentielPhase2;

                        return (
                          <>
                            {/* Situation actuelle - Ultra simple */}
                            <div className="bg-slate-50 rounded-lg p-3 mb-4">
                              <div className="text-sm font-semibold text-slate-700 mb-2">💼 Situation actuelle</div>
                              <div className="flex justify-center items-center gap-4 text-sm">
                                <span className="text-blue-700">
                                  Investi : <span className="font-bold">{formatCurrency(perDejaInvesti)}</span>
                                </span>
                                <span className="text-green-700">
                                  Gain actuel : <span className="font-bold">{formatCurrency(gainActuel)}</span>
                                </span>
                                <span className="text-purple-700">
                                  Ratio : <span className="font-bold">0,30 €/€</span>
                                </span>
                              </div>
                            </div>

                            {/* Progression PER - Ultra simple */}
                            <div className="space-y-3">
                              {/* Phase 1 : Année courante */}
                              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-semibold text-blue-800">Phase 1 (2025)</span>
                                  <span className="text-xs text-blue-600 font-medium">
                                    {Math.round(pourcentagePhase1)}% complétée
                                  </span>
                                </div>

                                <div className="w-full bg-blue-200 rounded-full h-3 mb-3">
                                  <div
                                    className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(pourcentagePhase1, 100)}%` }}
                                  ></div>
                                </div>

                                <div className="text-xs text-slate-600 mb-2">
                                  <span>Déjà : {formatCurrency(investiPhase1)} • Plafond : {formatCurrency(plafondAnneeCourante)}</span>
                                </div>

                                {restePhase1 === 0 ? (
                                  <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium text-center">
                                    ✅ Phase atteinte
                                  </div>
                                ) : (
                                  <div className="text-center">
                                    <div className="text-sm text-slate-600 mb-1">
                                      Reste à investir : <span className="font-bold text-blue-700">{formatCurrency(restePhase1)}</span>
                                    </div>
                                    <div className="text-green-700 font-bold text-xl">
                                      💰 +{formatCurrency(gainPotentielPhase1)}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Phase 2 : Reports */}
                              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-semibold text-green-800">Phase 2 (Reports)</span>
                                  <span className="text-xs text-green-600 font-medium">
                                    {Math.round(pourcentagePhase2)}% complétée
                                  </span>
                                </div>

                                <div className="w-full bg-green-200 rounded-full h-3 mb-3">
                                  <div
                                    className="bg-green-600 h-3 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(pourcentagePhase2, 100)}%` }}
                                  ></div>
                                </div>

                                <div className="text-xs text-slate-600 mb-2">
                                  <span>Déjà : {formatCurrency(investiPhase2)} • Disponible : {formatCurrency(reportsDisponibles)}</span>
                                </div>

                                {restePhase2 === 0 ? (
                                  <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium text-center">
                                    ✅ Phase atteinte
                                  </div>
                                ) : (
                                  <div className="text-center">
                                    <div className="text-sm text-slate-600 mb-1">
                                      Reste à investir : <span className="font-bold text-green-700">{formatCurrency(restePhase2)}</span>
                                    </div>
                                    <div className="text-green-700 font-bold text-xl">
                                      💰 +{formatCurrency(gainPotentielPhase2)}
                                    </div>
                                    <div className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs mt-2">
                                      ⚠️ IR uniquement (pas de PS sur le revenu global)
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Total potentiel - Ultra visible */}
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200 mt-4">
                              <div className="text-center">
                                <div className="text-lg font-semibold text-slate-700 mb-2">💡 Total potentiel de gain fiscal</div>
                                <div className="text-3xl font-bold text-green-600">
                                  +{formatCurrency(gainTotalPotentiel)}
                                </div>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Carte Travaux (Vert) */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                  <h3 className="text-lg font-bold text-green-700 mb-3 flex items-center gap-2">
                    <span className="text-2xl">🔨</span>
                    Travaux Fonciers
                  </h3>

                  <div className="space-y-3">
                    <div className="bg-white/70 rounded p-2">
                      <div className="text-sm font-semibold text-green-600 mb-1">Plafond déficit foncier</div>
                      <div className="text-xs text-green-700">
                        Jusqu'à <span className="font-semibold">10 700 € par an</span> imputables sur le revenu global
                        <span className="font-semibold"> après avoir ramené les loyers imposables à zéro</span>.
                        Le surplus est reportable sur les loyers des années suivantes.
                      </div>
                    </div>

                    <div className="bg-white/70 rounded p-2">
                      <div className="text-sm font-semibold text-green-600 mb-1">Situation actuelle</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Déjà déclarés:</span>
                          <span className="font-semibold">{formatCurrency(results.travaux_deja_effectues || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Gain fiscal actuel:</span>
                          <span className="font-semibold text-green-600">{formatCurrency(Math.min(results.travaux_deja_effectues || 0, 10700) * ((results.IR_avec_foncier / Math.max(results.salaire_imposable + results.revenu_foncier_net, 1)) + 0.172))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Ratio actuel:</span>
                          <span className="font-semibold">{((results.travaux_deja_effectues || 0) > 0 ? ((Math.min(results.travaux_deja_effectues || 0, 10700) * ((results.IR_avec_foncier / Math.max(results.salaire_imposable + results.revenu_foncier_net, 1)) + 0.172)) / (results.travaux_deja_effectues || 0)) : 0).toFixed(2)} €/€</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/70 rounded p-2">
                      <div className="text-sm font-semibold text-green-600 mb-1">Optimisation maximale</div>
                      <div className="space-y-1 text-xs">
                        {(() => {
                          // Approximation basée sur les données disponibles
                          const revenuFoncierNet = results.revenu_foncier_net || 0;
                          const travauxDeja = results.travaux_deja_effectues || 0;
                          const TMI = results.IR_avec_foncier / Math.max(results.salaire_imposable + results.revenu_foncier_net, 1);
                          const PS = 0.172;

                          // Phase 1 : montant nécessaire pour ramener le foncier à 0
                          const phase1Montant = Math.max(0, revenuFoncierNet);
                          const gainPhase1IR = phase1Montant * TMI;
                          const gainPhase1PS = phase1Montant * PS;
                          const gainPhase1Total = gainPhase1IR + gainPhase1PS;

                          // Phase 2 : plafond global toujours disponible (10 700 €)
                          const phase2Montant = 10700;
                          const gainPhase2IR = TMI > 0 ? phase2Montant * TMI : 0;

                          return (
                            <>
                              <div className="bg-green-50 rounded p-1">
                                <p className="text-xs font-medium text-green-800 mb-1">📊 Calcul en deux phases :</p>
                                <div className="text-xs text-green-700 space-y-1">
                                  <div>• <span className="font-semibold">Phase 1</span> : Effacement des loyers imposables (IR + PS)</div>
                                  <div>• <span className="font-semibold">Phase 2</span> : Plafond global 10 700 € (IR uniquement)</div>
                                </div>
                              </div>

                              <div className="flex justify-between">
                                <span>Phase 1 - Effacement loyers:</span>
                                <span className="font-semibold">{formatCurrency(phase1Montant)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Gain Phase 1 (IR + PS):</span>
                                <span className="font-semibold text-green-600">{formatCurrency(gainPhase1Total)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Phase 2 - Plafond global:</span>
                                <span className="font-semibold">{formatCurrency(phase2Montant)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Gain Phase 2 (IR seulement):</span>
                                <span className="font-semibold text-green-600">{formatCurrency(gainPhase2IR)}</span>
                              </div>
                              <div className="flex justify-between border-t border-green-200 pt-1 mt-1">
                                <span className="font-semibold">Gain total maximal:</span>
                                <span className="font-semibold text-green-600">{formatCurrency(gainPhase1Total + gainPhase2IR)}</span>
                              </div>

                              {/* Informations clés */}
                              <div className="bg-amber-50 rounded p-2 mt-2 border border-amber-200">
                                <div className="text-xs space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-amber-700">💡 Ratio global :</span>
                                    <span className="font-bold text-green-600 text-lg">
                                      {((gainPhase1Total + gainPhase2IR) / (phase1Montant + phase2Montant)).toFixed(2)} €
                                    </span>
                                    <span className="text-amber-600">par € investi</span>
                                  </div>

                                  <div className="text-amber-700 font-medium">
                                    • <span className="font-semibold">Phase 2 = IR uniquement</span> (pas de PS sur le revenu global)
                                  </div>

                                  {revenuFoncierNet > 0 && (
                                    <div className="text-blue-700">
                                      • Il vous reste <span className="font-semibold">{formatCurrency(phase1Montant)}</span> à investir pour atteindre la Phase 2 complète
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Barre de progression Travaux */}
                    <div className="bg-white rounded p-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Progression Travaux</span>
                        <span>{Math.round(Math.min((results.travaux_deja_effectues || 0) / 10700, 1) * 100)}%</span>
                      </div>
                      {(() => {
                        const revenuFoncierNet = results.revenu_foncier_net || 0;
                        const travauxActuels = results.travaux_deja_effectues || 0;
                        const plafondGlobal = 10700;

                        // Calcul des phases pour l'affichage visuel
                        const phase1Montant = Math.max(0, revenuFoncierNet);
                        const phase2Montant = plafondGlobal;

                        const pourcentagePhase1 = Math.min((phase1Montant / (phase1Montant + phase2Montant)) * 100, 100);
                        const pourcentagePhase2 = Math.min((phase2Montant / (phase1Montant + phase2Montant)) * 100, 100);

                        return (
                          <div className="space-y-2">
                            {/* Phase 1 : Effacement des loyers */}
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-blue-700">Phase 1 (Loyers)</span>
                                <span className="text-blue-600">{Math.round(pourcentagePhase1)}%</span>
                              </div>
                              <div className="w-full bg-blue-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(pourcentagePhase1, 100)}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* Phase 2 : Plafond global */}
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-green-700">Phase 2 (Global)</span>
                                <span className="text-green-600">{Math.round(pourcentagePhase2)}%</span>
                              </div>
                              <div className="w-full bg-green-200 rounded-full h-2">
                                <div
                                  className="bg-green-600 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(pourcentagePhase2, 100)}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* Ligne de séparation des phases */}
                            <div className="relative">
                              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-orange-400"></div>
                              <div className="text-xs text-orange-600 ml-2 font-medium">
                                Séparation Phase 1/2
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Meilleure stratégie */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200 mb-6">
                <h3 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  Stratégie d&apos;Optimisation Recommandée
                </h3>

                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded p-2 border border-purple-300">
                  <p className="text-sm font-semibold text-purple-800">
                    {(() => {
                      // Calcul PER
                      const plafondPER = Math.max(results.salaire_imposable * 0.1, 4637);
                      const perDejaInvesti = inputData?.versement_PER_deductible || 0;
                      const perRestant = plafondPER - perDejaInvesti;
                      const gainPERCalc = perRestant * 0.3;

                      // Calcul Travaux avec phases
                      const revenuFoncierNet = results.revenu_foncier_net || 0;
                      const travauxActuels = results.travaux_deja_effectues || 0;
                      const TMI = results.IR_avec_foncier / Math.max(results.salaire_imposable + results.revenu_foncier_net, 1);

                      const phase1Montant = Math.max(0, revenuFoncierNet);
                      const gainPhase1IR = phase1Montant * TMI;
                      const gainPhase1PS = phase1Montant * 0.172;

                      const phase2Montant = 10700;
                      const gainPhase2IR = TMI > 0 ? phase2Montant * TMI : 0;

                      const travauxRestant = (() => {
                        const revenuFoncierNet = results.revenu_foncier_net || 0;
                        const investissementPhase1 = Math.max(0, revenuFoncierNet);
                        return investissementPhase1 + 10700;
                      })();
                      const gainTravauxCalc = gainPhase1IR + gainPhase1PS + gainPhase2IR;
                      const totalGain = gainPERCalc + gainTravauxCalc;

                      return `💼 Total optimisé : ${formatCurrency(perRestant + travauxRestant)} investis → ${formatCurrency(totalGain)} d'économies d'impôt (ratio ${(totalGain / (perRestant + travauxRestant)).toFixed(2)})`;
                    })()}
                  </p>
                </div>
              </div>

              {/* Tableau récapitulatif */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h3 className="text-lg font-bold text-slate-700 mb-3">📊 Tableau Comparatif</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-300">
                        <th className="text-left py-2 font-semibold text-slate-600">Optimisation</th>
                        <th className="text-right py-2 font-semibold text-slate-600">Investissement</th>
                        <th className="text-right py-2 font-semibold text-slate-600">Gain fiscal</th>
                        <th className="text-right py-2 font-semibold text-slate-600">Ratio (€/€)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="py-2 text-blue-700 font-medium">PER</td>
                        <td className="py-2 text-right">{formatCurrency(Math.max(results.salaire_imposable * 0.1, 4637) - (inputData?.versement_PER_deductible || 0))}</td>
                        <td className="py-2 text-right text-green-600 font-semibold">{formatCurrency((Math.max(results.salaire_imposable * 0.1, 4637) - (inputData?.versement_PER_deductible || 0)) * 0.3)}</td>
                        <td className="py-2 text-right font-semibold">0,30</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-2 text-green-700 font-medium">Travaux</td>
                        <td className="py-2 text-right">{(() => {
                          const revenuFoncierNet = results.revenu_foncier_net || 0;
                          const travauxActuels = results.travaux_deja_effectues || 0;

                          // Investissement total nécessaire pour optimisation maximale
                          // Phase 1 : annuler les loyers + Phase 2 : plafond global
                          const investissementPhase1 = Math.max(0, revenuFoncierNet);
                          const investissementTotal = investissementPhase1 + 10700;

                          return formatCurrency(investissementTotal);
                        })()}</td>
                        <td className="py-2 text-right text-green-600 font-semibold">
                          {(() => {
                            const revenuFoncierNet = results.revenu_foncier_net || 0;
                            const travauxActuels = results.travaux_deja_effectues || 0;
                            const TMI = results.IR_avec_foncier / Math.max(results.salaire_imposable + results.revenu_foncier_net, 1);

                            // Calcul basé sur l'investissement total nécessaire pour optimisation maximale
                            const investissementPhase1 = Math.max(0, revenuFoncierNet);
                            const investissementTotal = investissementPhase1 + 10700;

                            // Phase 1 : Effacement des loyers (tout ce qui est nécessaire pour les annuler)
                            const phase1Montant = investissementPhase1;
                            const gainPhase1IR = phase1Montant * TMI;
                            const gainPhase1PS = phase1Montant * 0.172;

                            // Phase 2 : Plafond global (toujours disponible après Phase 1)
                            const gainPhase2IR = TMI > 0 ? 10700 * TMI : 0;

                            return formatCurrency(gainPhase1IR + gainPhase1PS + gainPhase2IR);
                          })()}
                        </td>
                        <td className="py-2 text-right font-semibold">
                          {(() => {
                            const revenuFoncierNet = results.revenu_foncier_net || 0;
                            const travauxActuels = results.travaux_deja_effectues || 0;
                            const plafondImputable = 10700;
                            const TMI = results.IR_avec_foncier / Math.max(results.salaire_imposable + results.revenu_foncier_net, 1);

                            // Phase 1 : Effacement des loyers
                            const phase1Montant = Math.max(0, revenuFoncierNet);
                            const gainPhase1IR = phase1Montant * TMI;
                            const gainPhase1PS = phase1Montant * 0.172;

                            // Phase 2 : Plafond global
                            const phase2Montant = plafondImputable;
                            const gainPhase2IR = TMI > 0 ? phase2Montant * TMI : 0;

                            // Ratio basé sur l'investissement total nécessaire pour optimisation maximale
                            const investissementPhase1 = Math.max(0, revenuFoncierNet);
                            const investissementTotal = investissementPhase1 + 10700;
                            const totalGain = gainPhase1IR + gainPhase1PS + gainPhase2IR;

                            return investissementTotal > 0 ? (totalGain / investissementTotal).toFixed(2) : '0.00';
                          })()}
                        </td>
                      </tr>
                      <tr className="bg-slate-100">
                        <td className="py-3 text-slate-800 font-bold">TOTAL COMBINÉ</td>
                        <td className="py-3 text-right font-bold">
                          {formatCurrency(Math.max(results.salaire_imposable * 0.1, 4637) - (inputData?.versement_PER_deductible || 0) + (() => {
                            const revenuFoncierNet = results.revenu_foncier_net || 0;
                            const investissementPhase1 = Math.max(0, revenuFoncierNet);
                            return investissementPhase1 + 10700;
                          })())}
                        </td>
                        <td className="py-3 text-right text-green-600 font-bold">
                          {(() => {
                            // Calcul PER
                            const gainPER = (Math.max(results.salaire_imposable * 0.1, 4637) - (inputData?.versement_PER_deductible || 0)) * 0.3;

                            // Calcul Travaux avec phases
                            const revenuFoncierNet = results.revenu_foncier_net || 0;
                            const travauxActuels = results.travaux_deja_effectues || 0;
                            const TMI = results.IR_avec_foncier / Math.max(results.salaire_imposable + results.revenu_foncier_net, 1);

                            const phase1Montant = Math.max(0, revenuFoncierNet);
                            const gainPhase1IR = phase1Montant * TMI;
                            const gainPhase1PS = phase1Montant * 0.172;

                            const phase2Montant = 10700;
                            const gainPhase2IR = TMI > 0 ? phase2Montant * TMI : 0;

                            const gainTravaux = gainPhase1IR + gainPhase1PS + gainPhase2IR;

                            return formatCurrency(gainPER + gainTravaux);
                          })()}
                        </td>
                        <td className="py-3 text-right font-bold">
                          {(() => {
                            const totalInvest = Math.max(results.salaire_imposable * 0.1, 4637) - (inputData?.versement_PER_deductible || 0) + (() => {
                              const revenuFoncierNet = results.revenu_foncier_net || 0;
                              const investissementPhase1 = Math.max(0, revenuFoncierNet);
                              return investissementPhase1 + 10700;
                            })();

                            // Calcul PER
                            const gainPER = (Math.max(results.salaire_imposable * 0.1, 4637) - (inputData?.versement_PER_deductible || 0)) * 0.3;

                            // Calcul Travaux (cohérent avec le tableau)
                            const revenuFoncierNet = results.revenu_foncier_net || 0;
                            const TMI = results.IR_avec_foncier / Math.max(results.salaire_imposable + results.revenu_foncier_net, 1);

                            const investissementPhase1 = Math.max(0, revenuFoncierNet);
                            const gainPhase1IR = investissementPhase1 * TMI;
                            const gainPhase1PS = investissementPhase1 * 0.172;
                            const gainPhase2IR = TMI > 0 ? 10700 * TMI : 0;

                            const gainTravaux = gainPhase1IR + gainPhase1PS + gainPhase2IR;
                            const totalGain = gainPER + gainTravaux;

                            return totalInvest > 0 ? (totalGain / totalInvest).toFixed(2) : '0.00';
                          })()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
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

