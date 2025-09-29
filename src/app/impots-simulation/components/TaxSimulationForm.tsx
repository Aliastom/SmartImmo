'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { TaxSimulationInput } from '@/types/tax-simulation';

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
            </div>

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
                      <span className="text-sm text-gray-500">Chargement...</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Charges déductibles (autofill)</Label>
                    <div className="h-10 bg-white border border-gray-200 rounded-md flex items-center px-3">
                      <span className="text-sm text-gray-500">Chargement...</span>
                    </div>
                  </div>
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
