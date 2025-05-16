'use client'

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Chart from 'chart.js/auto'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { motion } from 'framer-motion'
import { AnimatedCard, PageTransition } from '@/components/ui/animated'
import { LoansSummary } from './components/loans-summary'
import { FinancialForecast } from './components/financial-forecast'
import { PageHeader } from '@/components/ui/page-header'
import { Plus } from 'lucide-react'
import { PropertyModal } from '../properties/components/property-modal'

// Types pour les données
type Property = Database['public']['Tables']['properties']['Row']
type Transaction = Database['public']['Tables']['transactions']['Row']

export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstanceRef = useRef<Chart | null>(null)
  
  // États pour stocker les données
  const [properties, setProperties] = useState<Property[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loans, setLoans] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalValue: 0,
    monthlyIncome: 0,
    potentialMonthlyIncome: 0,
    occupancyRate: 0,
    rentedCount: 0,
    totalCount: 0,
    monthlyExpenses: 0,
    potentialMonthlyExpenses: 0,
    netProfit: 0,
    potentialNetProfit: 0,
    totalMonthlyLoanPayment: 0,
    totalExpenses: 0
  })
  const [isModalOpen, setIsModalOpen] = useState(false);
const [showPendingModal, setShowPendingModal] = useState(false);

  // --- Hooks pour loyers en attente (résumé) ---
  const [pendingYear, setPendingYear] = useState<string>('');
  const [pendingMonth, setPendingMonth] = useState<string>('');
  const [pendingRents, setPendingRents] = useState<any[]>([]);
  const [totalPendingRents, setTotalPendingRents] = useState<number>(0);

  // Extraction des années/mois disponibles à partir des transactions
  const allMonths: string[] = Array.from(new Set(transactions.map(t => t.accounting_month).filter(Boolean)));
  const allYears: string[] = Array.from(new Set(allMonths.map(m => m.split('-')[0])));

  // Initialisation automatique à la période courante (système) au premier rendu
  const firstRenderRef = useRef(true);
  useEffect(() => {
    if (!allMonths.length) return;
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      const now = new Date();
      const currentYear = String(now.getFullYear());
      const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
      setPendingYear(currentYear);
      setPendingMonth(currentMonth);
    }
  }, [allMonths]);

  // Calcul réactif des loyers en attente (équivalent à la requête SQL)
  useEffect(() => {
    if (!properties || !transactions) return;
    const LOYER_CATEGORY_ID = 'af6a63ad-ba91-44c7-902b-6aeef22c6ef8';
    const pendingRents = (properties || [])
      .filter(property => property.status === 'rented')
      .filter(property => {
        // Pour chaque propriété, vérifie s'il manque une transaction LOYER pour au moins un mois de la période filtrée
        // Si "Tout" est sélectionné, on ignore le filtre correspondant
        const relevantMonths = allMonths.filter(m =>
          (!pendingYear || m.startsWith(pendingYear)) &&
          (!pendingMonth || m.split('-')[1] === pendingMonth)
        );
        return relevantMonths.some(month =>
          !transactions.some(
            t =>
              t.property_id === property.id &&
              t.type?.toString() === LOYER_CATEGORY_ID &&
              t.accounting_month === month
          )
        );
      })
      .map(p => ({
        property_id: p.id,
        property_name: p.name,
        rent: p.rent
      }))
      .sort((a, b) => a.property_name.localeCompare(b.property_name));
    setPendingRents(pendingRents);
    setTotalPendingRents(pendingRents.reduce((sum: number, item: any) => sum + item.rent, 0));
  }, [properties, transactions, pendingYear, pendingMonth]);

  // Fonction pour charger les données
  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/auth/login')
        return
      }
      
      // Charger les propriétés
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      
      if (propertiesError) throw propertiesError
      
      // Charger les transactions de l'année en cours (du 1er janvier à aujourd'hui)
      const now = new Date();
      const currentYear = String(now.getFullYear());

      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('accounting_month', { ascending: true });
      
      if (transactionsError) throw transactionsError
      
      // Charger les emprunts
      const { data: loansData, error: loansError } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', session.user.id)
      
      if (loansError) throw loansError
      
      // Mettre à jour les états
      setProperties(propertiesData || [])
      setTransactions(transactionsData || [])
      setLoans(loansData || [])
      
      // Calculer les statistiques
      if (propertiesData) {
        const totalValue = propertiesData.reduce((sum, property) => sum + (property.value || 0), 0)
        const rentedProperties = propertiesData.filter(property => property.status === 'rented')
        const occupancyRate = propertiesData.length > 0 
          ? (rentedProperties.length / propertiesData.length) * 100 
          : 0
        
        // Revenu = somme des transactions de type 'income' de l'année en cours (via accounting_month)
        const yearIncome = transactionsData
          ? transactionsData.filter(t => t.transaction_type === 'income' && t.accounting_month?.startsWith(currentYear)).reduce((sum, t) => sum + (t.amount || 0), 0)
          : 0;

        // Dépenses = somme des transactions de type 'expense' de l'année en cours (via accounting_month)
        const yearExpenses = transactionsData
          ? transactionsData.filter(t => t.transaction_type === 'expense' && t.accounting_month?.startsWith(currentYear)).reduce((sum, t) => sum + (t.amount || 0), 0)
          : 0;

        // DEBUG : afficher les transactions de dépense filtrées et la somme calculée
        const filteredExpenses = transactionsData
          ? transactionsData.filter(
              t => t.transaction_type === 'expense' && t.accounting_month?.startsWith(currentYear)
            )
          : [];
        console.log('EXPENSES DEBUG:', filteredExpenses, 'SUM:', yearExpenses);

        // Bénéfice = différence entre les deux
        const yearNetProfit = yearIncome - yearExpenses;

        // Calculer le revenu mensuel réel (loyers des propriétés louées)
        const monthlyIncome = rentedProperties.reduce((sum, property) => sum + (property.rent || 0), 0)
        
        // Calculer le revenu mensuel potentiel (loyers de toutes les propriétés)
        const potentialMonthlyIncome = propertiesData.reduce((sum, property) => sum + (property.rent || 0), 0)
        
        // Calculer les dépenses du mois en cours
        const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
        const currentMonthExpenses = transactionsData
          ? transactionsData
              .filter(t => t.type === 'expense' && t.accounting_month === currentMonth)
              .reduce((sum, t) => sum + (t.amount || 0), 0)
          : 0
        
        // Calculer le total des mensualités d'emprunt
        const totalMonthlyLoanPayment = loansData
          ? loansData.reduce((sum, loan) => sum + (loan.monthly_payment || 0), 0)
          : 0
        
        // Calculer les dépenses potentielles (charges fixes + emprunts)
        const fixedExpenses = propertiesData.reduce((sum, property) => {
          // Additionner taxe foncière (mensuelle), charges, assurance
          const monthlyTax = property.property_tax ? property.property_tax / 12 : 0
          const monthlyCharges = property.charges || 0
          const monthlyInsurance = property.insurance || 0
          
          // Frais de gestion (si applicable, généralement un % du loyer)
          const managementFee = property.status === 'rented' && property.management_fee_percentage 
            ? (property.rent * property.management_fee_percentage / 100) 
            : 0
          
          // Provision pour travaux (5% du loyer)
          const maintenanceProvision = property.rent ? property.rent * 0.05 : 0
          
          return sum + monthlyTax + monthlyCharges + monthlyInsurance + managementFee + maintenanceProvision
        }, 0)
        
        const potentialMonthlyExpenses = fixedExpenses + totalMonthlyLoanPayment
        
        // Calculer les dépenses totales (courantes + emprunts)
        const totalExpenses = currentMonthExpenses + totalMonthlyLoanPayment
        
        // Calculer le bénéfice net réel
        const netProfit = monthlyIncome - totalExpenses
        
        // Calculer le bénéfice net potentiel
        const potentialNetProfit = potentialMonthlyIncome - potentialMonthlyExpenses
        
        setStats({
          totalValue,
          // On remplace les valeurs mensuelles par les valeurs cumulées de l'année
          monthlyIncome: yearIncome,
          monthlyExpenses: yearExpenses,
          netProfit: yearNetProfit,
          // On garde les autres stats pour les autres usages
          potentialMonthlyIncome,
          occupancyRate,
          rentedCount: rentedProperties.length,
          totalCount: propertiesData.length,
          potentialMonthlyExpenses,
          potentialNetProfit,
          totalMonthlyLoanPayment,
          totalExpenses
        })
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du tableau de bord",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // Charger les données au chargement de la page
  useEffect(() => {
    loadDashboardData()
  }, [])
  
  // Préparer les données pour le graphique
  useEffect(() => {
    if (!chartRef.current || transactions.length === 0) return
    
    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return
    
    // Détruire le graphique existant s'il y en a un
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
    }
    
    // Organiser les transactions par mois
    const monthlyData = transactions.reduce((acc, transaction) => {
      const month = transaction.accounting_month
      if (!month) return acc
      
      if (!acc[month]) {
        acc[month] = { income: 0, regularExpense: 0, loanPayment: 0, totalExpense: 0 }
      }
      
      if (transaction.type === 'income') {
        acc[month].income += transaction.amount
      } else {
        acc[month].regularExpense += transaction.amount
      }
      
      return acc
    }, {} as Record<string, { income: number, regularExpense: number, loanPayment: number, totalExpense: number }>)
    
    // Ajouter les mensualités d'emprunt aux données mensuelles
    // Nous utilisons la même valeur pour tous les mois pour simplifier
    const totalMonthlyLoanPayment = stats.totalMonthlyLoanPayment
    
    Object.keys(monthlyData).forEach(month => {
      monthlyData[month].loanPayment = totalMonthlyLoanPayment
      monthlyData[month].totalExpense = monthlyData[month].regularExpense + totalMonthlyLoanPayment
    })
    
    // Préparer les données pour le graphique
    const months = Object.keys(monthlyData).sort()
    const incomeData = months.map(month => monthlyData[month].income)
    const regularExpenseData = months.map(month => monthlyData[month].regularExpense)
    const loanPaymentData = months.map(month => monthlyData[month].loanPayment)
    const totalExpenseData = months.map(month => monthlyData[month].totalExpense)
    
    // Formater les noms des mois pour l'affichage
    const monthNames = months.map(month => {
      const [year, monthNum] = month.split('-')
      const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1)
      return date.toLocaleDateString('fr-FR', { month: 'short' })
    })
    
    // Créer le graphique
    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthNames,
        datasets: [
          {
            type: 'line',
            label: 'Revenus',
            data: incomeData,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.1,
            fill: false,
            yAxisID: 'y',
            order: 0
          },
          {
            type: 'bar',
            label: 'Dépenses courantes',
            data: regularExpenseData,
            backgroundColor: 'rgba(239, 68, 68, 0.7)',
            borderColor: 'rgb(239, 68, 68)',
            borderWidth: 1,
            yAxisID: 'y',
            order: 1,
            stack: 'stack0'
          },
          {
            type: 'bar',
            label: 'Mensualités emprunts',
            data: loanPaymentData,
            backgroundColor: 'rgba(139, 92, 246, 0.7)',
            borderColor: 'rgb(139, 92, 246)',
            borderWidth: 1,
            yAxisID: 'y',
            order: 1,
            stack: 'stack0'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR'
                  }).format(context.parsed.y);
                }
                return label;
              }
            }
          },
          legend: {
            position: 'bottom'
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          }
        }
      }
    })
    
    // Cleanup function
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
      }
    }
  }, [transactions, stats.totalMonthlyLoanPayment])
  
  // Formater les montants en euros
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        buttonText="Ajouter un bien"
        buttonIcon={<Plus size={18} />}
        onButtonClick={() => setIsModalOpen(true)}
        className="mb-2 mt-2"
      />
      <PageTransition className="container py-10">
        <div className="mb-4 p-4 rounded-lg border-2 border-yellow-400 bg-yellow-100 shadow-md animate-pulse-slow">
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
    {pendingRents.length > 0 ? (
      <div className="flex items-center gap-3 flex-1">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-lg font-bold text-yellow-900">
          Attention : {pendingRents.length} loyer{pendingRents.length > 1 ? 's' : ''} en attente pour {pendingMonth || 'tous les mois'}/{pendingYear || 'toutes années'}
        </span>
        <button
          onClick={() => setShowPendingModal(true)}
          className="ml-4 px-4 py-2 rounded bg-yellow-500 hover:bg-yellow-600 text-white font-bold text-base shadow focus:outline-none focus:ring-2 focus:ring-yellow-800"
          title="Voir le détail des biens concernés"
          type="button"
        >
          {Number(totalPendingRents).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-2 p-2 rounded bg-green-100 border border-green-300 text-green-700 text-sm font-semibold w-fit">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Aucun loyer en attente
      </div>
    )}
    <div className="flex items-center space-x-2 md:ml-4">
      <label htmlFor="pendingYear" className="text-xs font-medium">Année</label>
      <select
        id="pendingYear"
        value={pendingYear}
        onChange={e => setPendingYear(e.target.value)}
        className="border border-yellow-300 rounded px-2 py-0.5 text-xs bg-white focus:outline-none"
      >
        <option value="">Tout</option>
        {allYears.map(year => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>
      <label htmlFor="pendingMonth" className="text-xs font-medium ml-2">Mois</label>
      <select
        id="pendingMonth"
        value={pendingMonth}
        onChange={e => setPendingMonth(e.target.value)}
        className="border border-yellow-300 rounded px-2 py-0.5 text-xs bg-white focus:outline-none"
      >
        <option value="">Tout</option>
        {Array.from(new Set(allMonths.filter(m => !pendingYear || m.startsWith(pendingYear)).map(m => m.split('-')[1])))
          .sort((a, b) => Number(a) - Number(b))
          .map(month => (
            <option key={month} value={month}>{month}</option>
          ))}
      </select>
    </div>
  </div>

  {/* Modal Loyers en attente */}
  {showPendingModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded shadow-lg max-w-md w-full p-6 relative animate-fade-in">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-xl"
          onClick={() => setShowPendingModal(false)}
          aria-label="Fermer"
        >
          ×
        </button>
        <div className="mb-4 font-semibold text-lg text-yellow-800">
          Biens avec loyer en attente ({pendingMonth || 'tous les mois'}/{pendingYear || 'toutes années'})
        </div>
        {pendingRents.length === 0 ? (
          <div className="text-gray-500 text-sm">Aucun bien concerné pour cette période.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {pendingRents.map(item => (
  <li key={item.property_id} className="py-2 flex justify-between items-center">
    <Link
      href={`/properties/${item.property_id}`}
      className="font-medium text-blue-700 hover:underline focus:outline-none"
      target="_blank"
      rel="noopener noreferrer"
    >
      {item.property_name}
    </Link>
    <span className="text-right text-sm text-gray-600">{Number(item.rent).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
  </li>
))}
          </ul>
        )}
      </div>
    </div>
  )}
</div>
        <div className="space-y-8">
          {isLoading ? (
            <div className="h-64" />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <motion.div
                className="md:col-span-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <AnimatedCard boxShadow={Number.isNaN(stats.monthlyIncome) || Number.isNaN(stats.totalExpenses) || Number.isNaN(stats.netProfit) ? undefined : undefined} delay={0.6}>
                  <CardHeader className="pb-2">
                    <CardTitle>{`Aperçu financier (${new Date().getFullYear()})`}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-1">
                        <div className="flex flex-col space-y-3">
                          <div className="flex items-center">
                            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mr-4">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Revenus</p>
                              <p className="text-2xl font-bold">{formatCurrency(stats.monthlyIncome)}</p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mr-4">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Dépenses</p>
                              <p className="text-2xl font-bold">{formatCurrency(stats.monthlyExpenses)}</p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mr-4">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Bénéfice net</p>
                              <p className="text-2xl font-bold">{formatCurrency(stats.netProfit)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-span-1">
                        <div className="h-full flex flex-col">
                          <div className="flex items-center mb-3">
                            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mr-4">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Valeur du patrimoine</p>
                              <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
                            </div>
                          </div>
                          <div className="flex-1 flex flex-col justify-center">
                            <div className="relative pt-1">
                              <p className="text-sm text-gray-500 mb-1">Taux d'occupation</p>
                              <div className="overflow-hidden h-4 text-xs flex rounded bg-gray-200">
                                <div
                                  style={{ width: `${stats.occupancyRate}%` }}
                                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500"
                                ></div>
                              </div>
                              <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>{stats.rentedCount} bien{stats.rentedCount > 1 ? 's' : ''} loué{stats.rentedCount > 1 ? 's' : ''}</span>
                                <span>{Math.round(stats.occupancyRate)}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </AnimatedCard>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <AnimatedCard delay={0.2}>
                  <CardHeader>
                    <CardTitle>Synthèse des emprunts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LoansSummary />
                  </CardContent>
                </AnimatedCard>
              </motion.div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.3 }}
              >
                <AnimatedCard boxShadow={Number.isNaN(stats.monthlyIncome) || Number.isNaN(stats.totalExpenses) || Number.isNaN(stats.netProfit) ? undefined : undefined} delay={0.6}>
                  <CardHeader>
                    <CardTitle>{`Aperçu financier (${new Date().getFullYear()})`}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 pb-4">
                    <div className="h-80">
                      <canvas ref={chartRef} />
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-600">Revenus mensuels</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(stats.monthlyIncome)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-600">Dépenses mensuelles</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(stats.monthlyExpenses)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-600">Bénéfice mensuel</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(stats.netProfit)}</span>
                    </div>
                  </CardContent>
                </AnimatedCard>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.3 }}
            >
              <AnimatedCard boxShadow={Object.values(stats).some(v => typeof v === 'number' && Number.isNaN(v)) ? undefined : undefined} delay={0.7}>
                <CardHeader>
                  <CardTitle>Prévisions financières</CardTitle>
                </CardHeader>
                <CardContent>
                  <FinancialForecast stats={stats} />
                </CardContent>
              </AnimatedCard>
            </motion.div>
          </div>
        </div>
      </PageTransition>
      <PropertyModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}
