import React, { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/database';

/**
 * Affiche un résumé fiscal pour la déclaration d'impôt de l'année précédente (N-1).
 * Permet de saisir le salaire perçu, affiche le détail des revenus/charges, et simule les cases à remplir.
 */
export function TaxDeclarationSummary() {
  const [isLoading, setIsLoading] = useState(true);
  const [regimeDetails, setRegimeDetails] = useState<any[]>([]);
  const [year, setYear] = useState<number>(new Date().getFullYear() - 1);
  const [salary, setSalary] = useState<number>(0);
  const [declarationId, setDeclarationId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [impotCalcule, setImpotCalcule] = useState<number | null>(null);
  const supabase = createClientComponentClient<Database>();

  // --- Ajout : permettre de choisir l'année fiscale ---
  const currentYear = new Date().getFullYear();
  const selectableYears = Array.from({ length: 5 }, (_, i) => currentYear - i); // 5 dernières années

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setSaveMsg(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      // Charger la déclaration sauvegardée
      const { data: declaration } = await supabase
        .from('tax_declarations')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('year', year)
        .single();
      let salaryFromDeclaration = null;
      if (declaration) {
        setDeclarationId(declaration.id);
        setSalary(Number(declaration.salary) || 0);
        // Patch : toujours restaurer impotCalcule même si regimeDetails sont présents
        setImpotCalcule(
          declaration.impot_calcule !== undefined && declaration.impot_calcule !== null
            ? Number(declaration.impot_calcule)
            : null
        );
        if (declaration.data && declaration.data.regimeDetails) {
          setRegimeDetails(declaration.data.regimeDetails);
          setIsLoading(false);
          return; // NE PAS recalculer regimeDetails ni écraser avec les transactions
        }
      }
      // Si pas de déclaration, charger propriétés/transactions et calculer regimeDetails normalement
      const { data: properties } = await supabase
        .from('properties')
        .select('*, property_regimes(*)')
        .eq('user_id', session.user.id);
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('accounting_month', `${year}-01`)
        .lte('accounting_month', `${year}-12`);
      const salaryTx = transactions?.filter(t => t.type === 'salary').reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      if (!declaration) {
        setSalary(salaryTx);
      }
      // On suppose que le salaire est une transaction de type 'salary'
      // Regrouper les transactions par propriété
      let transactionsByProperty: { [propertyId: string]: any[] } = {};
      if (transactions) {
        for (const t of transactions) {
          if (!transactionsByProperty[t.property_id]) transactionsByProperty[t.property_id] = [];
          transactionsByProperty[t.property_id].push(t);
        }
      }
      // Regrouper les propriétés par régime fiscal
      let regimeGroups: { [regimeId: string]: any[] } = {};
      if (properties && properties.length > 0) {
        for (const property of properties) {
          const regimeId = property.property_regime_id || 'aucun';
          if (!regimeGroups[regimeId]) regimeGroups[regimeId] = [];
          regimeGroups[regimeId].push(property);
        }
      }
      // Détail par régime
      let regimeDetailsArr: any[] = [];
      if (properties && properties.length > 0) {
        for (const regimeId in regimeGroups) {
          const group = regimeGroups[regimeId];
          const regime = group[0]?.property_regimes || null;
          // Agréger les transactions de toutes les propriétés du groupe
          let revenusFoncier = 0, csg = 0, assurance = 0, foncier = 0, interets = 0, gestion = 0, autresCharges = 0;
          for (const property of group) {
            const txs = transactionsByProperty[property.id] || [];
            revenusFoncier += txs.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
            csg += txs.filter(t => t.type === 'csg').reduce((s, t) => s + (t.amount || 0), 0);
            assurance += txs.filter(t => t.type === 'insurance').reduce((s, t) => s + (t.amount || 0), 0);
            foncier += txs.filter(t => t.type === 'property_tax').reduce((s, t) => s + (t.amount || 0), 0);
            interets += txs.filter(t => t.type === 'loan_interest').reduce((s, t) => s + (t.amount || 0), 0);
            gestion += txs.filter(t => t.type === 'management_fees').reduce((s, t) => s + (t.amount || 0), 0);
            autresCharges += txs.filter(t => t.type === 'other_charge').reduce((s, t) => s + (t.amount || 0), 0);
          }
          const totalCharges = assurance + foncier + interets + gestion + autresCharges;
          let abattement = 0;
          let netImposable = revenusFoncier;
          if (regime?.flat_deduction) {
            const percent = parseFloat(regime.flat_deduction.replace('%','')) / 100;
            abattement = revenusFoncier * percent;
            netImposable = revenusFoncier - abattement;
          } else if (regime?.real_expenses_deduction) {
            netImposable = revenusFoncier - totalCharges;
          }
          regimeDetailsArr.push({
            id: regimeId,
            regime: regime?.name || 'Aucun',
            revenusFoncier,
            csg,
            assurance,
            foncier,
            interets,
            gestion,
            autresCharges,
            totalCharges,
            abattement,
            netImposable,
            detail: []
          });
        }
      }
      setRegimeDetails(regimeDetailsArr);
      setIsLoading(false);
    }
    fetchData();
  }, [year]);

  // --- Simulation des cases fiscales ---
  const casesFiscales = [
    { numero: '1AJ', label: 'Salaires à déclarer', valeur: salary },
    ...regimeDetails.map(reg => ({
      numero: '4BE', label: `Revenu foncier net imposable (${reg.regime})`, valeur: reg.netImposable
    }))
  ];

  // --- Calcul impôt estimé (simplifié, barème 2024, célibataire, hors décote, hors charges de famille) ---
  function calculerImpot(salaire: number, foncier: number): number {
    const revenuImposable = salaire + foncier;
    // Barème 2024 (exemple, à adapter si besoin)
    const tranches = [
      { plafond: 11294, taux: 0 },
      { plafond: 28797, taux: 0.11 },
      { plafond: 82341, taux: 0.30 },
      { plafond: 177106, taux: 0.41 },
      { plafond: Infinity, taux: 0.45 }
    ];
    let impot = 0, base = 0;
    for (let i = 0; i < tranches.length; i++) {
      const tranche = tranches[i];
      const prevPlafond = i === 0 ? 0 : tranches[i - 1].plafond;
      if (revenuImposable > prevPlafond) {
        const taxable = Math.min(revenuImposable, tranche.plafond) - prevPlafond;
        impot += taxable * tranche.taux;
      }
    }
    return Math.round(impot);
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setSaving(false);
      setSaveMsg("Utilisateur non connecté");
      return;
    }
    const foncierNet = regimeDetails.reduce((sum, reg) => sum + (reg.netImposable || 0), 0);
    const impot = calculerImpot(salary, foncierNet);
    const payload = {
      user_id: session.user.id,
      year,
      salary,
      foncier_net: foncierNet,
      impot_calcule: impot,
      data: { regimeDetails }
    };
    let result;
    if (declarationId) {
      result = await supabase.from('tax_declarations').update(payload).eq('id', declarationId).select();
    } else {
      result = await supabase.from('tax_declarations').insert([payload]).select();
    }
    if (result.error) {
      setSaveMsg("Erreur lors de l'enregistrement : " + result.error.message);
    } else {
      setSaveMsg("Déclaration enregistrée !");
      setImpotCalcule(impot);
      if (result.data && result.data[0]?.id) setDeclarationId(result.data[0].id);
    }
    setSaving(false);
  }

  if (isLoading) return <div>Chargement…</div>;
  return (
    <div className="w-full">
      {/* Sélecteur d'année fiscale */}
      <div className="mb-6 flex items-center gap-3">
        <label htmlFor="year-select" className="uppercase text-xs font-semibold text-gray-600">Année fiscale</label>
        <select
          id="year-select"
          className="border rounded px-2 py-1 text-sm"
          value={year}
          onChange={e => setYear(Number(e.target.value))}
        >
          {selectableYears.map(y => (
            <option value={y} key={y}>{y}</option>
          ))}
        </select>
      </div>
      <h2 className="font-semibold text-xl mb-4">Déclaration fiscale {year}</h2>
      <div className="mb-4">
        <label className="block font-semibold mb-2">Salaire perçu (année {year})</label>
        <Input
          type="number"
          value={salary}
          onChange={e => setSalary(Number(e.target.value))}
          className="max-w-xs"
        />
      </div>
      {regimeDetails.map((reg, idx) => (
        <div key={reg.id} className="border rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-lg mb-2 text-indigo-700">{reg.regime}</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead colSpan={2}>Revenus</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Revenus fonciers perçus</TableCell>
                <TableCell className="text-right">{formatCurrency(reg.revenusFoncier)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Total CSG/CRDS</TableCell>
                <TableCell className="text-right">{formatCurrency(reg.csg)}</TableCell>
              </TableRow>
            </TableBody>
            <TableHeader>
              <TableRow>
                <TableHead colSpan={2}>Charges</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Assurance</TableCell>
                <TableCell className="text-right">{formatCurrency(reg.assurance)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Taxe foncière</TableCell>
                <TableCell className="text-right">{formatCurrency(reg.foncier)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Intérêts d'emprunt</TableCell>
                <TableCell className="text-right">{formatCurrency(reg.interets)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Frais de gestion</TableCell>
                <TableCell className="text-right">{formatCurrency(reg.gestion)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Autres charges</TableCell>
                <TableCell className="text-right">{formatCurrency(reg.autresCharges)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Total charges déductibles</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(reg.totalCharges)}</TableCell>
              </TableRow>
            </TableBody>
            {reg.abattement > 0 && (
              <TableBody>
                <TableRow>
                  <TableCell>Abattement forfaitaire</TableCell>
                  <TableCell className="text-right">{formatCurrency(reg.abattement)}</TableCell>
                </TableRow>
              </TableBody>
            )}
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold">Revenu net imposable à déclarer</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(reg.netImposable)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ))}
      <div className="border rounded-lg p-4 mb-4">
        <h3 className="font-semibold text-lg mb-2 text-indigo-700">Simulation des cases fiscales à remplir</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro de case</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Valeur à reporter</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {casesFiscales.map((c, i) => (
              <TableRow key={c.numero + i}>
                <TableCell>{c.numero}</TableCell>
                <TableCell>{c.label}</TableCell>
                <TableCell className="text-right">{formatCurrency(c.valeur)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Enregistrement..." : "Enregistrer la déclaration"}
        </Button>
        {saveMsg && <span className="text-green-700 font-semibold">{saveMsg}</span>}
      </div>
      {impotCalcule !== null && (
        <Alert className="mt-4">
          <AlertDescription>
            <span className="font-bold">Impôt estimé à payer pour {year} : {formatCurrency(impotCalcule)}</span><br />
            Ce montant est une estimation basée sur le barème progressif (célibataire, hors décote, hors charges de famille).
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
