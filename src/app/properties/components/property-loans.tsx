'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { useToast } from '@/components/ui/use-toast'
import { LoanModal } from './loan-modal'
import { LoanChart } from './loan-chart'
import { InterestDetailsTable } from './interest-details-table';
import { computeYearlyInterests } from '../utils/interest-details';
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

type Loan = Database['public']['Tables']['loans']['Row']

interface PropertyLoansProps {
  propertyId: string
  purchasePrice?: number
}

export function PropertyLoans({ propertyId, purchasePrice }: PropertyLoansProps) {
  const supabase = createClientComponentClient<Database>()
  const { toast } = useToast()
  const [loans, setLoans] = useState<Loan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false)
  const [selectedLoanId, setSelectedLoanId] = useState<string | undefined>(undefined)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [loanToDelete, setLoanToDelete] = useState<string | null>(null)

  const fetchLoans = async () => {
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      try {
        // Tenter de récupérer les emprunts
        const { data, error } = await supabase
          .from('loans')
          .select('*')
          .eq('property_id', propertyId)
          .eq('user_id', session.user.id)
          .order('start_date', { ascending: false })

        if (error) {
          console.error('Error fetching loans:', error)
          setLoans([])
          return
        }

        setLoans(data || [])
      } catch (e) {
        // Gérer le cas où la table n'existe pas encore
        console.error('Error fetching loans (table might not exist yet):', e)
        setLoans([])
      }
    } catch (error) {
      console.error('Error fetching loans:', error)
      toast({
        title: "Information",
        description: "La fonctionnalité de gestion des emprunts sera bientôt disponible.",
        variant: "default"
      })
      setLoans([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLoans()
  }, [propertyId, supabase])

  // Calcule l'apport initial
  const totalLoanAmount = loans.reduce((sum, loan) => sum + (Number(loan.amount) || 0), 0)
  const apport = purchasePrice !== undefined ? Math.max(0, purchasePrice - totalLoanAmount) : null

  // Détermination de la période à afficher
  const minYear = loans.length > 0 ? Math.min(...loans.map(l => l.start_date ? new Date(l.start_date).getFullYear() : 2100)) : new Date().getFullYear();
  const maxYear = loans.length > 0 ? Math.max(...loans.map(l => l.end_date ? new Date(l.end_date).getFullYear() : 1900)) : new Date().getFullYear();
  const interestTableData = computeYearlyInterests(loans, minYear, maxYear);

  const handleAddLoan = () => {
    setSelectedLoanId(undefined)
    setIsLoanModalOpen(true)
  }

  const handleEditLoan = (loanId: string) => {
    setSelectedLoanId(loanId)
    setIsLoanModalOpen(true)
  }

  const handleDeleteLoan = (loanId: string) => {
    setLoanToDelete(loanId)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteLoan = async () => {
    if (!loanToDelete) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase
        .from('loans')
        .delete()
        .eq('id', loanToDelete)
        .eq('user_id', session.user.id)

      if (error) throw error

      toast({
        title: "Prêt supprimé",
        description: "Le prêt a été supprimé avec succès"
      })

      fetchLoans()
    } catch (error) {
      console.error('Error deleting loan:', error)
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le prêt",
        variant: "destructive"
      })
    } finally {
      setIsDeleteDialogOpen(false)
      setLoanToDelete(null)
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '0 €'
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(amount)
  }

  const getLoanTypeColor = (loanType: string) => {
    switch (loanType) {
      case 'Prêt immobilier':
        return 'bg-blue-100 text-blue-800'
      case 'Prêt travaux':
        return 'bg-green-100 text-green-800'
      case 'Prêt personnel':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 }
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Emprunts rattachés</CardTitle>
            <CardDescription>Gérez les emprunts liés à ce bien immobilier</CardDescription>
            {purchasePrice !== undefined && (
              <div className="mt-2 p-2 rounded bg-gray-50 text-sm">
                <span>Apport initial calculé : </span>
                <span className="font-bold">{apport?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</span>
                <span className="text-gray-500 text-xs ml-2">(Prix d'achat {purchasePrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })} - Crédit {totalLoanAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })})</span>
              </div>
            )}
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={handleAddLoan} className="bg-black hover:bg-black/80 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Ajouter un emprunt
            </Button>
          </motion.div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : loans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Aucun emprunt n'est rattaché à ce bien.</p>
              <p className="text-sm mt-2">Cliquez sur "Ajouter un emprunt" pour en créer un.</p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {loans.map((loan) => {
                // Calcul du coût total du crédit
                const monthly = Number(loan.monthly_payment) || 0;
                const months = loan.start_date && loan.end_date
                  ? Math.max(1, Math.round((new Date(loan.end_date).getFullYear() - new Date(loan.start_date).getFullYear()) * 12 + (new Date(loan.end_date).getMonth() - new Date(loan.start_date).getMonth()) + 1))
                  : 0;
                const totalPaid = monthly * months;
                const creditCost = totalPaid - (Number(loan.amount) || 0);
                return (
                  <motion.div key={loan.id} variants={itemVariants}>
                    <Card className="shadow-none border border-gray-200">
                      <CardContent className="pt-4 pb-2">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div>
                            <div className="mt-1 flex items-center gap-1">
                              <span className="inline-block px-2 py-1 rounded bg-green-50 text-green-700 font-semibold text-xs border border-green-200 shadow-sm">
                                Montant emprunté&nbsp;:
                                <span className="ml-1 font-bold text-base">
                                  {formatCurrency(loan.amount)}
                                </span>
                              </span>
                              <Button variant="outline" size="icon" className="ml-2" title="Modifier l'emprunt" onClick={() => handleEditLoan(loan.id)}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13h3l8-8a2.828 2.828 0 10-4-4l-8 8v3z" />
                                </svg>
                              </Button>
                            </div>
                            {creditCost > 0 && (
                              <div className="mt-1 flex items-center gap-1">
                                <span className="inline-block px-2 py-1 rounded bg-red-50 text-red-700 font-semibold text-xs border border-red-200 shadow-sm">
                                  Coût total du crédit&nbsp;:
                                  <span className="ml-1 font-bold text-base">
                                    {creditCost.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                                  </span>
                                </span>
                                <span className="ml-2 text-xs text-gray-400" title="Intérêts payés sur toute la durée du prêt (hors assurance)">(intérêts sur {months} mois)</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Taux d'intérêt</p>
                            <p className="font-medium">{loan.interest_rate}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Mensualité</p>
                            <p className="font-medium">{formatCurrency(loan.monthly_payment)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Capital restant</p>
                            <p className="font-medium">{formatCurrency(loan.remaining_capital)}</p>
                          </div>
                        </div>
                        <Separator className="my-3" />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                          <div>
                            <p className="text-sm text-gray-500">Date de début</p>
                            <p className="font-medium">
                              {loan.start_date ? format(new Date(loan.start_date), 'dd MMMM yyyy', { locale: fr }) : '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Date de fin</p>
                            <p className="font-medium">
                              {loan.end_date ? format(new Date(loan.end_date), 'dd MMMM yyyy', { locale: fr }) : '—'}
                            </p>
                          </div>
                        </div>
                        {loan.notes && (
                          <div className="mt-3">
                            <p className="text-sm text-gray-500">Notes</p>
                            <p className="text-sm mt-1">{loan.notes}</p>
                          </div>
                        )}
                        {/* Graphique prévisionnel */}
                        {loan.monthly_payment && loan.amount && loan.interest_rate && (
                          <LoanChart 
                            amount={loan.amount}
                            interestRate={loan.interest_rate}
                            insuranceRate={loan.insurance_rate}
                            startDate={loan.start_date}
                            endDate={loan.end_date}
                            monthlyPayment={loan.monthly_payment}
                            remainingCapital={loan.remaining_capital}
                            paymentDay={loan.payment_day ?? null}
                          />
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </CardContent>
      </Card>

      <InterestDetailsTable data={interestTableData} />

      <LoanModal
        isOpen={isLoanModalOpen}
        onClose={() => setIsLoanModalOpen(false)}
        propertyId={propertyId}
        loanId={selectedLoanId}
        onSuccess={fetchLoans}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cet emprunt ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'emprunt sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteLoan} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
