'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { useToast } from "@/components/ui/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"

interface PropertyTransactionsProps {
  propertyId: string
  onAddTransaction: () => void
  onDuplicateTransaction: (transaction: any) => void
  onEditTransaction?: (transactionId: string) => void
  onDeleteTransaction?: (transactionId: string) => void
  refreshTrigger?: number
}

interface Transaction {
  id: string
  type: string
  category: string
  amount: number
  date: string
  description: string | null
  accounting_month: string
  attachments_count: { count: number }[]
  property?: {
    name: string
  }
}

export function PropertyTransactions({ propertyId, onAddTransaction, onDuplicateTransaction, onEditTransaction, onDeleteTransaction, refreshTrigger = 0 }: PropertyTransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()

  const [transactionsTypes, setTransactionsTypes] = useState<any[]>([]);
  useEffect(() => {
    async function fetchTypes() {
      const { data, error } = await supabase.from('types').select('*');
      if (!error && data) setTransactionsTypes(data);
    }
    fetchTypes();
  }, []);

  const [transactionsCategories, setTransactionsCategories] = useState<any[]>([]);
  useEffect(() => {
    async function fetchCategories() {
      const { data, error } = await supabase.from('categories').select('*');
      if (!error && data) setTransactionsCategories(data);
    }
    fetchCategories();
  }, []);

  const loadTransactions = async () => {
    try {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast({
          title: "Session expirée",
          description: "Veuillez vous reconnecter",
          variant: "destructive"
        })
        return
      }

      const { data, error } = await supabase
        .from('transactions')
        .select(`*, property:properties(id, name), attachments_count:transaction_documents(count)`)
        .eq('property_id', propertyId)
        .eq('user_id', session.user.id)
        .order('date', { ascending: false })

      if (error) throw error

      setTransactions(data || [])
    } catch (error: any) {
      console.error('Error loading transactions:', error)
      toast({
        title: "Erreur",
        description: error.message || "Impossible de charger les transactions",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions()
  }, [propertyId, refreshTrigger])

  // Classement par date d'ajout DESC (plus récent en haut), stricte sur created_at si dispo
  const sortedTransactions = [...transactions].sort((a, b) => {
    // created_at DESC prioritaire, sinon date DESC
    if (a.created_at && b.created_at) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Utilise la même logique que la page principale pour afficher le montant correctement
  const getTransactionType = (transaction: any) => {
    // transaction.transaction_type est déjà présent si tu utilises la même structure
    if (transaction.transaction_type) return transaction.transaction_type;
    // fallback pour compatibilité
    const typeObj = (transactionsTypes || []).find((t: any) => t.id === transaction.type);
    // Peut être 'income' ou 'expense' selon la table types
    return typeObj?.direction || typeObj?.type || '';
  };
  const formatAmount = (amount: number, transaction: any) => {
    const transactionType = getTransactionType(transaction);
    const formattedAmount = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(amount));
    return transactionType === 'income' ? `+${formattedAmount}` : `-${formattedAmount}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR')
  }

  const getCategoryLabel = (categoryId: string) => {
    const catObj = (transactionsCategories || []).find((c: any) => c.id === categoryId);
    return catObj?.name || categoryId;
  }

  const getTypeLabel = (typeId: string) => {
    const typeObj = (transactionsTypes || []).find((t: any) => t.id === typeId);
    return typeObj?.name || typeId;
  };

  const formatAccountingMonth = (accountingMonth: string) => {
    // Format YYYY-MM en MM/YYYY
    const [year, month] = accountingMonth.split('-')
    return `${month}/${year}`
  }

  // Calculer les totaux CORRECTEMENT selon le type réel (income/expense)
  const totals = transactions.reduce((acc, transaction) => {
    const type = getTransactionType(transaction);
    if (type === 'income') {
      acc.income += Number(transaction.amount);
    } else if (type === 'expense') {
      acc.expense += Number(transaction.amount);
    }
    return acc;
  }, { income: 0, expense: 0 });

  const balance = totals.income - totals.expense

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Transactions</CardTitle>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button onClick={onAddTransaction} className="bg-black hover:bg-black/80 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Ajouter une transaction
          </Button>
        </motion.div>
      </CardHeader>
      <CardContent>
        {/* Cartes totaux (identiques à la page principale) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card className="bg-green-50">
            <CardContent className="py-4">
              <div className="text-xs font-semibold text-green-700 mb-1">+ Revenus</div>
              <div className="text-2xl font-bold text-green-800">{totals.income.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
          <Card className="bg-red-50">
            <CardContent className="py-4">
              <div className="text-xs font-semibold text-red-700 mb-1">- Dépenses</div>
              <div className="text-2xl font-bold text-red-800">{totals.expense.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50">
            <CardContent className="py-4">
              <div className="text-xs font-semibold text-orange-700 mb-1">∑ Bilan</div>
              <div className="text-2xl font-bold text-orange-800">{(totals.income - totals.expense).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
        </div>
        {isLoading ? (
          <motion.div 
            className="text-center py-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </motion.div>
        ) : sortedTransactions.length === 0 ? (
          <motion.div 
            className="text-center py-8 text-gray-500"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-2M8 9h.01" />
            </svg>
            <p>Aucune transaction pour ce bien</p>
          </motion.div>
        ) : (
          <motion.div 
            className="overflow-x-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="p-3 text-sm font-medium text-gray-500 uppercase">
                    <div className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                      </svg>
                      <span>Date</span>
                    </div>
                  </TableHead>
                  <TableHead className="p-3 text-sm font-medium text-gray-500 uppercase">
                    <div className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span>Catégorie</span>
                    </div>
                  </TableHead>
                  <TableHead className="p-3 text-sm font-medium text-gray-500 uppercase">
                    <div className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span>Type</span>
                    </div>
                  </TableHead>
                  <TableHead className="p-3 text-sm font-medium text-gray-500 uppercase">
                    <div className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                      </svg>
                      <span>Mois comptable</span>
                    </div>
                  </TableHead>
                  <TableHead className="p-3 text-sm font-medium text-gray-500 uppercase">
                    <div className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 0118 0 9 9 0 01-18 0z" />
                      </svg>
                      <span>Nombre de PJ</span>
                    </div>
                  </TableHead>
                  <TableHead className="p-3 text-sm font-medium text-gray-500 uppercase text-right">
                    <div className="flex items-center space-x-2 justify-end">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Montant</span>
                    </div>
                  </TableHead>
                  {(onEditTransaction || onDeleteTransaction) && (
                    <TableHead className="p-3 text-sm font-medium text-gray-500 uppercase text-right">
                      <div className="flex items-center space-x-2 justify-end">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                        </svg>
                        <span>Actions</span>
                      </div>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {sortedTransactions.map((transaction, index) => (
                    <motion.tr
                      key={transaction.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="border-b transition-colors hover:bg-gray-50"
                    >
                      <TableCell>{formatDate(transaction.date)}</TableCell>
                      <TableCell>{getCategoryLabel(transaction.category)}</TableCell>
                      <TableCell>{getTypeLabel(transaction.type)}</TableCell>
                      <TableCell>{transaction.accounting_month ? formatAccountingMonth(transaction.accounting_month) : '-'}</TableCell>
                      <TableCell>
                        {/* Badge nombre de PJ */}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${transaction.attachments_count?.[0]?.count > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
                          {transaction.attachments_count?.[0]?.count || 0}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${getTransactionType(transaction) === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {formatAmount(transaction.amount, transaction)}
                      </TableCell>
                      {(onEditTransaction || onDeleteTransaction) && (
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            {onEditTransaction && (
                              <Button 
                                onClick={() => onEditTransaction(transaction.id)} 
                                variant="ghost" 
                                size="sm"
                                className="hover:bg-gray-100"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </Button>
                            )}
                            {onDuplicateTransaction && (
                              <Button 
                                onClick={() => onDuplicateTransaction(transaction)} 
                                variant="ghost" 
                                size="sm"
                                className="hover:bg-gray-100"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </Button>
                            )}
                            {onDeleteTransaction && (
                              <Button 
                                onClick={() => onDeleteTransaction(transaction.id)}
                                variant="ghost" 
                                size="sm"
                                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}
