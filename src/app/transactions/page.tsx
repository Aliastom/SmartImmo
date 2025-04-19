'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import TransactionModal from "./transaction-modal"
import { TransactionTable } from "./transaction-table"
import { motion } from 'framer-motion'
import { PageTransition, AnimatedCard } from '@/components/ui/animated'

export default function TransactionsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | undefined>(undefined)
  const [transactionToClone, setTransactionToClone] = useState<any | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [refreshTrigger, setRefreshTrigger] = useState(0)

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
    // Déclencher un rafraîchissement des données uniquement si une transaction a été sauvegardée
    if (saved) {
      setRefreshTrigger(prev => prev + 1)
    }
  }

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

        {/* Actions */}
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
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Toutes les transactions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les transactions</SelectItem>
                <SelectItem value="income">Revenus</SelectItem>
                <SelectItem value="expense">Dépenses</SelectItem>
              </SelectContent>
            </Select>
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
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                refreshTrigger={refreshTrigger}
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
