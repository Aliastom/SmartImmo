'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import TransactionModal from "./transaction-modal"
import { TransactionTable } from "./transaction-table"
import { motion } from 'framer-motion'
import { PageTransition, AnimatedCard } from '@/components/ui/animated'
import { useEffect, useState } from "react"

export default function TransactionsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | undefined>(undefined)
  const [transactionToClone, setTransactionToClone] = useState<any | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterProperty, setFilterProperty] = useState("all")
  const [filterMonth, setFilterMonth] = useState("")
  const [categories, setCategories] = useState<{ id: string, name: string }[]>([])
  const [types, setTypes] = useState<{ id: string, name: string }[]>([])
  const [properties, setProperties] = useState<{ id: string, name: string }[]>([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [balance, setBalance] = useState(0);

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

  const handleTransactionsLoaded = (transactions: any[]) => {
    const income = transactions.filter(t => t.transaction_type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = transactions.filter(t => t.transaction_type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    setTotalIncome(income);
    setTotalExpense(expense);
    setBalance(income - expense);
  };

  return (
    <PageTransition className="container py-10">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <motion.h1 
            className="text-3xl font-bold text-gray-800"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Gestion des Transactions
          </motion.h1>
          <motion.div 
            className="flex items-center space-x-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <div className="relative">
              <Input 
                type="text" 
                placeholder="Rechercher..." 
                className="pl-10 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </motion.div>
        </div>

        {/* Cartes totaux */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card className="bg-green-50">
            <CardContent className="py-4">
              <div className="text-xs font-semibold text-green-700 mb-1">+ Revenus</div>
              <div className="text-2xl font-bold text-green-800">{totalIncome.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
          <Card className="bg-red-50">
            <CardContent className="py-4">
              <div className="text-xs font-semibold text-red-700 mb-1">- Dépenses</div>
              <div className="text-2xl font-bold text-red-800">{totalExpense.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50">
            <CardContent className="py-4">
              <div className="text-xs font-semibold text-orange-700 mb-1">∑ Bilan</div>
              <div className="text-2xl font-bold text-orange-800">{balance.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
        </div>

        {/* Actions + Filtres avancés */}
        <motion.div 
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={() => {
                  setSelectedTransactionId(undefined)
                  setIsModalOpen(true)
                }}
                className="bg-black hover:bg-black/80 text-white"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-4 w-4 mr-2" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ajouter une transaction
              </Button>
            </motion.div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <span className="text-sm text-gray-600">Filtrer :</span>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-[180px]">
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
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                {types.map(type => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterProperty} onValueChange={setFilterProperty}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Bien" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous biens</SelectItem>
                {properties.map(prop => (
                  <SelectItem key={prop.id} value={prop.id}>{prop.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="month"
              className="w-[140px]"
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              placeholder="Mois comptable"
            />
          </div>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          <AnimatedCard className="overflow-hidden" delay={0.4}>
            <CardContent className="p-0">
              <TransactionTable 
                searchQuery={searchQuery}
                filterType={filterType}
                filterCategory={filterCategory}
                filterProperty={filterProperty}
                filterMonth={filterMonth}
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
    </PageTransition>
  )
}
