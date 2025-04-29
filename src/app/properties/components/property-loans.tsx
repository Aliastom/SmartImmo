'use client'

import { useSession } from '@supabase/auth-helpers-react';
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
  const [loanShares, setLoanShares] = useState<Record<string, { share: number, count: number, coBorrowers: any[] }>>({});
  const session = useSession();

  useEffect(() => {
    if (session?.user && loans.length > 0) {
      fetchShares(loans);
    }
  }, [session?.user, loans]);

  const fetchLoans = async () => {
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      try {
        const { data, error } = await supabase
          .from('loans')
          .select('*')
          .eq('property_id', propertyId)
          .order('start_date', { ascending: false })

        if (error) {
          console.error('Error fetching loans:', error)
          setLoans([])
          return
        }

        setLoans(data || [])
      } catch (e) {
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

  const fetchShares = async (loansList: any[]) => {
    const shares: Record<string, { share: number, count: number, coBorrowers: any[] }> = {};
    for (const loan of loansList) {
      const { data, count, error } = await supabase
        .from('loan_co_borrowers')
        .select('co_borrower_id, share', { count: 'exact', head: false })
        .eq('loan_id', loan.id);
      if (error) {
        console.error('Erreur fetch loan_co_borrowers', error);
      }
      const userIds = Array.isArray(data) ? data.map(cb => cb.co_borrower_id) : [];
      if (loan.user_id && !userIds.includes(loan.user_id)) {
        userIds.push(loan.user_id);
      }
      console.log(`[RESULTAT NB EMPRUNTEURS pour ${loan.id}]`, userIds.length, userIds);
      shares[loan.id] = { share: 0, count: userIds.length, coBorrowers: data };
    }
    setLoanShares(shares);
  };

  const totalLoanAmount = loans.reduce((sum, loan) => sum + (Number(loan.amount) || 0), 0)
  const apport = purchasePrice !== undefined ? Math.max(0, purchasePrice - totalLoanAmount) : null

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

  function getUserShare(
    loan: any,
    coBorrowers: { co_borrower_id: string; share: number }[],
    userId: string
  ): number {
    console.log('[DEBUG getUserShare] userId:', userId, 'coBorrowers:', coBorrowers);
    const coBorrower = coBorrowers.find(cb => cb.co_borrower_id === userId);
    if (coBorrower && typeof coBorrower.share === 'number') {
      return coBorrower.share / 100;
    }
    const totalCoBorrowerShare = coBorrowers.reduce((sum, cb) => sum + (cb.share || 0), 0);
    return Math.max(0, 1 - totalCoBorrowerShare / 100);
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
              {loans.map((loan, idx) => {
                const part = 1;
                const coBorrowerCount = loanShares[loan.id]?.count || 1;
                const key = loan?.id ? `loanid-${loan.id}` : `loanidx-${idx}`;
                const monthly = (Number(loan.monthly_payment) || 0) * part;
                const months = loan.start_date && loan.end_date
                  ? Math.max(1, Math.round((new Date(loan.end_date).getFullYear() - new Date(loan.start_date).getFullYear()) * 12 + (new Date(loan.end_date).getMonth() - new Date(loan.start_date).getMonth()) + 1))
                  : 0;
                const totalPaid = monthly * months;
                const creditCost = totalPaid - ((Number(loan.amount) || 0) * part);
                const coBorrowers = loanShares[loan.id]?.coBorrowers || [];
                const userId = session?.user?.id;
                const userShare = userId ? getUserShare(loan, coBorrowers, userId) : 1;

                const montantUser = (Number(loan.amount) || 0) * userShare;
                const mensualiteUser = (Number(loan.monthly_payment) || 0) * userShare;
                const capitalRestantUser = (Number(loan.remaining_capital) || 0) * userShare;

                return (
                  <motion.div key={key} variants={itemVariants}>
                    <Card className="shadow-none border border-gray-200">
                      <CardContent className="pt-4 pb-2">
                        <div className="flex flex-col gap-1">
                          <span className="inline-block px-2 py-1 rounded bg-green-50 text-green-700 font-semibold text-xs border border-green-200 shadow-sm">
                            Montant emprunté : <span className="ml-1 font-bold text-base">{formatCurrency(Number(loan.amount) || 0)}</span>
                          </span>
                          <span className="inline-block px-2 py-1 rounded bg-blue-50 text-blue-700 font-semibold text-xs border border-blue-200 shadow-sm animate-fade-in">
                            Votre part : <span className="ml-1 font-bold text-base">{formatCurrency(montantUser)}</span> ({(userShare * 100).toFixed(0)}%)
                          </span>
                          <span className="ml-2 mt-1">
                            <Button variant="outline" size="icon" title="Modifier l'emprunt" onClick={() => handleEditLoan(loan.id)}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13h3l8-8a2.828 2.828 0 10-4-4l-8 8v3z" />
                              </svg>
                            </Button>
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 mt-2">
                          <span className="text-sm text-gray-500">Mensualité globale : <span className="font-medium">{formatCurrency(Number(loan.monthly_payment) || 0)}</span></span>
                          <span className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 mt-1 animate-fade-in">Votre mensualité : <span className="font-semibold">{formatCurrency(mensualiteUser)}</span></span>
                        </div>
                        <div className="flex flex-col gap-1 mt-2">
                          <span className="text-sm text-gray-500">Capital restant dû : <span className="font-medium">{formatCurrency(Number(loan.remaining_capital) || 0)}</span></span>
                          <span className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 mt-1 animate-fade-in">Votre capital restant : <span className="font-semibold">{formatCurrency(capitalRestantUser)}</span></span>
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
                        <LoanChart
                          amount={Number(loan.amount) * part || 0}
                          interestRate={Number(loan.interest_rate) || 0}
                          insuranceRate={Number(loan.insurance_rate) || 0}
                          startDate={loan.start_date}
                          endDate={loan.end_date}
                          monthlyPayment={Number(loan.monthly_payment) * part || 0}
                          remainingCapital={Number(loan.remaining_capital) * part || 0}
                          paymentDay={loan.payment_day ?? null}
                        />
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
