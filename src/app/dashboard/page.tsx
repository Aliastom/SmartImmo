'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Chart from 'chart.js/auto'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { motion } from 'framer-motion'
import { AnimatedCard, PageTransition, LoadingSpinner } from '@/components/ui/animated'
import { LoansSummary } from './components/loans-summary'
import { FinancialForecast } from './components/financial-forecast'

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
      
      // Charger les transactions des 6 derniers mois
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0]
      
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('date', sixMonthsAgoStr)
        .order('date', { ascending: true })
      
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
          monthlyIncome,
          potentialMonthlyIncome,
          occupancyRate,
          rentedCount: rentedProperties.length,
          totalCount: propertiesData.length,
          monthlyExpenses: currentMonthExpenses,
          potentialMonthlyExpenses,
          netProfit,
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
    <PageTransition className="container py-10">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <motion.h1 
            className="text-3xl font-bold"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Tableau de bord
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <Button onClick={() => router.push('/properties')}>
              Ajouter un bien
            </Button>
          </motion.div>
        </div>

        {isLoading ? (
          <LoadingSpinner className="h-64" size={60} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <motion.div
              className="md:col-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatedCard>
                <CardHeader className="pb-2">
                  <CardTitle>Aperçu financier</CardTitle>
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
                            <p className="text-sm text-gray-500">Revenus mensuels</p>
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
                            <p className="text-sm text-gray-500">Dépenses mensuelles</p>
                            <p className="text-2xl font-bold">{formatCurrency(stats.totalExpenses)}</p>
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
              <AnimatedCard delay={0.6}>
                <CardHeader>
                  <CardTitle>Aperçu financier</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 pb-4">
                  <div className="h-80">
                    <canvas ref={chartRef} />
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-600">Revenus</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(stats.monthlyIncome)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-600">Dépenses totales</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(stats.totalExpenses)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-600">Bénéfice net</span>
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
            <AnimatedCard delay={0.7}>
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
  )
}
