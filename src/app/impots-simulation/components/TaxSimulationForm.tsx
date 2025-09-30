'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { TaxSimulationInput } from '@/types/tax-simulation';
import FiscalDetailsModal from './FiscalDetailsModal';
import { supabase } from '@/lib/supabase/client';

interface TaxSimulationFormProps {
  onSubmit: (data: TaxSimulationInput) => void;
  isLoading?: boolean;
}

export default function TaxSimulationForm({ onSubmit, isLoading = false }: TaxSimulationFormProps) {
  const [formData, setFormData] = useState<TaxSimulationInput>({
    salaire_brut_annuel: 0,
    parts_quotient_familial: 1,
    versement_PER_deductible: 0,
    loyers_percus_total: 0,
    charges_foncieres_total: 0,
    travaux_deja_effectues: 0,
    regime_foncier: 'reel',
    autres_revenus_imposables: 0,
    autofill_from_db: false
  });

  // État pour l'autofill
  const [isLoadingAutofill, setIsLoadingAutofill] = useState(false);
  const [autofillError, setAutofillError] = useState<string | null>(null);

  // État pour stocker les transactions détaillées pour la modal
  const [detailedTransactions, setDetailedTransactions] = useState<any[]>([]);

  // Fonction pour charger les données fiscales depuis Supabase (côté client)
  const loadFiscalData = async () => {
    setIsLoadingAutofill(true);
    setAutofillError(null);

    try {
      // Utiliser le client Supabase côté client
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        throw new Error('Erreur d\'authentification');
      }

      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      console.log('=== RÉCUPÉRATION DONNÉES CÔTÉ CLIENT ===');
      console.log('Utilisateur connecté:', user.id);

      // Si pas d'année spécifiée, utiliser l'année en cours
      const targetYear = new Date().getFullYear();
      const startDate = `${targetYear}-01`;
      const endDate = `${targetYear}-12`;

      console.log('Période:', startDate, 'à', endDate);

      // Récupérer les transactions fiscales pour l'année
      const { data: rawTransactions, error } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          description,
          date,
          accounting_month,
          type,
          properties!inner(name, user_id)
        `)
        .eq('properties.user_id', user.id)
        .gte('accounting_month', startDate)
        .lte('accounting_month', endDate)
        .order('accounting_month', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des transactions:', error);
        throw new Error(`Erreur lors de la récupération des données: ${error.message}`);
      }

      console.log('Nombre de transactions trouvées:', rawTransactions?.length || 0);

      // Récupérer les types de transactions pour la classification
      const { data: types } = await supabase
        .from('types')
        .select('id, name, category_id, deductible')
        .in('scope', ['transaction', 'both']);

      const { data: categories } = await supabase
        .from('categories')
        .select('id, name');

      // Créer un map des types pour faciliter la recherche
      const typesMap = new Map(types?.map((t: any) => [t.id, t]) || []);
      const categoriesMap = new Map(categories?.map((c: any) => [c.id, c]) || []);

      let loyersPercus = 0;
      let chargesDeductibles = 0;
      const detailedTransactions: any[] = [];

      rawTransactions?.forEach((transaction: any) => {
        const type = typesMap.get(transaction.type);
        const category = type?.category_id ? categoriesMap.get(type.category_id) : null;

        // Classifier les transactions avec des critères plus larges
        const isLoyer = category?.name?.toLowerCase().includes('loyer') ||
                       category?.name?.toLowerCase().includes('revenu') ||
                       transaction.description?.toLowerCase().includes('loyer') ||
                       transaction.description?.toLowerCase().includes('mensuel') ||
                       transaction.description?.toLowerCase().includes('loyer') ||
                       (type?.name?.toLowerCase().includes('loyer'));

        const isChargeDeductible = type?.deductible ||
                                 category?.name?.toLowerCase().includes('charge') ||
                                 category?.name?.toLowerCase().includes('travaux') ||
                                 category?.name?.toLowerCase().includes('entretien') ||
                                 category?.name?.toLowerCase().includes('réparation') ||
                                 category?.name?.toLowerCase().includes('frais') ||
                                 transaction.description?.toLowerCase().includes('charge') ||
                                 transaction.description?.toLowerCase().includes('travaux') ||
                                 transaction.description?.toLowerCase().includes('entretien') ||
                                 transaction.description?.toLowerCase().includes('réparation') ||
                                 transaction.description?.toLowerCase().includes('frais');

        if (isLoyer && Number(transaction.amount) > 0) {
          loyersPercus += Number(transaction.amount);
          detailedTransactions.push({
            id: transaction.id,
            amount: Number(transaction.amount),
            description: transaction.description || '',
            date: transaction.accounting_month || transaction.date,
            type: 'Loyer',
            property_name: (transaction.properties as any)?.name || 'Propriété inconnue'
          });
          console.log('Loyer détecté:', transaction.description, 'Montant:', transaction.amount);
        } else if (isChargeDeductible && Number(transaction.amount) > 0) {
          chargesDeductibles += Number(transaction.amount);
          detailedTransactions.push({
            id: transaction.id,
            amount: Number(transaction.amount),
            description: transaction.description || '',
            date: transaction.accounting_month || transaction.date,
            type: 'Charge déductible',
            property_name: (transaction.properties as any)?.name || 'Propriété inconnue'
          });
          console.log('Charge détectée:', transaction.description, 'Montant:', transaction.amount);
        }
      });

      console.log('=== RÉSULTATS FINAUX ===');
      console.log('Loyers perçus:', loyersPercus);
      console.log('Charges déductibles:', chargesDeductibles);

      // Stocker les transactions détaillées pour la modal
      setDetailedTransactions(detailedTransactions);

      // Mettre à jour le formulaire avec les données récupérées
      setFormData(prev => ({
        ...prev,
        loyers_percus_total: loyersPercus,
        charges_foncieres_total: chargesDeductibles,
        autofill_from_db: true
      }));

    } catch (error) {
      console.error('Erreur lors du chargement des données fiscales:', error);
      setAutofillError(error instanceof Error ? error.message : 'Erreur lors du chargement des données');
    } finally {
      setIsLoadingAutofill(false);
    }
  };

  // Effet pour gérer l'autofill
  useEffect(() => {
    if (formData.autofill_from_db) {
      loadFiscalData();
    } else {
      // Réinitialiser les champs quand on décoche
      setFormData(prev => ({
        ...prev,
        loyers_percus_total: 0,
        charges_foncieres_total: 0,
        autofill_from_db: false
      }));
    }
  }, [formData.autofill_from_db]);

  const handleInputChange = (field: keyof TaxSimulationInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          Formulaire
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations personnelles */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informations personnelles</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="salaire_brut_annuel">Salaire brut annuel (€)</Label>
                <Input
                  id="salaire_brut_annuel"
                  type="number"
                  step="0.01"
                  value={formData.salaire_brut_annuel || ''}
                  onChange={(e) => handleInputChange('salaire_brut_annuel', parseFloat(e.target.value) || 0)}
                  placeholder="75000"
                  required
                />
              </div>

              <div>
                <Label htmlFor="parts_quotient_familial">Parts de quotient familial</Label>
                <Input
                  id="parts_quotient_familial"
                  type="number"
                  min="1"
                  step="0.5"
                  value={formData.parts_quotient_familial || ''}
                  onChange={(e) => handleInputChange('parts_quotient_familial', parseFloat(e.target.value) || 1)}
                  placeholder="1"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="versement_PER_deductible">Versement PER déductible (€)</Label>
              <Input
                id="versement_PER_deductible"
                type="number"
                step="0.01"
                value={formData.versement_PER_deductible || ''}
                onChange={(e) => handleInputChange('versement_PER_deductible', parseFloat(e.target.value) || 0)}
                placeholder="5000"
              />
            </div>

            <div>
              <Label htmlFor="autres_revenus_imposables">Autres revenus imposables (€)</Label>
              <Input
                id="autres_revenus_imposables"
                type="number"
                step="0.01"
                value={formData.autres_revenus_imposables || ''}
                onChange={(e) => handleInputChange('autres_revenus_imposables', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>

          <Separator />

          {/* Informations immobilières */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autofill_from_db"
                  checked={formData.autofill_from_db}
                  onChange={(e) => handleInputChange('autofill_from_db', e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <Label htmlFor="autofill_from_db" className="text-sm font-medium">
                  Autofill depuis mes données
                </Label>
                {isLoadingAutofill && (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                )}
              </div>
            </div>

            {/* Affichage des erreurs d'autofill */}
            {autofillError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-600">{autofillError}</p>
              </div>
            )}

            {!formData.autofill_from_db && (
              <>
                <h3 className="text-lg font-semibold">Informations immobilières</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="loyers_percus_total">Loyers perçus total (€)</Label>
                    <Input
                      id="loyers_percus_total"
                      type="number"
                      step="0.01"
                      value={formData.loyers_percus_total || ''}
                      onChange={(e) => handleInputChange('loyers_percus_total', parseFloat(e.target.value) || 0)}
                      placeholder="12000"
                    />
                  </div>

                  <div>
                    <Label htmlFor="charges_foncieres_total">Charges déductibles total (€)</Label>
                    <Input
                      id="charges_foncieres_total"
                      type="number"
                      step="0.01"
                      value={formData.charges_foncieres_total || ''}
                      onChange={(e) => handleInputChange('charges_foncieres_total', parseFloat(e.target.value) || 0)}
                      placeholder="8000"
                    />
                  </div>

                  <div>
                    <Label htmlFor="travaux_deja_effectues">Travaux déjà effectués cette année (€)</Label>
                    <Input
                      id="travaux_deja_effectues"
                      type="number"
                      step="0.01"
                      value={formData.travaux_deja_effectues || ''}
                      onChange={(e) => handleInputChange('travaux_deja_effectues', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="regime_foncier">Régime foncier</Label>
                  <Select
                    value={formData.regime_foncier}
                    onValueChange={(value: 'reel' | 'micro') => handleInputChange('regime_foncier', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le régime" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reel">Régime réel</SelectItem>
                      <SelectItem value="micro">Micro-foncier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {formData.autofill_from_db && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-blue-700">
                    Mode Autofill activé
                  </span>
                </div>
                <p className="text-sm text-blue-600 mb-3">
                  Les données immobilières sont automatiquement récupérées depuis vos transactions de l'année en cours.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-600">Loyers perçus (autofill)</Label>
                    <div className="h-10 bg-white border border-gray-200 rounded-md flex items-center px-3">
                      <span className="text-sm text-gray-500">
                        {isLoadingAutofill ? 'Chargement...' : `${formatCurrency(formData.loyers_percus_total || 0)}`}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Charges déductibles (autofill)</Label>
                    <div className="h-10 bg-white border border-gray-200 rounded-md flex items-center px-3">
                      <span className="text-sm text-gray-500">
                        {isLoadingAutofill ? 'Chargement...' : `${formatCurrency(formData.charges_foncieres_total || 0)}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bouton pour voir le détail */}
                <div className="mt-3 flex justify-end">
                  <FiscalDetailsModal
                    year={new Date().getFullYear()}
                    fiscalData={{
                      loyersPercus: formData.loyers_percus_total || 0,
                      chargesDeductibles: formData.charges_foncieres_total || 0,
                      transactions: detailedTransactions
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Calcul en cours...' : 'Calculer la simulation'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
