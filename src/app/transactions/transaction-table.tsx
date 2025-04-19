'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { useEffect, useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { motion } from 'framer-motion'

interface TransactionTableProps {
  searchQuery: string
  filterType: string
  onEdit: (id: string) => void
  onDuplicate: (transaction: Transaction) => void
  refreshTrigger: number
}

interface Transaction {
  id: string
  property_id: string
  type: string
  category: string
  amount: number
  date: string
  accounting_month: string
  description: string | null
  property: {
    name: string
  } | null
}

export function TransactionTable({ searchQuery, filterType, onEdit, onDuplicate, refreshTrigger }: TransactionTableProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()

  // Détecter la taille de l'écran
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkIfMobile()
    window.addEventListener('resize', checkIfMobile)
    
    return () => {
      window.removeEventListener('resize', checkIfMobile)
    }
  }, [])

  const loadTransactions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast({
          title: "Session expirée",
          description: "Votre session a expiré. Veuillez vous reconnecter.",
          variant: "destructive"
        })
        return
      }

      let query = supabase
        .from('transactions')
        .select(`
          *,
          property:properties(name)
        `)
        .eq('user_id', session.user.id)
        .order('date', { ascending: false })

      if (filterType !== 'all') {
        query = query.eq('type', filterType)
      }

      if (searchQuery) {
        query = query.or(`description.ilike.%${searchQuery}%,property.name.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query

      if (error) throw error

      setTransactions(data || [])
    } catch (error: any) {
      console.error('Error:', error)
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const deleteTransaction = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette transaction ? Cette action est irréversible.")) {
      return
    }
    
    try {
      setIsDeleting(true)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast({
          title: "Session expirée",
          description: "Votre session a expiré. Veuillez vous reconnecter.",
          variant: "destructive"
        })
        return
      }
      
      // Vérifier que la transaction appartient à l'utilisateur
      const { data: transaction, error: checkError } = await supabase
        .from('transactions')
        .select('user_id')
        .eq('id', id)
        .single()
      
      if (checkError) {
        throw checkError
      }
      
      if (transaction.user_id !== session.user.id) {
        throw new Error("Vous n'êtes pas autorisé à supprimer cette transaction")
      }
      
      // Utiliser l'API REST directe pour la suppression (comme pour l'ajout/modification)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/transactions?id=eq.${id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            'Prefer': 'return=minimal'
          }
        }
      )
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Erreur lors de la suppression: ${response.status} ${errorData.message || 'Erreur inconnue'}`)
      }
      
      // Mettre à jour l'état local
      setTransactions(prev => prev.filter(t => t.id !== id))
      
      toast({
        title: "Transaction supprimée",
        description: "La transaction a été supprimée avec succès."
      })
    } catch (error: any) {
      console.error('Error:', error)
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la suppression",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }
  
  useEffect(() => {
    loadTransactions()
  }, [refreshTrigger, filterType, searchQuery])
  
  const formatAmount = (amount: number, type: string) => {
    const formattedAmount = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
    return type === 'income' ? `+${formattedAmount}` : `-${formattedAmount}`
  }
  
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR')
  }
  
  const formatAccountingMonth = (accountingMonth: string) => {
    const [year, month] = accountingMonth.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  }
  
  const getCategoryLabel = (category: string) => {
    const categories: Record<string, string> = {
      'rent': 'Loyer',
      'maintenance': 'Entretien',
      'tax': 'Taxes',
      'insurance': 'Assurance',
      'utility': 'Charges',
      'other': 'Autre'
    }
    return categories[category] || category
  }

  // Rendu mobile avec cartes au lieu de tableau
  if (isMobile) {
    return (
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center p-4">Chargement...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center p-4 text-gray-500">Aucune transaction trouvée</div>
        ) : (
          transactions.map((transaction) => (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-sm text-gray-500">{formatDate(transaction.date)}</div>
                  <div className="font-medium">{getCategoryLabel(transaction.category)}</div>
                </div>
                <div className={`font-medium ${
                  transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatAmount(transaction.amount, transaction.type)}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>
                  <div className="text-gray-500 uppercase text-xs">Bien</div>
                  <div>{transaction.property?.name || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-gray-500 uppercase text-xs">Mois comptable</div>
                  <div>{formatAccountingMonth(transaction.accounting_month)}</div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-2 border-t pt-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="hover:bg-gray-100"
                  onClick={() => onEdit(transaction.id)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="hover:bg-gray-100"
                  onClick={() => onDuplicate(transaction)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                  onClick={() => deleteTransaction(transaction.id)}
                  disabled={isDeleting}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    );
  }

  // Rendu desktop avec tableau
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="p-3 text-sm font-medium text-gray-500 uppercase">Date</TableHead>
            <TableHead className="p-3 text-sm font-medium text-gray-500 uppercase">Catégorie</TableHead>
            <TableHead className="p-3 text-sm font-medium text-gray-500 uppercase">Bien</TableHead>
            <TableHead className="p-3 text-sm font-medium text-gray-500 uppercase">Mois comptable</TableHead>
            <TableHead className="p-3 text-sm font-medium text-gray-500 uppercase text-right">Montant</TableHead>
            <TableHead className="p-3 text-sm font-medium text-gray-500 uppercase text-right">
              <div className="flex items-center space-x-2 justify-end">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
                <span>Actions</span>
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-gray-500">
                Aucune transaction trouvée
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{formatDate(transaction.date)}</TableCell>
                <TableCell>{getCategoryLabel(transaction.category)}</TableCell>
                <TableCell>{transaction.property?.name || 'N/A'}</TableCell>
                <TableCell>{formatAccountingMonth(transaction.accounting_month)}</TableCell>
                <TableCell className={`text-right font-medium ${
                  transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatAmount(transaction.amount, transaction.type)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="hover:bg-gray-100"
                      onClick={() => onEdit(transaction.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="hover:bg-gray-100"
                      onClick={() => onDuplicate(transaction)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      onClick={() => deleteTransaction(transaction.id)}
                      disabled={isDeleting}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
