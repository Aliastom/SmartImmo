'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import TransactionModal from "./transaction-modal"
import { TransactionTable } from "./transaction-table"
import { motion } from 'framer-motion'
import { PageTransition, AnimatedCard } from '@/components/ui/animated'
import { PageHeader } from "@/components/ui/page-header"
import { Plus } from "lucide-react"
import { useEffect, useState } from "react"
import './transactions-theme.css';
import ReactSelect, { MultiValue } from 'react-select';
import { ArrowDownCircle, TrendingUp, TrendingDown, Sigma, PieChart, Wallet, Search, Filter, Eraser } from 'lucide-react';
import ManagementFeeIcon from './ManagementFeeIcon';

export default function TransactionsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | undefined>(undefined)
  const [transactionToClone, setTransactionToClone] = useState<any | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterTransactionKind, setFilterTransactionKind] = useState("all") // "income" | "expense" | "all"

  const [filterCategory, setFilterCategory] = useState("all")
  const [filterProperty, setFilterProperty] = useState("all")
  const [filterMonth, setFilterMonth] = useState("all")
  const [categories, setCategories] = useState<{ id: string, name: string }[]>([])
  const [types, setTypes] = useState<{ id: string, name: string }[]>([])
  const [properties, setProperties] = useState<{ id: string, name: string }[]>([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [balance, setBalance] = useState(0);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [filterAccountingMonths, setFilterAccountingMonths] = useState<string[]>([]);
  const [availableAccountingMonths, setAvailableAccountingMonths] = useState<{ value: string, label: string }[]>([]);
  const [allAccountingMonths, setAllAccountingMonths] = useState<{ value: string, label: string }[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [applyManagementFees, setApplyManagementFees] = useState(false);
  const [propertiesWithFees, setPropertiesWithFees] = useState<{ id: string, name: string, management_fee_percentage: number | null }[]>([]);

  const hasActiveFilters = (
    searchQuery.trim() !== '' ||
    filterCategory !== 'all' ||
    filterType !== 'all' ||
    filterTransactionKind !== 'all' ||
    filterProperty !== 'all' ||
    filterMonth !== 'all' ||
    filterAccountingMonths.length > 0 ||
    applyManagementFees
  );

  function resetFilters() {
    setSearchQuery('');
    setFilterCategory('all');
    setFilterType('all');
    setFilterTransactionKind('all');
    setFilterProperty('all');
    setFilterMonth('all');
    setFilterAccountingMonths([]);
    setApplyManagementFees(false);
  }

  useEffect(() => {
    async function fetchFilters() {
      try {
        const supabase = (await import('@supabase/auth-helpers-nextjs')).createClientComponentClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const [{ data: cat }, { data: typ }, { data: prop }] = await Promise.all([
          supabase.from('categories').select('id, name').eq('active', true),
          supabase.from('types').select('id, name').eq('active', true),
          supabase.from('properties').select('id, name').eq('user_id', session.user.id)
        ])
        setCategories(cat || [])
        setTypes(typ || [])
        setProperties(prop || [])
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

  // DEBUG : Log des transactions et propriétés avec frais
useEffect(() => {
  console.log('transactions', transactions);
  console.log('propertiesWithFees', propertiesWithFees);
}, [transactions, propertiesWithFees]);

useEffect(() => {
    async function fetchPropertiesWithFees() {
      try {
        const supabase = (await import('@supabase/auth-helpers-nextjs')).createClientComponentClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data: prop } = await supabase
          .from('properties')
          .select('id, name, management_fee_percentage')
          .eq('user_id', session.user.id);
        setPropertiesWithFees(prop || []);
      } catch (e) {}
    }
    fetchPropertiesWithFees();
  }, []);

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
      setRefreshTrigger(prev => prev + 1)
    }
  }

  const handleTransactionsLoaded = (txs: any[]) => {
    setTransactions(txs);
    // Toujours garder toutes les années déjà vues
    const yearsFromTx = Array.from(new Set(txs.map(t => Number(t.accounting_month?.slice(0, 4))))).filter(Boolean);
    setAvailableYears(prevYears => {
      const allYears = [...prevYears, ...yearsFromTx].filter((y, i, arr) => arr.indexOf(y) === i).sort((a, b) => b - a);
      if (JSON.stringify(prevYears) !== JSON.stringify(allYears)) {
        return allYears;
      }
      return prevYears;
    });
  };

  useEffect(() => {
    const months = Array.from(new Set(transactions
      .map(t => t.accounting_month)
      .filter((m): m is string => !!m)
    ))
      .map(dateStr => {
        const [year, month] = dateStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return {
          value: dateStr,
          label: date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
        };
      })
      .sort((a, b) => b.value.localeCompare(a.value));
    setAvailableAccountingMonths(months);
  }, [transactions]);

  // Calcul dynamique des totaux revenus/dépenses/bilan avec gestion des frais de gestion
useEffect(() => {
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach(tx => {
    // On cherche la propriété associée à la transaction
    const prop = propertiesWithFees.find(p => String(p.id) === String(tx.property_id));
    let amount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount;
    if (!amount || isNaN(amount)) amount = 0;

    if (tx.transaction_type === 'income') {
      if (applyManagementFees && (tx.type_name === 'Loyer' || (tx.type_data && tx.type_data.name === 'Loyer')) && prop && prop.management_fee_percentage) {
        const fee = amount * (prop.management_fee_percentage / 100);
        totalIncome += amount - fee;
        totalExpense += fee;
      } else {
        totalIncome += amount;
      }
    } else if (tx.transaction_type === 'expense') {
      totalExpense += amount;
    }
  });
  setTotalIncome(totalIncome);
  setTotalExpense(totalExpense);
  setBalance(totalIncome - totalExpense);
}, [transactions, applyManagementFees, propertiesWithFees]);

// Nouvelle logique : charger tous les mois distincts au montage
  useEffect(() => {
    async function fetchAllMonths() {
      const supabase = (await import('@supabase/auth-helpers-nextjs')).createClientComponentClient();
      const { data, error } = await supabase
        .from('transactions')
        .select('accounting_month')
        .neq('accounting_month', null);
      if (data) {
        const months = Array.from(new Set(data
          .map((t: any) => t.accounting_month)
          .filter((m: string) => !!m)
        ))
          .map((dateStr: string) => {
            const [year, month] = dateStr.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1);
            return {
              value: dateStr,
              label: date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
            };
          })
          .sort((a, b) => b.value.localeCompare(a.value));
        setAllAccountingMonths(months);
      }
    }
    fetchAllMonths();
  }, []);

  return (
    <div className="transactions-bg min-h-screen flex flex-col gap-10 px-8 md:px-16">
      <PageHeader
        title="Transactions"
        buttonText="Ajouter une transaction"
        buttonIcon={<Plus size={18} />}
        onButtonClick={() => setIsModalOpen(true)}
        className="mb-2 mt-2"
      />
      {/* Barre de recherche et filtres glassmorphism */}
      <div className="filter-bar-glass flex-wrap gap-3 md:gap-5 items-center relative">
        <div className="relative flex items-center" style={{ minWidth: '240px', maxWidth: '340px', flex: '1 1 240px' }}>
          {/* Icône Search harmonisée avec l’icône Filtrer */}
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
        <Select value={filterTransactionKind} onValueChange={setFilterTransactionKind}>
          <SelectTrigger className="input-glass min-w-[120px]">
            <SelectValue placeholder="Revenu/Dépense" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Revenus & Dépenses</SelectItem>
            <SelectItem value="income">Revenus</SelectItem>
            <SelectItem value="expense">Dépenses</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterProperty} onValueChange={setFilterProperty}>
          <SelectTrigger className="input-glass min-w-[110px]">
            <SelectValue placeholder="Bien" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous biens</SelectItem>
            {properties.map(prop => (
              <SelectItem key={prop.id} value={prop.id}>{prop.name}</SelectItem>
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
        <div style={{ minWidth: 220 }}>
          <ReactSelect
            isMulti
            options={allAccountingMonths}
            value={allAccountingMonths.filter(opt => filterAccountingMonths.includes(opt.value))}
            onChange={(opts: MultiValue<{ value: string; label: string }>) => setFilterAccountingMonths(opts.map(o => o.value))}
            placeholder="Mois comptable"
            classNamePrefix="react-select"
            noOptionsMessage={() => "Aucun mois"}
            isClearable
            menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
            menuPosition="fixed"
            styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
          />
        </div>
        <div className="flex items-center gap-2 ml-1 mr-2">
          <input
            id="mgmt-fee-checkbox"
            type="checkbox"
            checked={applyManagementFees}
            onChange={e => setApplyManagementFees(e.target.checked)}
            className="accent-blue-600 h-4 w-4"
            style={{ accentColor: '#2563eb' }}
          />
          <label htmlFor="mgmt-fee-checkbox" className="cursor-pointer select-none flex items-center">
            <ManagementFeeIcon active={applyManagementFees} />
          </label>

        </div>
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

      {/* Cartes totaux stylisées glassmorphism - icônes adaptées, bilan bleu */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        <AnimatedCard className="overflow-hidden" delay={0.4}>
          <CardContent className="p-0">
            <TransactionTable 
              filterTransactionKind={filterTransactionKind}
              searchQuery={searchQuery}
              filterType={filterType}
              filterCategory={filterCategory}
              filterProperty={filterProperty}
              filterMonth={filterMonth}
              filterAccountingMonths={filterAccountingMonths}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              refreshTrigger={refreshTrigger}
              onTransactionsLoaded={handleTransactionsLoaded}
            />
          </CardContent>
        </AnimatedCard>
      </motion.div>

      {/* Modal */}
      <TransactionModal 
        isOpen={isModalOpen}
        onClose={handleModalClose}
        transactionId={selectedTransactionId}
        transactionToClone={transactionToClone}
      />
    </div>
  )
}
