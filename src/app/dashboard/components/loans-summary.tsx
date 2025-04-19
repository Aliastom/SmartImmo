'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { useToast } from '@/components/ui/use-toast'
import { motion } from 'framer-motion'
import { LoadingSpinner } from '@/components/ui/animated'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

type Loan = Database['public']['Tables']['loans']['Row']

export function LoansSummary() {
  const supabase = createClientComponentClient<Database>()
  const { toast } = useToast()
  const [loans, setLoans] = useState<Loan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [summary, setSummary] = useState({
    totalMonthlyPayment: 0,
    totalRemainingCapital: 0,
    loanCount: 0
  })

  useEffect(() => {
    fetchLoans()
  }, [])

  const fetchLoans = async () => {
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Récupérer tous les emprunts de l'utilisateur
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', session.user.id)
        .order('start_date', { ascending: false })

      if (error) throw error

      setLoans(data || [])
      
      // Calculer les statistiques
      if (data && data.length > 0) {
        const totalMonthlyPayment = data.reduce((sum, loan) => sum + (loan.monthly_payment || 0), 0)
        const totalRemainingCapital = data.reduce((sum, loan) => sum + (loan.remaining_capital || 0), 0)
        
        setSummary({
          totalMonthlyPayment,
          totalRemainingCapital,
          loanCount: data.length
        })
      }
    } catch (error) {
      console.error('Error fetching loans:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les emprunts",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
  }

  return (
    <>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : loans.length > 0 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Mensualités totales</p>
              <p className="text-2xl font-bold text-blue-700">
                {formatCurrency(summary.totalMonthlyPayment)}
              </p>
              <p className="text-xs text-gray-500 mt-1">par mois</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Capital restant dû</p>
              <p className="text-2xl font-bold text-indigo-700">
                {formatCurrency(summary.totalRemainingCapital)}
              </p>
              <p className="text-xs text-gray-500 mt-1">total</p>
            </div>
          </div>
          <div className="pt-2">
            <p className="text-sm text-gray-500">
              Vous avez {summary.loanCount} emprunt{summary.loanCount > 1 ? 's' : ''} actif{summary.loanCount > 1 ? 's' : ''}.
            </p>
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link 
                href="/properties" 
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                Voir le détail de vos emprunts →
              </Link>
            </motion.div>
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-gray-500 mb-2">Aucun emprunt enregistré</p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              asChild
              className="bg-black hover:bg-black/80 text-white"
            >
              <Link href="/properties">
                <span className="flex items-center">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4 mr-2" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Ajouter un emprunt à un bien
                </span>
              </Link>
            </Button>
          </motion.div>
        </div>
      )}
    </>
  )
}
