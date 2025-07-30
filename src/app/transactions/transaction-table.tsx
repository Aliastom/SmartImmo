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
  filterCategory: string
  filterProperty: string
  filterMonth: string
  filterAccountingMonths: string[]
  filterTransactionKind: string // 'all' | 'income' | 'expense'
  onEdit: (id: string) => void
  onDuplicate: (transaction: Transaction) => void
  refreshTrigger: number
  onTransactionsLoaded?: (transactions: Transaction[]) => void
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
  attachments_count: { count: number }[]
  transaction_type: string
  created_at?: string
  type_data?: { name: string } // <-- ajout ici
}

export function TransactionTable({ searchQuery, filterType, filterCategory, filterProperty, filterMonth, filterAccountingMonths, filterTransactionKind, onEdit, onDuplicate, refreshTrigger, onTransactionsLoaded }: TransactionTableProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
  const [types, setTypes] = useState<{ id: string, name: string }[]>([]);
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

  useEffect(() => {
    async function fetchCategories() {
      try {
        const supabase = createClientComponentClient<Database>()
        const { data, error } = await supabase
          .from('categories')
          .select('id, name')
          .eq('active', true)
        if (!error && data) setCategories(data)
      } catch (e) {}
    }
    fetchCategories()
  }, [])

  useEffect(() => {
    async function fetchTypes() {
      try {
        const supabase = createClientComponentClient<Database>()
        const { data, error } = await supabase
          .from('types')
          .select('id, name')
          .eq('active', true)
        if (!error && data) setTypes(data)
      } catch (e) {}
    }
    fetchTypes()
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
          property:properties(name),
          type_data:types(name),
          attachments_count:transaction_documents(count)
        `)
        .eq('user_id', session.user.id)
        .order('accounting_month', { ascending: false })
        
      if (filterType !== 'all') {
        query = query.eq('type', filterType)
      }
      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory)
      }
      if (filterProperty !== 'all') {
        query = query.eq('property_id', filterProperty)
      }
      // Si un ou plusieurs mois comptables sont sélectionnés, ils sont prioritaires
      if (filterAccountingMonths && filterAccountingMonths.length > 0) {
        query = query.in('accounting_month', filterAccountingMonths)
      } else if (filterMonth && filterMonth !== 'all') {
        // Sinon, filtrer par année
        if (/^\d{4}$/.test(filterMonth)) {
          query = query.ilike('accounting_month', `${filterMonth}-%`)
        } else {
          query = query.eq('accounting_month', filterMonth)
        }
      }
      const safeQuery = searchQuery ? searchQuery.trim().toLowerCase() : '';
      let filteredTransactions: Transaction[] = [];
      const { data, error } = await query;
      if (error) throw error;
      if (searchQuery.trim() !== "") {
        filteredTransactions = (data || []).filter(tx => {
          const descMatch = tx.description?.toLowerCase().includes(safeQuery);
          const propMatch = tx.property?.name?.toLowerCase().includes(safeQuery);
          const dateMatch = tx.date && new Date(tx.date).toLocaleDateString('fr-FR').toLowerCase().includes(safeQuery);
          const monthRaw = tx.accounting_month;
          let monthDisplay = '';
          if (monthRaw && typeof monthRaw === 'string') {
            const [year, month] = monthRaw.split('-');
            if (year && month) {
              const date = new Date(parseInt(year), parseInt(month) - 1);
              monthDisplay = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
            }
          }
          const monthMatch = monthDisplay.toLowerCase().includes(safeQuery) || monthRaw?.toLowerCase().includes(safeQuery);
          const amountMatch = String(tx.amount ?? '').toLowerCase().includes(safeQuery);
          return descMatch || propMatch || dateMatch || monthMatch || amountMatch;
        });
      } else {
        filteredTransactions = data || [];
      }
      // Filtre JS sur le type de transaction (revenu/dépense)
      if (filterTransactionKind !== 'all') {
        filteredTransactions = filteredTransactions.filter(tx => tx.transaction_type === filterTransactionKind);
      }
      // Tri de sécurité pour garantir l’ordre backend (accounting_month DESC, date DESC) même après filtrage JS
      filteredTransactions.sort((a, b) => {
        if (a.accounting_month !== b.accounting_month) {
          return b.accounting_month.localeCompare(a.accounting_month);
        }
        return b.date.localeCompare(a.date);
      });
      setTransactions(filteredTransactions);
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
    loadTransactions();
  }, [searchQuery, filterType, filterCategory, filterProperty, filterMonth, filterAccountingMonths, filterTransactionKind, refreshTrigger]);

  useEffect(() => {
    if (onTransactionsLoaded) {
      onTransactionsLoaded(transactions);
    }
  }, [transactions, onTransactionsLoaded]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR')
  }
  
  const formatAccountingMonth = (accountingMonth: string) => {
    const [year, month] = accountingMonth.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  }
  
  const getCategoryLabelById = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId)?.name || categoryId;
  }

  const getTypeLabelById = (typeId: string) => {
    return types.find(t => t.id === typeId)?.name || typeId;
  }

  // Tri interactif global
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'accounting_month', direction: 'desc' });
  
  function handleSort(column: string) {
    setSortConfig((prev) => {
      if (prev.key === column) {
        return { key: column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key: column, direction: 'asc' };
    });
  }
  
  function compareTransactions(a: Transaction, b: Transaction, key: string, direction: 'asc' | 'desc') {
    let res = 0;
    if (key === 'accounting_month') {
      res = a.accounting_month.localeCompare(b.accounting_month);
    } else if (key === 'date') {
      res = a.date.localeCompare(b.date);
    } else if (key === 'amount') {
      res = Number(a.amount) - Number(b.amount);
    } else if (key === 'category') {
      res = getCategoryLabelById(a.category).localeCompare(getCategoryLabelById(b.category));
    } else if (key === 'type') {
      res = getTypeLabelById(a.type).localeCompare(getTypeLabelById(b.type));
    } else if (key === 'property') {
      res = (a.property?.name || '').localeCompare(b.property?.name || '');
    } else {
      res = String((a as any)[key] ?? '').localeCompare(String((b as any)[key] ?? ''));
    }
    return direction === 'asc' ? res : -res;
  }
  
  const sortedTransactions = [...transactions].sort((a, b) => compareTransactions(a, b, sortConfig.key, sortConfig.direction));

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);

  // Transactions à afficher pour la page courante
  const paginatedTransactions = sortedTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Rendu mobile avec cartes au lieu de tableau
  if (isMobile) {
    return (
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center p-4">Chargement...</div>
        ) : paginatedTransactions.length === 0 ? (
          <div className="text-center p-4 text-gray-500">Aucune transaction trouvée</div>
        ) : (
          paginatedTransactions.map((transaction) => (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-sm text-gray-500">{formatDate(transaction.date)}</div>
                  <div className="font-medium">{getCategoryLabelById(transaction.category)}</div>
                  <div className="text-sm text-gray-500">{getTypeLabelById(transaction.type)}</div>
                </div>
                <div className={`font-medium ${
                  transaction.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.transaction_type === 'income' ? '+' : '-'}
                  {Math.abs(Number(transaction.amount)).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €
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
                  {/* Icône crayon identique à property-transactions */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="hover:bg-gray-100"
                  onClick={() => onDuplicate(transaction)}
                >
                  {/* Icône double-carré (dupliquer) */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
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
      <Table className="table-glass">
        <TableHeader>
          <TableRow>
            <TableHead className="p-3 text-sm font-medium text-gray-500 uppercase cursor-pointer select-none" onClick={() => handleSort('date')}>Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</TableHead>
            <TableHead className="p-3 text-sm font-medium text-gray-500 uppercase cursor-pointer select-none" onClick={() => handleSort('category')}>Catégorie {sortConfig.key === 'category' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</TableHead>
            <TableHead className="p-3 text-sm font-medium text-gray-500 uppercase cursor-pointer select-none" onClick={() => handleSort('type')}>Type {sortConfig.key === 'type' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</TableHead>
            <TableHead className="p-3 text-sm font-medium text-gray-500 uppercase cursor-pointer select-none" onClick={() => handleSort('property')}>Bien {sortConfig.key === 'property' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</TableHead>
            <TableHead className="p-3 text-sm font-medium text-gray-500 uppercase cursor-pointer select-none" onClick={() => handleSort('accounting_month')}>Mois comptable {sortConfig.key === 'accounting_month' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</TableHead>
            <TableHead className="p-3 text-sm font-medium text-gray-500 uppercase text-right cursor-pointer select-none" onClick={() => handleSort('amount')}>Montant {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</TableHead>
            <TableHead className="p-3 text-sm font-medium text-gray-500 uppercase text-right">Pièces jointes</TableHead>
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
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-6">
                <span className="text-gray-400">Chargement...</span>
              </TableCell>
            </TableRow>
          ) : paginatedTransactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-6">
                <span className="text-gray-400">Aucune transaction trouvée.</span>
              </TableCell>
            </TableRow>
          ) : (
            paginatedTransactions.map((transaction) => (
              <TableRow key={transaction.id} onClick={() => onEdit(transaction.id)} style={{ cursor: 'pointer' }}>
                <TableCell>{formatDate(transaction.date)}</TableCell>
                <TableCell>{getCategoryLabelById(transaction.category)}</TableCell>
                <TableCell>{getTypeLabelById(transaction.type)}</TableCell>
                <TableCell>{transaction.property?.name || 'N/A'}</TableCell>
                <TableCell>{formatAccountingMonth(transaction.accounting_month)}</TableCell>
                <TableCell className={`text-right font-medium ${
                  transaction.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.transaction_type === 'income' ? '+' : '-'}
                  {Math.abs(Number(transaction.amount)).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €
                </TableCell>
                <TableCell className="text-right">
                  {/* Badge nombre de PJ */}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${transaction.attachments_count?.[0]?.count > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
                    {transaction.attachments_count?.[0]?.count || 0}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="icon-action hover:bg-gray-100"
                      onClick={e => { e.stopPropagation(); onEdit(transaction.id); }}
                    >
                      {/* Icône crayon identique à property-transactions */}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="icon-action hover:bg-gray-100"
                      onClick={e => { e.stopPropagation(); onDuplicate(transaction); }}
                    >
                      {/* Icône double-carré (dupliquer) */}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="icon-action text-red-600 hover:text-red-800 hover:bg-red-50"
                      onClick={e => { e.stopPropagation(); deleteTransaction(transaction.id); }}
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
      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Précédent
          </Button>
          <span className="text-sm font-medium">
            Page {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  )
}
