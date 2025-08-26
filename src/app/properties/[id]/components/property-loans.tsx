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
import { computeYearlyInterests } from '../../utils/interest-details';
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
import { Plus } from "lucide-react";
import { Pencil } from "lucide-react";

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
  const [loanShares, setLoanShares] = useState<Record<string, { share: number, count: number }>>({});
  const session = useSession();
  const [isAddHovered, setIsAddHovered] = useState(false);
  const [isEditHovered, setIsEditHovered] = useState(false);

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
    const shares: Record<string, { share: number, count: number }> = {};
    if (!session?.user?.email) {
      setLoanShares(shares);
      return;
    }
    for (const loan of loansList) {
      const { data, error } = await supabase
        .from('loan_co_borrowers')
        .select('co_borrower_id, share, co_borrowers(email)')
        .eq('loan_id', loan.id);
      if (error) {
        console.error('Erreur fetch loan_co_borrowers', error);
      }
      let userShare = 0;
      let userIds = Array.isArray(data) ? data.map(cb => cb.co_borrower_id) : [];
      let sumOthers = 0;
      let hasUserEntry = false;
      if (Array.isArray(data)) {
        data.forEach(cb => {
          // On matche sur l'email du user connecté
          if (cb.co_borrowers && cb.co_borrowers.email === session.user.email) {
            hasUserEntry = true;
            userShare = (typeof cb.share === 'number' ? cb.share : Number(cb.share));
          } else {
            sumOthers += (typeof cb.share === 'number' ? cb.share : Number(cb.share));
          }
        });
      }
      // Si pas d'entrée pour l'utilisateur connecté, il prend le reste
      if (!hasUserEntry && loan.user_id === session.user.id) {
        userShare = 100 - sumOthers;
      }
      // Si toujours 0 (pas dans loan_co_borrowers et pas user_id), part = 0
      shares[loan.id] = { share: userShare / 100, count: userIds.length };
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

  const vignetteMiniStyle = {
    base: 'flex flex-col items-start justify-center rounded-lg px-6 py-4 text-base font-semibold shadow border min-w-[130px] h-[64px] whitespace-nowrap',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  };

  const vignetteHover = {
    rest: { scale: 1, boxShadow: "0 1px 4px 0 rgba(0,0,0,0.06)", y: 0 },
    hover: { scale: 1.07, boxShadow: "0 4px 16px 0 rgba(0,0,0,0.13)", y: -3, transition: { type: "spring", stiffness: 350, damping: 18 } },
  };

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
            <Button
              onClick={handleAddLoan}
              className="btn-glass w-fit btn-animated-yellow ml-4 flex items-center gap-2 px-4 py-2 rounded-lg shadow transition relative group text-base"
              style={{ minWidth: 'fit-content', maxWidth: '320px', overflow: 'hidden', position: 'relative', whiteSpace: 'nowrap' }}
              onMouseEnter={() => setIsAddHovered(true)}
              onMouseLeave={() => setIsAddHovered(false)}
            >
              <span className="btn-animated-yellow-bg absolute inset-0 rounded-lg pointer-events-none transition-transform duration-300 group-hover:scale-100 scale-0 z-0" aria-hidden="true"></span>
              <span className="relative flex items-center z-10 font-semibold">
                <motion.span
                  className="inline-flex items-center"
                  animate={isAddHovered ? "dance" : "idle"}
                  variants={{
                    dance: {
                      rotate: [0, -20, 20, -20, 20, 0],
                      scale: [1, 1.2, 1.1, 1.2, 1],
                      transition: {
                        repeat: Infinity,
                        repeatType: 'loop',
                        duration: 1.2,
                        ease: 'easeInOut',
                      },
                    },
                    idle: {},
                  }}
                >
                  <Plus className="h-5 w-5 mr-2" />
                </motion.span>
                Ajouter un emprunt
              </span>
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
                const part = loanShares[loan.id]?.share ?? 1;
                const coBorrowerCount = loanShares[loan.id]?.count || 1;
                const key = loan?.id ? `loanid-${loan.id}` : `loanidx-${idx}`;
                const totalAmount = Number(loan.amount) || 0;
                const userAmount = totalAmount * part;
                const totalMonthly = Number(loan.monthly_payment) || 0;
                const userMonthly = totalMonthly * part;
                const months = loan.start_date && loan.end_date
                  ? Math.max(1, Math.round((new Date(loan.end_date).getFullYear() - new Date(loan.start_date).getFullYear()) * 12 + (new Date(loan.end_date).getMonth() - new Date(loan.start_date).getMonth()) + 1))
                  : 0;
                const totalPaid = totalMonthly * months;
                const creditCostTotal = totalPaid - totalAmount;
                const creditCost = creditCostTotal * part;
                return (
                  <motion.div key={key} variants={itemVariants}>
                    <Card className="shadow-none border border-gray-200">
                      <CardContent className="pt-4 pb-2">
                        <div className="flex flex-row items-start justify-between w-full mb-2 gap-4">
                          <div className="flex flex-wrap gap-x-2 gap-y-2 items-center max-w-2xl justify-center w-full mx-auto">
                            <motion.div className={`${vignetteMiniStyle.base} ${vignetteMiniStyle.green}`} variants={vignetteHover} initial="rest" whileHover="hover" animate="rest">
                              <span className="font-normal">Votre part</span>
                              <span className="font-bold text-sm">{formatCurrency(userAmount)}<span className="text-gray-500 font-normal"> / {formatCurrency(totalAmount)}</span></span>
                            </motion.div>
                            {creditCost > 0 && (
                              <motion.div className={`${vignetteMiniStyle.base} ${vignetteMiniStyle.red}`} variants={vignetteHover} initial="rest" whileHover="hover" animate="rest">
                                <span className="font-normal">Coût crédit</span>
                                <span className="font-bold text-sm">{formatCurrency(creditCost)}<span className="text-gray-500 font-normal"> / {formatCurrency(creditCostTotal)}</span></span>
                              </motion.div>
                            )}
                            <motion.div className={`${vignetteMiniStyle.base} ${vignetteMiniStyle.blue}`} variants={vignetteHover} initial="rest" whileHover="hover" animate="rest">
                              <span className="font-normal">Mensualité</span>
                              <span className="font-bold text-sm">{formatCurrency(userMonthly)}<span className="text-gray-500 font-normal"> / {formatCurrency(totalMonthly)}</span></span>
                            </motion.div>
                            <motion.div className={`${vignetteMiniStyle.base} ${vignetteMiniStyle.purple}`} variants={vignetteHover} initial="rest" whileHover="hover" animate="rest">
                              <span className="font-normal">Capital restant</span>
                              <span className="font-bold text-sm">{formatCurrency((Number(loan.remaining_capital) || 0) * part)}<span className="text-gray-500 font-normal"> / {formatCurrency(Number(loan.remaining_capital) || 0)}</span></span>
                            </motion.div>
                            <motion.div className={`${vignetteMiniStyle.base} ${vignetteMiniStyle.gray}`} variants={vignetteHover} initial="rest" whileHover="hover" animate="rest">
                              <span className="font-normal">Taux</span>
                              <span className="font-bold text-sm">{loan.interest_rate}%</span>
                            </motion.div>
                            <motion.div className={`${vignetteMiniStyle.base} ${vignetteMiniStyle.yellow}`} variants={vignetteHover} initial="rest" whileHover="hover" animate="rest">
                              <span className="font-normal">Durée</span>
                              <span className="font-bold text-sm">{months} mois</span>
                            </motion.div>
                          </div>
                          <div className="flex flex-col items-end min-w-[140px]">
                            <Button
                              onClick={() => handleEditLoan(loan.id)}
                              className="btn-glass w-fit btn-animated-yellow mt-0 flex items-center gap-2 px-4 py-2 rounded-lg shadow transition relative group text-base"
                              style={{ minWidth: 'fit-content', maxWidth: '320px', overflow: 'hidden', position: 'relative', whiteSpace: 'nowrap' }}
                              onMouseEnter={() => setIsEditHovered(true)}
                              onMouseLeave={() => setIsEditHovered(false)}
                            >
                              <span className="btn-animated-yellow-bg absolute inset-0 rounded-lg pointer-events-none transition-transform duration-300 group-hover:scale-100 scale-0 z-0" aria-hidden="true"></span>
                              <span className="relative flex items-center z-10 font-semibold">
                                <motion.span
                                  animate={isEditHovered ? "dance" : "idle"}
                                  variants={{
                                    dance: {
                                      rotate: [0, -20, 20, -20, 20, 0],
                                      scale: [1, 1.2, 1.1, 1.2, 1],
                                      transition: {
                                        repeat: Infinity,
                                        repeatType: 'loop',
                                        duration: 1.2,
                                        ease: 'easeInOut',
                                      },
                                    },
                                    idle: {},
                                  }}
                                  className="inline-flex items-center"
                                >
                                  <Pencil className="h-5 w-5 mr-2" />
                                </motion.span>
                                Modifier l'emprunt
                              </span>
                            </Button>
                            <span className="mt-2 text-xs text-gray-400">(à {coBorrowerCount} personne{coBorrowerCount > 1 ? 's' : ''})</span>
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
                        <LoanChart
                          amount={userAmount}
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
