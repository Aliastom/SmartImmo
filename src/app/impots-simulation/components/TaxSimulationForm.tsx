'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertCircle } from 'lucide-react';
import FiscalDetailsModal from './FiscalDetailsModal';
import { supabase } from '@/lib/supabase/client';

interface TaxSimulationInput {
  salaire_brut_annuel: number;
  parts_quotient_familial: number;
  situation_familiale: 'celibataire' | 'couple';
  versement_PER_deductible?: number;
  loyers_percus_total?: number;
  charges_foncieres_total?: number;
  travaux_deja_effectues?: number;
  pourcentage_gestion?: number;
  regime_foncier: 'reel' | 'micro';
  autres_revenus_imposables?: number;
  autofill_from_db?: boolean;
  inclure_frais_gestion_autofill?: boolean;
  annee_parametres?: number;
}

interface TaxSimulationFormProps {
  onSubmit: (data: TaxSimulationInput) => void;
  isLoading?: boolean;
}

export default function TaxSimulationForm({ onSubmit, isLoading = false }: TaxSimulationFormProps) {
  const [formData, setFormData] = useState<TaxSimulationInput>({
    salaire_brut_annuel: 48000,
    parts_quotient_familial: 1,
    situation_familiale: 'celibataire',
    versement_PER_deductible: 0,
    loyers_percus_total: 0,
    charges_foncieres_total: 0,
    travaux_deja_effectues: 0,
    pourcentage_gestion: 6, // 6% par défaut
    regime_foncier: 'reel',
    autres_revenus_imposables: 0,
    autofill_from_db: false,
    inclure_frais_gestion_autofill: true, // Par défaut, inclure les frais de gestion
    annee_parametres: new Date().getFullYear() // Année courante par défaut
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
      const { data: { user } } = await supabase.auth.getUser();

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
          property_id,
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

      // Récupérer les propriétés avec leurs pourcentages de gestion (si la colonne existe)
      let properties: any[] = [];

      try {
        // D'abord essayer de récupérer avec la colonne management_fee_percentage
        const { data: propertiesWithGestion, error: errorWithGestion } = await supabase
          .from('properties')
          .select('id, name, management_fee_percentage')
          .eq('user_id', user.id);

        console.log('=== DEBUG PROPRIÉTÉS ===');
        console.log('Tentative de récupération avec management_fee_percentage');
        console.log('Erreur éventuelle:', errorWithGestion);
        console.log('Propriétés trouvées:', propertiesWithGestion?.length || 0);
        if (propertiesWithGestion) {
          propertiesWithGestion.forEach(p => {
            console.log(`Propriété: ${p.name}, ID: ${p.id}, % gestion: ${p.management_fee_percentage}`);
          });
        }

        if (errorWithGestion) {
          console.log('❌ Colonne management_fee_percentage non trouvée');
          // Si la colonne n'existe pas, récupérer seulement les propriétés de base
          const { data: basicProperties } = await supabase
            .from('properties')
            .select('id, name')
            .eq('user_id', user.id);

          properties = basicProperties?.map(p => ({
            ...p,
            management_fee_percentage: 6 // Valeur par défaut
          })) || [];
          console.log('✅ Utilisation des propriétés de base avec % par défaut');
        } else if (propertiesWithGestion && propertiesWithGestion.length > 0) {
          properties = propertiesWithGestion;
          console.log('✅ Propriétés récupérées avec management_fee_percentage');
        } else {
          console.log('⚠️ Aucune propriété trouvée');
          properties = [];
        }
      } catch (error) {
        console.log('❌ Erreur lors de la récupération des propriétés:', error);
        properties = [];
      }

      // Créer un map des propriétés pour faciliter la recherche
      const propertiesMap = new Map(properties?.map((p: any) => [p.id, p]) || []);

      rawTransactions?.forEach((transaction: any) => {
        const type = typesMap.get(transaction.type);
        const category = type?.category_id ? categoriesMap.get(type.category_id) : null;
        const property = propertiesMap.get(transaction.property_id);
        const gestionPercentage = property?.management_fee_percentage || 6; // Utiliser le % de la propriété ou 6% par défaut

        console.log('=== DEBUG TRANSACTION ===');
        console.log('Transaction ID:', transaction.id);
        console.log('Property ID:', transaction.property_id);
        console.log('Propriété trouvée:', property?.name);
        console.log('Pourcentage gestion utilisé:', gestionPercentage);

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
            property_name: property?.name || 'Propriété inconnue',
            gestion_percentage: gestionPercentage,
            frais_gestion: Number(transaction.amount) * (gestionPercentage / 100)
          });
          console.log('Loyer détecté:', transaction.description, 'Montant:', transaction.amount, 'Gestion %:', gestionPercentage);
        } else if (isChargeDeductible && Number(transaction.amount) > 0) {
          chargesDeductibles += Number(transaction.amount);
          detailedTransactions.push({
            id: transaction.id,
            amount: Number(transaction.amount),
            description: transaction.description || '',
            date: transaction.accounting_month || transaction.date,
            type: 'Charge déductible',
            property_name: property?.name || 'Propriété inconnue',
            gestion_percentage: 0,
            frais_gestion: 0
          });
          console.log('Charge détectée:', transaction.description, 'Montant:', transaction.amount);
        }
      });

      // Calculer le pourcentage de gestion moyen pondéré selon les loyers de chaque propriété
      let totalLoyersPondere = 0;
      let totalGestionPondere = 0;

      // Grouper les loyers par propriété
      const loyersParPropriete = new Map();
      detailedTransactions.forEach(transaction => {
        if (transaction.type === 'Loyer') {
          const current = loyersParPropriete.get(transaction.property_name) || 0;
          loyersParPropriete.set(transaction.property_name, current + transaction.amount);
        }
      });

      // Calculer la moyenne pondérée des pourcentages de gestion
      loyersParPropriete.forEach((loyerTotal, propertyName) => {
        const propertyTransactions = detailedTransactions.filter(t => t.property_name === propertyName && t.type === 'Loyer');
        if (propertyTransactions.length > 0) {
          const gestionPercentage = propertyTransactions[0].gestion_percentage;
          totalLoyersPondere += loyerTotal;
          totalGestionPondere += loyerTotal * (gestionPercentage / 100);
        }
      });

      const pourcentageGestionFinal = totalLoyersPondere > 0 ? (totalGestionPondere / totalLoyersPondere) * 100 : 6;

      console.log('=== RÉSULTATS FINAUX ===');
      console.log('Loyers perçus:', loyersPercus);
      console.log('Charges déductibles:', chargesDeductibles);
      console.log('Pourcentage gestion utilisé:', pourcentageGestionFinal);
      console.log('Inclure frais de gestion:', formData.inclure_frais_gestion_autofill);

      // Stocker les transactions détaillées pour la modal
      setDetailedTransactions(detailedTransactions);

      // Mettre à jour le formulaire avec les données récupérées
      setFormData(prev => ({
        ...prev,
        loyers_percus_total: loyersPercus,
        charges_foncieres_total: chargesDeductibles,
        pourcentage_gestion: pourcentageGestionFinal,
        travaux_deja_effectues: 0, // Remettre à zéro car non géré par autofill
        // Conserver le régime foncier choisi par l'utilisateur
        autofill_from_db: true
      }));

      console.log('=== DEBUG AUTOFILL FINAL ===');
      console.log('Charges déductibles (sans frais de gestion):', chargesDeductibles);
      console.log('Frais de gestion à ajouter côté serveur:', loyersPercus * (pourcentageGestionFinal / 100));
      console.log('Total charges finales (avec frais de gestion):', chargesDeductibles + (loyersPercus * (pourcentageGestionFinal / 100)));

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
      // Réinitialiser seulement les champs gérés par l'autofill quand on décoche
      setFormData(prev => ({
        ...prev,
        loyers_percus_total: 0,
        charges_foncieres_total: 0,
        travaux_deja_effectues: 0
        // Ne pas réinitialiser regime_foncier pour conserver le choix de l'utilisateur
      }));
    }
  }, [formData.autofill_from_db]);

  const handleInputChange = (field: keyof TaxSimulationInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Si autofill est activé mais pas encore chargé, attendre ou afficher une erreur
    if (formData.autofill_from_db && isLoadingAutofill) {
      setAutofillError('Veuillez attendre le chargement des données autofill avant de calculer.');
      return;
    }

    // Si autofill est activé et il y a une erreur, ne pas soumettre
    if (formData.autofill_from_db && autofillError) {
      return;
    }

    // S'assurer que les valeurs sont correctement formatées pour l'envoi
    const dataToSubmit = {
      ...formData,
      loyers_percus_total: Number(formData.loyers_percus_total) || 0,
      charges_foncieres_total: Number(formData.charges_foncieres_total) || 0,
      travaux_deja_effectues: Number(formData.travaux_deja_effectues) || 0,
      pourcentage_gestion: Number(formData.pourcentage_gestion) || 0,
      salaire_brut_annuel: Number(formData.salaire_brut_annuel) || 0,
      parts_quotient_familial: Number(formData.parts_quotient_familial) || 1,
      versement_PER_deductible: Number(formData.versement_PER_deductible) || 0,
      autres_revenus_imposables: Number(formData.autres_revenus_imposables) || 0,
      inclure_frais_gestion_autofill: Boolean(formData.inclure_frais_gestion_autofill)
    };

    console.log('=== DONNÉES SOUMISES ===');
    console.log('Loyers perçus:', dataToSubmit.loyers_percus_total);
    console.log('Charges déductibles:', dataToSubmit.charges_foncieres_total);
    console.log('Pourcentage gestion:', dataToSubmit.pourcentage_gestion);
    console.log('Autofill activé:', dataToSubmit.autofill_from_db);
    console.log('Données complètes:', dataToSubmit);

    onSubmit(dataToSubmit);
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

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="situation_familiale"
                checked={formData.situation_familiale === 'couple'}
                onChange={(e) => handleInputChange('situation_familiale', e.target.checked ? 'couple' : 'celibataire')}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <Label htmlFor="situation_familiale" className="text-sm font-medium">
                Couple (imposition commune)
              </Label>
            </div>

            <div>
              <Label htmlFor="annee_parametres">Année des paramètres fiscaux</Label>
              <Input
                id="annee_parametres"
                type="number"
                min="2020"
                max="2030"
                value={formData.annee_parametres || ''}
                onChange={(e) => handleInputChange('annee_parametres', parseInt(e.target.value) || new Date().getFullYear())}
                placeholder={new Date().getFullYear().toString()}
              />
              <p className="text-xs text-gray-500 mt-1">
                Année des paramètres de décote à utiliser (par défaut : année courante)
              </p>
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
                    <Label htmlFor="pourcentage_gestion">% de frais de gestion</Label>
                    <Input
                      id="pourcentage_gestion"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.pourcentage_gestion || ''}
                      onChange={(e) => handleInputChange('pourcentage_gestion', parseFloat(e.target.value) || 0)}
                      placeholder="6"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Frais de gestion calculés sur les loyers perçus
                    </p>
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
                    <p className="text-xs text-gray-400 mt-1">
                      Charges trouvées dans vos transactions (sans frais de gestion)
                    </p>
                  </div>
                </div>

                {/* Affichage du total des charges incluant les frais de gestion */}
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-green-700">Total charges déductibles</span>
                      <p className="text-xs text-green-600">
                        (incluant frais de gestion de {formatCurrency((formData.loyers_percus_total || 0) * (formData.pourcentage_gestion || 0) / 100)})
                      </p>
                    </div>
                    <span className="text-lg font-semibold text-green-700">
                      {formatCurrency((formData.charges_foncieres_total || 0) + (formData.loyers_percus_total || 0) * (formData.pourcentage_gestion || 0) / 100)}
                    </span>
                  </div>
                </div>

                {/* Case à cocher pour inclure les frais de gestion */}
                <div className="mt-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="inclure_frais_gestion_autofill"
                      checked={formData.inclure_frais_gestion_autofill}
                      onChange={(e) => handleInputChange('inclure_frais_gestion_autofill', e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <Label htmlFor="inclure_frais_gestion_autofill" className="text-sm text-gray-700">
                      Inclure les frais de gestion ({formData.pourcentage_gestion?.toFixed(1) || '0'}% - moyenne pondérée) dans les charges déductibles
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    {formData.inclure_frais_gestion_autofill
                      ? `Frais de gestion ajoutés : ${formatCurrency((formData.loyers_percus_total || 0) * (formData.pourcentage_gestion || 0) / 100)} (${formData.pourcentage_gestion?.toFixed(1) || 0}%)`
                      : 'Les frais de gestion ne seront pas déduits des revenus fonciers'
                    }
                  </p>
                </div>

                {/* Régime foncier - conservé même en mode autofill */}
                <div className="mt-4">
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

                {/* Travaux déjà effectués - champ éditable même en mode autofill */}
                <div className="mt-4">
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
