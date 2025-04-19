'use client'

import { useState, useEffect } from 'react'
import { TaxSummaryCard } from './tax-summary-card'
import { TaxFormTabular } from './tax-form-tabular'
import { TaxVisualization } from './tax-visualization'
import { TaxDetails } from './tax-details'
import { TaxAdvice } from './tax-advice'
import { TaxSimulation } from './tax-simulation'
import { ProjectionDetails } from './projection-details'
import { TaxDeclarationSummary } from './tax-declaration-summary' // Importer le nouveau composant
import calculateTax from './tax-calculator'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { FinancialData, TaxEstimationData, TaxProjectionData, TaxSummaryData } from './types'
import { motion } from 'framer-motion'
import { PageTransition, LoadingSpinner } from '@/components/ui/animated'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export default function ImpotsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()
  const [isLoading, setIsLoading] = useState(true)
  
  const [financialData, setFinancialData] = useState<FinancialData>({
    currentSalary: 0,
    projectedSalary: 0,
    currentRentalIncome: 0,
    projectedRentalIncome: 0,
    currentCharges: 0,
    projectedCharges: 0,
    currentPropertyTax: 0,
    projectedPropertyTax: 0,
    currentMaintenance: 0,
    projectedMaintenance: 0,
    currentInsurance: 0,
    projectedInsurance: 0,
    currentLoanInterest: 0,
    projectedLoanInterest: 0,
    currentManagementFees: 0,
    projectedManagementFees: 0,
    currentPer: 0,
    projectedPer: 0,
    children: 0,
    situation: 'single' as 'single' | 'couple' | 'family'
  })

  const [regimeDetails, setRegimeDetails] = useState<any[]>([])

  // --- Variables globales pour accès projection ---
  const [propertiesState, setPropertiesState] = useState<any[]>([])
  const [regimeGroupsState, setRegimeGroupsState] = useState<any>({})

  // Charger les données fiscales de l'utilisateur
  useEffect(() => {
    async function loadTaxData() {
      try {
        setIsLoading(true)
        
        // Vérifier l'authentification
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/auth/login')
          return
        }
        
        // Récupérer le profil fiscal de l'utilisateur pour l'année en cours
        const currentYear = new Date().getFullYear()
        const { data: taxProfile, error: taxProfileError } = await supabase
          .from('tax_profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('fiscal_year', currentYear)
          .single()
        
        if (taxProfileError && taxProfileError.code !== 'PGRST116') {
          // PGRST116 est l'erreur "No rows returned" - c'est normal si l'utilisateur n'a pas encore de profil fiscal
          console.error('Erreur lors du chargement du profil fiscal:', taxProfileError)
          toast({
            title: "Erreur",
            description: "Impossible de charger votre profil fiscal",
            variant: "destructive"
          })
        }
        
        // Charger les propriétés de l'utilisateur AVEC leur régime fiscal
        const { data: properties, error: propertiesError } = await supabase
          .from('properties')
          .select('*, property_regimes(*)')
          .eq('user_id', session.user.id)
        setPropertiesState(properties || [])
        
        if (propertiesError) {
          console.error('Erreur lors du chargement des propriétés:', propertiesError)
        }
        
        // Regrouper les propriétés par régime fiscal
        let regimeGroups: { [regimeId: string]: any[] } = {}
        if (properties && properties.length > 0) {
          for (const property of properties) {
            const regimeId = property.property_regime_id || 'aucun';
            if (!regimeGroups[regimeId]) regimeGroups[regimeId] = [];
            regimeGroups[regimeId].push(property);
          }
        }
        setRegimeGroupsState(regimeGroups)
        
        // Calculer les totaux des charges récurrentes
        // On prépare un regroupement par régime fiscal
        let totalPropertyTax = 0
        let totalHousingTax = 0
        let totalInsurance = 0
        let totalLoanInterest = 0
        let totalManagementFees = 0
        if (properties && properties.length > 0) {
          // Regrouper les propriétés par régime fiscal
          for (const property of properties) {
            const regimeId = property.property_regime_id || 'aucun';
            if (!regimeGroups[regimeId]) regimeGroups[regimeId] = [];
            regimeGroups[regimeId].push(property);
          }
          // Calculs globaux (tous régimes confondus)
          totalPropertyTax = properties.reduce((sum, property) => sum + (property.property_tax || 0), 0)
          totalHousingTax = properties.reduce((sum, property) => sum + (property.housing_tax || 0), 0)
          totalInsurance = properties.reduce((sum, property) => sum + (property.insurance || 0), 0)
          totalLoanInterest = properties.reduce((sum, property) => sum + (property.loan_interest || 0), 0)
          totalManagementFees = properties.reduce((sum, property) => sum + (property.management_fees || 0), 0)
        }
        
        // Calculer les revenus locatifs actuels
        const { data: transactions, error: transactionsError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('type', 'income')
          .gte('accounting_month', `${currentYear}-01`)
          .lte('accounting_month', `${currentYear}-12`)
        
        if (transactionsError) {
          console.error('Erreur lors du chargement des transactions:', transactionsError)
        }
        
        // Calculer les revenus locatifs actuels PAR REGIME
        // (on pourra ensuite spécialiser les calculs selon le régime)
        let rentalIncomeByRegime: { [regimeId: string]: number } = {}
        if (properties && properties.length > 0 && transactions) {
          for (const property of properties) {
            const regimeId = property.property_regime_id || 'aucun';
            rentalIncomeByRegime[regimeId] = (rentalIncomeByRegime[regimeId] || 0) +
              transactions.filter(t => t.property_id === property.id).reduce((sum, t) => sum + t.amount, 0)
          }
        }
        
        // Calculer les revenus locatifs projetés pour le reste de l'année
        let projectedRentalIncome = 0
        for (const regimeId in rentalIncomeByRegime) {
          projectedRentalIncome += rentalIncomeByRegime[regimeId]
        }
        
        // === CALCUL PAR REGIME FISCAL ===
        let regimeDetailsArr: any[] = [];
        if (properties && properties.length > 0) {
          for (const regimeId in regimeGroups) {
            const group = regimeGroups[regimeId];
            const regime = group[0]?.property_regimes || null;
            // Calculer revenus et charges pour ce groupe
            const revenus = group.reduce((sum, p) => sum + (rentalIncomeByRegime[regimeId] || 0), 0);
            const charges = group.reduce((sum, p) => sum + (p.property_tax || 0) + (p.insurance || 0) + (p.loan_interest || 0) + (p.management_fees || 0), 0);
            // Appliquer abattement ou déduction réelle
            let abattement = 0;
            let netImposable = revenus;
            if (regime?.flat_deduction) {
              // Ex: 30% -> micro-foncier, 50% -> micro-BIC
              const percent = parseFloat(regime.flat_deduction.replace('%','')) / 100;
              abattement = revenus * percent;
              netImposable = revenus - abattement;
            } else if (regime?.real_expenses_deduction) {
              netImposable = revenus - charges;
            }
            regimeDetailsArr.push({
              id: regimeId,
              regime: regime?.name || 'Aucun',
              revenus,
              charges,
              abattement,
              netImposable,
              detail: [] // Sécurise ProjectionDetails
            });
          }
        }
        setRegimeDetails(Array.isArray(regimeDetailsArr) ? regimeDetailsArr : []);
        
        // TODO: Appliquer ici les règles fiscales propres à chaque régime
        // (Exemple: abattement 30% micro-foncier, charges réelles, etc.)
        // Passer rentalIncomeByRegime et regimeGroups aux composants de calcul/simulation
        
        // Mettre à jour les données financières
        const updatedFinancialData: FinancialData = {
          currentSalary: taxProfile?.salary_income || 0,
          projectedSalary: taxProfile?.salary_income || 0,
          currentRentalIncome: Object.values(rentalIncomeByRegime).reduce((sum, value) => sum + value, 0),
          projectedRentalIncome,
          currentCharges: totalPropertyTax + totalHousingTax + totalInsurance + totalLoanInterest + totalManagementFees,
          projectedCharges: (totalPropertyTax + totalHousingTax + totalInsurance + totalLoanInterest + totalManagementFees) * 2, // Estimation pour l'année
          currentPropertyTax: totalPropertyTax,
          projectedPropertyTax: totalPropertyTax * 2, // Estimation pour l'année
          currentMaintenance: 0, // À calculer à partir des transactions
          projectedMaintenance: 0, // Estimation pour l'année
          currentInsurance: totalInsurance,
          projectedInsurance: totalInsurance * 2, // Estimation pour l'année
          currentLoanInterest: totalLoanInterest,
          projectedLoanInterest: totalLoanInterest * 2, // Estimation pour l'année
          currentManagementFees: totalManagementFees,
          projectedManagementFees: totalManagementFees * 2, // Estimation pour l'année
          currentPer: taxProfile?.retirement_savings || 0,
          projectedPer: taxProfile?.retirement_savings || 0,
          children: taxProfile?.number_of_children || 0,
          situation: (taxProfile?.tax_situation as 'single' | 'couple' | 'family') || 'single'
        }
        
        setFinancialData(updatedFinancialData)
        setIsLoading(false)
      } catch (error) {
        console.error('Erreur lors du chargement des données fiscales:', error)
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors du chargement de vos données fiscales",
          variant: "destructive"
        })
        setRegimeDetails([]);
        setIsLoading(false)
      }
    }
    
    loadTaxData()
  }, [supabase, router, toast])

  useEffect(() => {
    // Cette logique suppose que les données projetées (revenus/charges futurs) sont déjà calculées dans loadTaxData
    // Ici on extrait le "reste à percevoir/payer" pour chaque régime
    if (!isLoading && Object.keys(regimeGroupsState).length > 0 && propertiesState.length > 0) {
      let details: any[] = [];
      for (const regimeId in regimeGroupsState) {
        const group = regimeGroupsState[regimeId];
        const regime = group[0]?.property_regimes || null;
        // Calcul du reste à percevoir/payer
        let revenusRestants = 0;
        let chargesRestantes = 0;
        let detailRows: any[] = [];
        for (const property of group) {
          // Loyers futurs (projection)
          const loyerFutur = (property.projected_rent || 0) - (property.current_rent || 0);
          revenusRestants += loyerFutur;
          detailRows.push({ label: `Loyers à percevoir – ${property.name || property.id}`, montant: loyerFutur });
          // Charges futures (projection)
          const chargesFutures = (property.projected_charges || 0) - (property.current_charges || 0);
          chargesRestantes += chargesFutures;
          detailRows.push({ label: `Charges à payer – ${property.name || property.id}`, montant: chargesFutures });
        }
        // Appliquer abattement ou déduction réelle
        let abattement = 0;
        let netImposable = revenusRestants;
        if (regime?.flat_deduction) {
          const percent = parseFloat(regime.flat_deduction.replace('%','')) / 100;
          abattement = revenusRestants * percent;
          netImposable = revenusRestants - abattement;
        } else if (regime?.real_expenses_deduction) {
          netImposable = revenusRestants - chargesRestantes;
        }
        details.push({
          id: regimeId,
          regime: regime?.name || 'Aucun',
          revenusRestants,
          chargesRestantes,
          abattement,
          netImposable,
          detail: detailRows
        });
      }
    }
  }, [isLoading, regimeGroupsState, propertiesState]);

  // Sauvegarder les données fiscales lorsqu'elles sont modifiées
  const saveTaxProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      const currentYear = new Date().getFullYear()
      
      // Vérifier si un profil fiscal existe déjà pour cette année
      const { data: existingProfile, error: checkError } = await supabase
        .from('tax_profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('fiscal_year', currentYear)
        .single()
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Erreur lors de la vérification du profil fiscal:', checkError)
        return
      }
      
      const taxProfileData = {
        user_id: session.user.id,
        fiscal_year: currentYear,
        salary_income: financialData.projectedSalary,
        rental_income: financialData.projectedRentalIncome,
        loan_interests: financialData.projectedLoanInterest,
        retirement_savings: financialData.projectedPer,
        number_of_children: financialData.children,
        tax_situation: financialData.situation,
        updated_at: new Date().toISOString()
      }
      
      if (existingProfile) {
        // Mettre à jour le profil existant
        const { error: updateError } = await supabase
          .from('tax_profiles')
          .update(taxProfileData)
          .eq('id', existingProfile.id)
        
        if (updateError) {
          console.error('Erreur lors de la mise à jour du profil fiscal:', updateError)
          toast({
            title: "Erreur",
            description: "Impossible de mettre à jour votre profil fiscal",
            variant: "destructive"
          })
        }
      } else {
        // Créer un nouveau profil
        const { error: insertError } = await supabase
          .from('tax_profiles')
          .insert({
            ...taxProfileData,
            created_at: new Date().toISOString()
          })
        
        if (insertError) {
          console.error('Erreur lors de la création du profil fiscal:', insertError)
          toast({
            title: "Erreur",
            description: "Impossible de créer votre profil fiscal",
            variant: "destructive"
          })
        }
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du profil fiscal:', error)
    }
  }
  
  // --- Gestion édition automatique/projection ---
  // On garde une trace des champs projection édités manuellement
  const [editedProjectionFields, setEditedProjectionFields] = useState<{[key:string]: boolean}>({})

  // Helper pour mettre à jour le state et détecter si projection éditée
  const handleDataChange = (field: string, value: number | string) => {
    setFinancialData(prev => {
      const newData = { ...prev, [field]: value };
      // Si on modifie un champ projection, on note qu'il est édité à la main
      if (field.startsWith('projected')) {
        setEditedProjectionFields(e => ({ ...e, [field]: true }));
      }
      // Si on modifie un champ actuel, on recalcule la projection si elle n'a pas été éditée
      if (field.startsWith('current')) {
        const base = field.replace('current', 'projected');
        if (!editedProjectionFields[base]) {
          // Par défaut, on additionne déjà perçu + estimation du reste (exemple simple)
          // Ici on suppose qu'il existe une estimation annuelle (ex: annualRentalIncome)
          if (base in newData && ('annual'+base.slice(8)) in newData) {
            newData[base] = (value as number) + (newData['annual'+base.slice(8)] as number - (value as number));
          } else {
            // Sinon, on recopie la valeur actuelle
            newData[base] = value;
          }
        }
      }
      return newData;
    });
    
    // Sauvegarder automatiquement les modifications après un court délai
    const debounceTimer = setTimeout(() => {
      saveTaxProfile()
    }, 1000)
    
    return () => clearTimeout(debounceTimer)
  }

  // Calcul des charges déductibles pour l'année en cours
  const currentDeductibleCharges = 
    financialData.currentCharges + 
    financialData.currentPer
  
  // Calcul des charges déductibles projetées pour la fin de l'année
  const projectedDeductibleCharges = 
    financialData.projectedCharges + 
    financialData.projectedPer
  
  // Calcul de l'impôt pour l'année en cours
  const currentTaxData = calculateTax(
    financialData.currentSalary,
    financialData.currentRentalIncome,
    currentDeductibleCharges,
    financialData.currentPer,
    financialData.children,
    financialData.situation
  )

  const projectedTaxData = calculateTax(
    financialData.projectedSalary,
    financialData.projectedRentalIncome,
    projectedDeductibleCharges,
    financialData.projectedPer,
    financialData.children,
    financialData.situation
  )

  // Calcul des prélèvements sociaux (17.2% sur les revenus fonciers)
  const currentSocialTax = Math.max(0, financialData.currentRentalIncome - financialData.currentCharges) * 0.172
  const projectedSocialTax = Math.max(0, financialData.projectedRentalIncome - financialData.projectedCharges) * 0.172

  // Données pour les cartes de résumé
  const financialSummary: TaxSummaryData = {
    annualIncome: financialData.projectedSalary,
    rentalIncome: financialData.projectedRentalIncome,
    rentalCharges: financialData.projectedCharges,
    savings: financialData.projectedPer
  }

  const currentEstimation: TaxEstimationData = {
    estimatedTax: currentTaxData.tax,
    effectiveRate: currentTaxData.effectiveRate,
    taxableIncome: currentTaxData.taxableIncome,
    socialTax: Math.round(currentSocialTax),
    totalTax: Math.round(currentTaxData.tax + currentSocialTax)
  }

  const projectedEstimation: TaxProjectionData = {
    projectedTax: projectedTaxData.tax,
    difference: projectedTaxData.tax - currentTaxData.tax,
    projectedRate: projectedTaxData.effectiveRate,
    projectedSocialTax: Math.round(projectedSocialTax),
    projectedTotalTax: Math.round(projectedTaxData.tax + projectedSocialTax)
  }

  // --- Calcul amélioré pour la projection (total estimé à fin d'année) ---
  // Hypothèses : année civile, revenus/charges réguliers, projection = déjà perçu + (mensuel × mois restants)
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const monthsInYear = 12;
  const monthsLeft = monthsInYear - currentMonth;

  // Helper pour calculer un total annuel estimé à partir du déjà perçu et d'un montant mensuel
  function estimateAnnualTotal(alreadyReceived: number, monthly: number) {
    return alreadyReceived + monthly * monthsLeft;
  }

  // Exemple : on suppose que l'utilisateur a déjà perçu X, et que le montant mensuel est X / mois passés
  const monthlyRentalIncome = currentMonth > 0 ? (financialData.currentRentalIncome || 0) / currentMonth : 0;
  const monthlySalary = currentMonth > 0 ? (financialData.currentSalary || 0) / currentMonth : 0;
  const monthlyPropertyTax = currentMonth > 0 ? (financialData.currentPropertyTax || 0) / currentMonth : 0;
  const monthlyMaintenance = currentMonth > 0 ? (financialData.currentMaintenance || 0) / currentMonth : 0;
  const monthlyInsurance = currentMonth > 0 ? (financialData.currentInsurance || 0) / currentMonth : 0;
  const monthlyLoanInterest = currentMonth > 0 ? (financialData.currentLoanInterest || 0) / currentMonth : 0;
  const monthlyManagementFees = currentMonth > 0 ? (financialData.currentManagementFees || 0) / currentMonth : 0;
  const monthlyPer = currentMonth > 0 ? (financialData.currentPer || 0) / currentMonth : 0;

  const autoProjectionValues = {
    projectedSalary: Math.round(estimateAnnualTotal(financialData.currentSalary || 0, monthlySalary)),
    projectedRentalIncome: Math.round(estimateAnnualTotal(financialData.currentRentalIncome || 0, monthlyRentalIncome)),
    projectedPropertyTax: Math.round(estimateAnnualTotal(financialData.currentPropertyTax || 0, monthlyPropertyTax)),
    projectedMaintenance: Math.round(estimateAnnualTotal(financialData.currentMaintenance || 0, monthlyMaintenance)),
    projectedInsurance: Math.round(estimateAnnualTotal(financialData.currentInsurance || 0, monthlyInsurance)),
    projectedLoanInterest: Math.round(estimateAnnualTotal(financialData.currentLoanInterest || 0, monthlyLoanInterest)),
    projectedManagementFees: Math.round(estimateAnnualTotal(financialData.currentManagementFees || 0, monthlyManagementFees)),
    projectedPer: Math.round(estimateAnnualTotal(financialData.currentPer || 0, monthlyPer)),
  };

  // --- Préparation du détail du calcul pour chaque champ projection (pour TaxFormTabular) ---
  const projectionDetailsTabular = {
    projectedSalary: `${financialData.currentSalary || 0} € déjà perçu + ${Math.round(monthlySalary)} €/mois × ${monthsLeft} mois restants`,
    projectedRentalIncome: `${financialData.currentRentalIncome || 0} € déjà perçu + ${Math.round(monthlyRentalIncome)} €/mois × ${monthsLeft} mois restants`,
    projectedPropertyTax: `${financialData.currentPropertyTax || 0} € déjà payé + ${Math.round(monthlyPropertyTax)} €/mois × ${monthsLeft} mois restants`,
    projectedMaintenance: `${financialData.currentMaintenance || 0} € déjà payé + ${Math.round(monthlyMaintenance)} €/mois × ${monthsLeft} mois restants`,
    projectedInsurance: `${financialData.currentInsurance || 0} € déjà payé + ${Math.round(monthlyInsurance)} €/mois × ${monthsLeft} mois restants`,
    projectedLoanInterest: `${financialData.currentLoanInterest || 0} € déjà payé + ${Math.round(monthlyLoanInterest)} €/mois × ${monthsLeft} mois restants`,
    projectedManagementFees: `${financialData.currentManagementFees || 0} € déjà payé + ${Math.round(monthlyManagementFees)} €/mois × ${monthsLeft} mois restants`,
    projectedPer: `${financialData.currentPer || 0} € déjà versé + ${Math.round(monthlyPer)} €/mois × ${monthsLeft} mois restants`,
  };

  // --- Gestion du reset d'un champ projection (remettre la valeur auto) ---
  const handleResetProjectionField = (field: string) => {
    setFinancialData(prev => ({ ...prev, [field]: autoProjectionValues[field] }));
    setEditedProjectionFields(prev => ({ ...prev, [field]: false }));
  };

  return (
    <PageTransition className="container py-10">
      <Tabs defaultValue="declaration" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="declaration">Déclaration fiscale</TabsTrigger>
          <TabsTrigger value="etat-actuel">État actuel</TabsTrigger>
          <TabsTrigger value="projection">Projection fin d'année</TabsTrigger>
          <TabsTrigger value="conseil">Conseil</TabsTrigger>
        </TabsList>
        <TabsContent value="declaration">
          <div className="space-y-8">
            <TaxDeclarationSummary />
          </div>
        </TabsContent>
        <TabsContent value="etat-actuel">
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <TaxSummaryCard title="État financier" icon="wallet" data={financialSummary} />
              <TaxSummaryCard title="Estimation à date" icon="calculator" data={currentEstimation} />
              <TaxSummaryCard title="Simulation fin d'année" icon="chart-line" data={projectedEstimation} />
            </div>
            <div className="overflow-x-auto">
              <TaxFormTabular data={financialData} onChange={handleDataChange} mode="actuel" />
            </div>
            <TaxVisualization currentData={currentTaxData} projectedData={projectedTaxData} financialData={financialData} />
            <TaxDetails currentTaxData={currentTaxData} projectedTaxData={projectedTaxData} financialData={financialData} regimeDetails={regimeDetails} />
          </div>
        </TabsContent>
        <TabsContent value="projection">
          <div className="space-y-8">
            <TaxFormTabular
              data={financialData}
              onChange={handleDataChange}
              mode="projection"
              autoValues={autoProjectionValues}
              details={projectionDetailsTabular}
              onResetField={handleResetProjectionField}
            />
            <TaxSimulation financialData={financialData} />
            <ProjectionDetails projectionDetails={regimeDetails ?? []} />
          </div>
        </TabsContent>
        <TabsContent value="conseil">
          <div className="space-y-8">
            <TaxAdvice 
              currentTaxData={currentTaxData}
              projectedTaxData={projectedTaxData}
              financialData={financialData}
            />
          </div>
        </TabsContent>
      </Tabs>
    </PageTransition>
  )
}
