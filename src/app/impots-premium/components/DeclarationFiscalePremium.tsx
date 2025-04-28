"use client";
import React, { useState, useEffect } from "react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useBienFinancier } from '../../properties/hooks/useBienFinancier';
import { BienFinancierItem } from "./BienFinancierItem";

interface Property {
  id: string;
  name: string;
  property_regime_id: string;
  property_type?: string;
  location_type?: string;
  [key: string]: any;
}

interface PropertyRegime {
  id: string;
  name: string;
}

const regimes = [
  { label: "Foncier (2044)", value: "foncier" },
  { label: "LMNP (2042-C PRO)", value: "lmnp" },
];

const checklistData = {
  foncier: [
    "Revenus fonciers perçus",
    "Charges déductibles (travaux, intérêts, taxes...)",
    "Déficit reportable",
    "Montant net à reporter sur 2042",
  ],
  lmnp: [
    "Recettes locatives perçues",
    "Amortissements",
    "Charges (intérêts, assurance...)",
    "Bénéfice ou déficit à reporter sur 2042-C PRO",
  ],
};

export default function DeclarationFiscalePremium() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProps, setSelectedProps] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [regimesList, setRegimesList] = useState<PropertyRegime[]>([]);
  const [deductibleCharges, setDeductibleCharges] = useState<Record<string, number>>({});

  // Met à jour la date limite automatiquement selon l'année courante
  const currentYear = new Date().getFullYear();
  // Pour l'année fiscale 2024, la date limite était le 22 mai 2024. Pour 2025, adapte à la date officielle (exemple : 21 mai 2025)
  const deadline = currentYear >= 2025 ? `21 mai 2025` : `22 mai 2024`;
  const [alert, setAlert] = useState<string|null>(`Date limite déclaration : ${deadline}`);

  // 1. Récupérer l'userId (ici, à adapter selon ton auth)
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClientComponentClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    };
    fetchUser();
  }, []);

  // 2. Charger les biens de l'utilisateur
  useEffect(() => {
    if (!userId) return;
    const fetchProperties = async () => {
      const supabase = createClientComponentClient();
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', userId);
      if (data) setProperties(data);
    };
    fetchProperties();
  }, [userId]);

  // 3. Charger les charges déductibles par bien
  useEffect(() => {
    if (!userId) return;
    async function fetchDeductibleCharges() {
      const supabase = createClientComponentClient();
      // Pour chaque bien sélectionné, somme les charges déductibles
      const results: Record<string, number> = {};
      for (const prop of properties) {
        const { data, error } = await supabase
          .from('transactions')
          .select('amount, type(deductible), property_id')
          .eq('property_id', prop.id);
        if (data) {
          // On ne garde que les transactions dont le type est déductible
          const total = data.filter((t: any) => t.type && t.type.deductible === true)
            .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
          results[prop.id] = total;
        }
      }
      setDeductibleCharges(results);
    }
    fetchDeductibleCharges();
  }, [userId, properties]);

  // Charger les régimes depuis Supabase (id, name) + debug erreur
  useEffect(() => {
    const fetchRegimes = async () => {
      const supabase = createClientComponentClient();
      const { data } = await supabase.from('property_regimes').select('id, name');
      setRegimesList(data || []);
    };
    fetchRegimes();
  }, []);

  // Fonction utilitaire pour obtenir le libellé du régime
  const getRegimeLibelle = (regimeId: string) => regimesList.find(r => r.id === regimeId)?.name || 'Régime inconnu';

  // 4. Récapitulatif et simulation
  const totalLoyer = properties.filter(b => selectedProps.includes(b.id)).reduce((sum, b) => sum + (b.financier?.loyerAnnuel || 0), 0);
  // Utilise le total des charges déductibles récupérées
  const totalCharges = selectedProps.reduce((sum, propId) => sum + (deductibleCharges[propId] || 0), 0);
  const totalTaxe = properties.filter(b => selectedProps.includes(b.id)).reduce((sum, b) => sum + (b.financier?.landTax || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Alerte date limite */}
      {alert && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-3 rounded flex items-center gap-2">
          <span role="img" aria-label="warning">⚠️</span> {alert}
        </div>
      )}

      {/* Sélection des biens à inclure */}
      <div className="bg-blue-50 border-l-4 border-blue-400 rounded p-4 mb-2">
        <div className="font-semibold mb-2">Biens à inclure dans la déclaration :</div>
        <div className="flex flex-wrap gap-3">
          {properties.map(p => (
            <label key={p.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedProps.includes(p.id)}
                onChange={e => {
                  setSelectedProps(sel => e.target.checked ? [...sel, p.id] : sel.filter(id => id !== p.id));
                }}
              />
              <span className="font-medium text-sm">{p.name} <span className="text-gray-400">({getRegimeLibelle(p.property_regime_id)})</span></span>
            </label>
          ))}
        </div>
      </div>

      {/* Checklist dynamique par régime (utilise le code du régime) */}
      {properties.filter(b => selectedProps.includes(b.id)).map(bien => (
        <BienFinancierItem
          key={bien.id}
          userId={userId ?? ''}
          bien={bien}
          regimeLibelle={getRegimeLibelle(bien.property_regime_id)}
          checklistData={
            checklistData[getRegimeLibelle(bien.property_regime_id)?.toLowerCase() || 'foncier'] ?? []
          }
        />
      ))}

      {/* Simulation globale */}
      {selectedProps.length > 0 && (
        <div className="bg-purple-50 border-l-4 border-purple-400 rounded p-4 mt-2">
          <div className="font-bold mb-2">Simulation globale déclaration</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span>Total loyers</span><span className="text-right font-semibold">{totalLoyer} €</span>
            <span>Total charges déductibles</span><span className="text-right">{totalCharges} €</span>
            <span>Total taxe foncière</span><span className="text-right">{totalTaxe} €</span>
            <span className="font-bold">Net imposable estimé</span><span className="text-right font-bold">{totalLoyer - totalCharges - totalTaxe} €</span>
          </div>
        </div>
      )}
    </div>
  );
}
