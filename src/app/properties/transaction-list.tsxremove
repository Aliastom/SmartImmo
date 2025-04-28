'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from '@/lib/utils'
import { TransactionModal } from './transaction-modal'

type Transaction = Database['public']['Tables']['transactions']['Row']

interface TransactionListProps {
  propertyId: string
}

export function TransactionList({ propertyId }: TransactionListProps) {
  const supabase = createClientComponentClient<Database>()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const fetchTransactions = async () => {
    try {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) return
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('property_id', propertyId)
        .eq('user_id', session.user.id)
        .order('date', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [propertyId, isModalOpen])

  const getCategoryLabel = (category: string) => {
    const categories: { [key: string]: string } = {
      rent: 'Loyer',
      charges: 'Charges',
      maintenance: 'Entretien',
      taxes: 'Taxes',
      insurance: 'Assurance',
      other: 'Autre'
    }
    return categories[category] || category
  }

  const getTypeLabel = (type: string) => {
    return type === 'revenue' ? 'Revenu' : 'Dépense'
  }

  const getTypeColor = (type: string) => {
    return type === 'revenue' ? 'text-green-600' : 'text-red-600'
  }

  return (
    <Card className="mt-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Historique des transactions</CardTitle>
        <Button onClick={() => setIsModalOpen(true)}>
          Ajouter une transaction
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Chargement...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            Aucune transaction enregistrée
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {new Date(transaction.date).toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell>{getTypeLabel(transaction.type)}</TableCell>
                  <TableCell>{getCategoryLabel(transaction.category)}</TableCell>
                  <TableCell>{transaction.description || '-'}</TableCell>
                  <TableCell className={`text-right ${getTypeColor(transaction.type)}`}>
                    {formatCurrency(transaction.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          fetchTransactions()
        }}
        propertyId={propertyId}
      />
    </Card>
  )
}
