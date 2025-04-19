'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { useToast } from '@/components/ui/use-toast'
import { LoanModal } from './loan-modal'
import { LoanChart } from './loan-chart'
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
}

export function PropertyLoans({ propertyId }: PropertyLoansProps) {
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
              {loans.map((loan) => (
                <motion.div key={loan.id} variants={itemVariants}>
                  <Card className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-medium">{loan.name}</h3>
                            <Badge className={`mt-1 ${getLoanTypeColor(loan.loan_type)}`}>
                              {loan.loan_type}
                            </Badge>
                          </div>
                          <div className="flex space-x-2">
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleEditLoan(loan.id)}
                              >
                                Modifier
                              </Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-500 hover:text-red-700 border-red-200 hover:border-red-300"
                                onClick={() => handleDeleteLoan(loan.id)}
                              >
                                Supprimer
                              </Button>
                            </motion.div>
                          </div>
                        </div>
                        
                        <Separator className="my-3" />
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                          <div>
                            <p className="text-sm text-gray-500">Montant emprunté</p>
                            <p className="font-medium">{formatCurrency(loan.amount)}</p>
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
                        
                        <div className="grid grid-cols-2 gap-4 mt-3">
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
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </CardContent>
      </Card>

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
