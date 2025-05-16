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
import { SimpleCsvModal, mapCsvRowToTransaction } from './simple-csv-modal';
import React from "react"
import { CardContent as CardContentUI } from "@/components/ui/card";
import { Plus, TrendingUp, TrendingDown, Sigma, Search, Filter, Eraser } from 'lucide-react';
import { AnimatedCard } from '@/components/ui/animated';
import TransactionModal from "../../../transactions/transaction-modal";
import { TransactionTable } from "../../../transactions/transaction-table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface PropertyTransactionsProps {
  property: any
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
    airbnb_listing_url: string
  }
}

export function PropertyTransactions({ property, propertyId, onAddTransaction, onDuplicateTransaction, onEditTransaction, onDeleteTransaction, refreshTrigger = 0 }: PropertyTransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()

  const [transactionsTypes, setTransactionsTypes] = useState<any[]>([]);
  useEffect(() => {
    async function fetchTypes() {
      const { data, error } = await supabase.from('types').select('*').eq('visible', true);
      if (!error && data) setTransactionsTypes(data);
    }
    fetchTypes();
  }, []);

  const [transactionsCategories, setTransactionsCategories] = useState<any[]>([]);
  useEffect(() => {
    async function fetchCategories() {
      const { data, error } = await supabase.from('categories').select('*').eq('visible', true);
      if (!error && data) setTransactionsCategories(data);
    }
    fetchCategories();
  }, []);

  const [isImportCsvModalOpen, setIsImportCsvModalOpen] = useState(false);

  // --- Déclare getTransactionType AVANT toute utilisation dans le code ---
  const getTransactionType = (transaction: any) => {
    // transaction.transaction_type est déjà présent si tu utilises la même structure
    if (transaction.transaction_type) return transaction.transaction_type;
    // fallback pour compatibilité
    const typeObj = (transactionsTypes || []).find((t: any) => t.id === transaction.type);
    // Peut être 'income' ou 'expense' selon la table types
    return typeObj?.direction || typeObj?.type || '';
  };

  // --- Filtres combinés, initialisation en haut du composant ---
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState(''); // Ajout de filterYear
  const [searchQuery, setSearchQuery] = useState("");

  const [isImportHovered, setIsImportHovered] = useState(false)
  const [isAddHovered, setIsAddHovered] = useState(false)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | undefined>(undefined)
  const [transactionToClone, setTransactionToClone] = useState<any | undefined>(undefined)
  const [categories, setCategories] = useState<{ id: string, name: string }[]>([])
  const [types, setTypes] = useState<{ id: string, name: string }[]>([])
  const [refreshTriggerLocal, setRefreshTriggerLocal] = useState(0)
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    async function fetchFilters() {
      try {
        const supabase = (await import('@supabase/auth-helpers-nextjs')).createClientComponentClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const [{ data: cat }, { data: typ }] = await Promise.all([
          supabase.from('categories').select('id, name').eq('active', true),
          supabase.from('types').select('id, name').eq('active', true)
        ])
        setCategories(cat || [])
        setTypes(typ || [])
      } catch (e) {}
    }
    fetchFilters()
  }, [])

  useEffect(() => {
    if (filterCategory === 'all') {
      async function fetchAllTypes() {
        try {
          const supabase = (await import('@supabase/auth-helpers-nextjs')).createClientComponentClient()
          const { data: typ } = await supabase.from('types').select('id, name').eq('active', true)
          setTypes(typ || [])
        } catch {}
      }
      fetchAllTypes()
    } else {
      async function fetchTypesForCategory() {
        try {
          const supabase = (await import('@supabase/auth-helpers-nextjs')).createClientComponentClient()
          const { data: typ } = await supabase.from('types').select('id, name').eq('active', true).eq('category_id', filterCategory)
          setTypes(typ || [])
        } catch {}
      }
      fetchTypesForCategory()
    }
    setFilterType('all')
  }, [filterCategory])

  // Fonction utilitaire pour vérifier un UUID
  function isValidUUID(uuid: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
  }

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

      let query = supabase
        .from('transactions')
        .select(`*, property:properties(id, name, airbnb_listing_url), attachments_count:transaction_documents(count)`)
        .eq('property_id', propertyId)
        .eq('user_id', session.user.id)
        .order('date', { ascending: false })

      const safeQuery = searchQuery ? searchQuery.trim().toLowerCase() : '';
      let filteredTransactions: Transaction[] = [];
      const { data, error } = await query;
      if (error) throw error;
      if (safeQuery.length > 0) {
        filteredTransactions = (data || []).filter(tx => {
          const descMatch = tx.description?.toLowerCase().includes(safeQuery);
          const propMatch = tx.property?.name?.toLowerCase().includes(safeQuery);
          return descMatch || propMatch;
        });
      } else {
        filteredTransactions = data || [];
      }
      setTransactions(filteredTransactions);
      console.log('Transactions récupérées (data):', filteredTransactions)
    } catch (error: any) {
      // Journaliser l'erreur de façon plus lisible
      console.error('Erreur lors du chargement des transactions :', JSON.stringify(error));
      // Message d'erreur plus robuste
      let description = "Impossible de charger les transactions";
      if (error?.message) {
        description = error.message;
      } else if (typeof error === "string") {
        description = error;
      } else if (error && Object.keys(error).length > 0) {
        description = JSON.stringify(error);
      }
      toast({
        title: "Erreur",
        description,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isValidUUID(propertyId)) {
      loadTransactions();
    }
    // Sinon, on ne fait rien (évite l'erreur sur "new")
  }, [propertyId]);

  // Classement par date d'ajout DESC (plus récent en haut), stricte sur created_at si dispo
  const sortedTransactions = [...transactions].sort((a, b) => {
    // created_at DESC prioritaire, sinon date DESC
    if (a.created_at && b.created_at) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Filtre sur l'année du mois comptable
  const filteredTransactions = sortedTransactions.filter(t => !filterYear || t.accounting_month?.slice(0, 4) === filterYear);

  // Filtrage combiné dynamique pour les vignettes
  const filteredVignetteTransactions = sortedTransactions.filter(t => {
    const matchCategory = filterCategory === 'all' || t.category === filterCategory;
    const matchType = filterType === 'all' || getTransactionType(t) === filterType;
    const matchMonth = filterMonth === 'all' || t.accounting_month?.slice(0, 4) === filterMonth;
    const matchSearch = searchQuery.trim() === '' || (
      (t.description?.toLowerCase().includes(searchQuery.trim().toLowerCase()) || '') ||
      (t.property?.name?.toLowerCase().includes(searchQuery.trim().toLowerCase()) || '')
    );
    return matchCategory && matchType && matchMonth && matchSearch;
  });

  // Utilise la même logique que la page principale pour afficher le montant correctement
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
  const totalIncome = filteredVignetteTransactions
    .filter(transaction => getTransactionType(transaction) === 'income')
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const totalExpense = filteredVignetteTransactions
    .filter(transaction => getTransactionType(transaction) === 'expense')
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const balance = totalIncome - totalExpense;

  // Handler d'import CSV Airbnb
  const handleImportAirbnbCsv = async (csvData: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      // MAPPING STRICT : utilise uniquement les champs validés par l'utilisateur
      const userId = session.user.id;
      const typeId = "af6a63ad-ba91-44c7-902b-6aeef22c6ef8";
      const categoryId = "4c0c22b4-c7b7-4930-a102-8a0d5cbc0f4f";
      const propertyIdFixed = propertyId; // ou property.id
      const toInsert = csvData.map((row: any) => mapCsvRowToTransaction(row, {
        userId,
        propertyId: propertyIdFixed,
        typeId,
        categoryId
      }));
      const { error } = await supabase
        .from('transactions')
        .insert(toInsert);
      if (error) throw error;
      toast({
        title: "Succès",
        description: "Les transactions ont été importées avec succès",
      });
      loadTransactions();
    } catch (error: any) {
      console.error('Error importing transactions:', error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'import",
        variant: "destructive"
      });
    } finally {
      setIsImportCsvModalOpen(false);
    }
  };

  const [isButtonHovered, setIsButtonHovered] = useState(false);

  const hasActiveFilters = (
    searchQuery.trim() !== '' ||
    filterCategory !== 'all' ||
    filterType !== 'all' ||
    filterMonth !== 'all'
  );

  function resetFilters() {
    setSearchQuery('');
    setFilterCategory('all');
    setFilterType('all');
    setFilterMonth('all');
  }

  const handleEdit = (id: string) => {
    setSelectedTransactionId(id)
    setTransactionToClone(undefined)
    setIsModalOpen(true)
  }
  const handleDuplicate = (transaction: any) => {
    setSelectedTransactionId(undefined)
    setTransactionToClone(transaction)
    setIsModalOpen(true)
  }
  const handleModalClose = (saved?: boolean) => {
    setIsModalOpen(false)
    setSelectedTransactionId(undefined)
    setTransactionToClone(undefined)
    if (saved) {
      setRefreshTriggerLocal(prev => prev + 1)
    }
  }
  const handleTransactionsLoaded = (transactions: any[]) => {
    const yearsFromTx = Array.from(new Set(transactions.map(t => Number(t.accounting_month?.slice(0, 4))))).filter(Boolean);
    setAvailableYears(prevYears => {
      const allYears = Array.from(new Set([...prevYears, ...yearsFromTx])).sort((a, b) => b - a);
      if (JSON.stringify(prevYears) !== JSON.stringify(allYears)) {
        return allYears;
      }
      return prevYears;
    });
  };

  return (
    <div className="transactions-bg min-h-screen flex flex-col px-8 md:px-16">
      {/* Espace au-dessus du panel recherche/filtres */}
      <div className="mt-6" />
      {/* Panel recherche/filtres + bouton aligné à droite */}
      <div className="flex flex-row items-center gap-4 bg-white/80 rounded-xl p-4 shadow mb-2">
        <div className="flex-1 flex flex-wrap items-center gap-2 min-w-0">
          <div className="relative flex items-center" style={{ minWidth: '240px', maxWidth: '340px', flex: '1 1 240px' }}>
            <span className="input-search-icon text-blue-400">
              <Search size={20} strokeWidth={2} />
            </span>
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-glass input-search pr-4 py-2 w-full"
              style={{ minWidth: '100%', maxWidth: '100%' }}
            />
          </div>
          <span className="text-gray-500 flex items-center gap-1 min-w-max">
            <Filter className="text-blue-400" size={20} strokeWidth={2} /> Filtrer :
          </span>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="input-glass min-w-[140px]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="input-glass min-w-[110px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous types</SelectItem>
              {types.map(type => (
                <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="input-glass min-w-[110px]">
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes années</SelectItem>
              {availableYears.map(year => (
                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <button
              className={`reset-filters-btn ml-2 p-1 rounded-full transition-opacity duration-200 reset-pulse-anim opacity-90 cursor-pointer`}
              style={{ background: 'rgba(255,255,255,0.65)', border: '1.2px solid #3b82f6' }}
              onClick={resetFilters}
              title="Réinitialiser les filtres"
              aria-label="Réinitialiser les filtres"
              tabIndex={0}
              type="button"
            >
              <Eraser
                size={20}
                className={'text-blue-500 drop-shadow-[0_0_6px_#3b82f6cc]'}
              />
            </button>
          )}
        </div>
        <div className="flex-shrink-0 flex gap-2">
          {property?.category === 'Saisonnière/Airbnb' && (
            <Button
              className="btn-glass w-fit btn-animated-csv flex items-center gap-2 px-4 py-2 rounded-lg shadow transition relative group text-base"
              style={{ minWidth: 'fit-content', maxWidth: '320px', overflow: 'hidden', position: 'relative', whiteSpace: 'nowrap' }}
              onClick={() => setIsImportCsvModalOpen(true)}
              onMouseEnter={() => setIsImportHovered(true)}
              onMouseLeave={() => setIsImportHovered(false)}
              data-testid="import-csv-btn"
            >
              <span className="btn-animated-yellow-bg absolute inset-0 rounded-lg pointer-events-none transition-transform duration-300 group-hover:scale-100 scale-0 z-0" aria-hidden="true"></span>
              <span className="relative flex items-center z-10 font-semibold">
                <motion.span
                  className="inline-flex items-center"
                  animate={isImportHovered ? "dance" : "idle"}
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
                  {/* Icône CSV Lucide */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <rect x="3" y="4" width="18" height="16" rx="2" fill="#facc15" stroke="#eab308" strokeWidth="1.5" />
                    <text x="12" y="16" textAnchor="middle" fill="#78350f" fontSize="8" fontWeight="bold">CSV</text>
                  </svg>
                </motion.span>
                Importer CSV Airbnb
              </span>
            </Button>
          )}
          <Button
            className="btn-glass w-fit btn-animated-yellow flex items-center gap-2 px-4 py-2 rounded-lg shadow transition relative group text-base"
            style={{ minWidth: 'fit-content', maxWidth: '320px', overflow: 'hidden', position: 'relative', whiteSpace: 'nowrap' }}
            onClick={() => setIsModalOpen(true)}
            data-testid="add-transaction-btn"
            onMouseEnter={() => setIsButtonHovered(true)}
            onMouseLeave={() => setIsButtonHovered(false)}
          >
            <span className="btn-animated-yellow-bg absolute inset-0 rounded-lg pointer-events-none transition-transform duration-300 group-hover:scale-100 scale-0 z-0" aria-hidden="true"></span>
            <span className="relative flex items-center z-10 font-semibold">
              <motion.span
                className="inline-flex items-center"
                animate={isButtonHovered ? "dance" : "idle"}
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </motion.span>
              Ajouter une transaction
            </span>
          </Button>
        </div>
      </div>
      <div className="mt-4" />
      {/* Cartes totaux stylisées glassmorphism - icônes adaptées, bilan bleu */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Revenus */}
        {(() => {
          const [isHovered, setIsHovered] = useState(false);
          return (
            <div
              className="card-glass green relative flex flex-col justify-center p-6 overflow-hidden"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <TrendingUp size={70} className="absolute opacity-10 right-2 top-2 text-green-400 pointer-events-none" />
              <div className="text-xs font-semibold text-green-700 mb-1 z-10">+ Revenus</div>
              <motion.div
                animate={isHovered ? { scale: 1.08, color: '#22c55e', textShadow: '0 0 8px #22c55e88' } : { scale: 1, color: '#166534', textShadow: 'none' }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className="text-2xl font-bold text-green-800 z-10"
              >
                {totalIncome.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })}
              </motion.div>
            </div>
          );
        })()}
        {/* Dépenses */}
        {(() => {
          const [isHovered, setIsHovered] = useState(false);
          return (
            <div
              className="card-glass red relative flex flex-col justify-center p-6 overflow-hidden"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <TrendingDown size={70} className="absolute opacity-10 right-2 top-2 text-red-400 pointer-events-none" />
              <div className="text-xs font-semibold text-red-700 mb-1 z-10">- Dépenses</div>
              <motion.div
                animate={isHovered ? { scale: 1.08, color: '#ef4444', textShadow: '0 0 8px #ef444488' } : { scale: 1, color: '#991b1b', textShadow: 'none' }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className="text-2xl font-bold text-red-800 z-10"
              >
                {totalExpense.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })}
              </motion.div>
            </div>
          );
        })()}
        {/* Bilan */}
        {(() => {
          const [isHovered, setIsHovered] = useState(false);
          return (
            <div
              className="card-glass blue relative flex flex-col justify-center p-6 overflow-hidden"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <Sigma size={70} className="absolute opacity-10 right-2 top-2 text-blue-400 pointer-events-none" />
              <div className="text-xs font-semibold text-blue-700 mb-1 z-10">∑ Bilan</div>
              <motion.div
                animate={isHovered ? { scale: 1.08, color: '#2563eb', textShadow: '0 0 8px #60a5fa88' } : { scale: 1, color: '#1e3a8a', textShadow: 'none' }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className="text-2xl font-bold text-blue-800 z-10"
              >
                {balance.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })}
              </motion.div>
            </div>
          );
        })()}
      </div>
      <div className="mt-4" />
      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        <AnimatedCard className="overflow-hidden" delay={0.4}>
          <CardContentUI className="p-0">
            <TransactionTable
              searchQuery={searchQuery}
              filterType={filterType}
              filterCategory={filterCategory}
              filterProperty={propertyId}
              filterMonth={filterMonth}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              refreshTrigger={refreshTriggerLocal}
              onTransactionsLoaded={handleTransactionsLoaded}
            />
          </CardContentUI>
        </AnimatedCard>
      </motion.div>
      {/* Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        transactionId={selectedTransactionId}
        transactionToClone={transactionToClone}
        propertyId={propertyId}
      />
      {/* Modal d'import CSV Airbnb */}
      <SimpleCsvModal
        open={isImportCsvModalOpen}
        onClose={() => setIsImportCsvModalOpen(false)}
        onImport={handleImportAirbnbCsv}
        existingTransactions={transactions}
      />
    </div>
  );
}
