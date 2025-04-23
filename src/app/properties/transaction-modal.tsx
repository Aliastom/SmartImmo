'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { useToast } from "@/components/ui/use-toast"
import { motion } from 'framer-motion'
import { LoadingSpinner } from '@/components/ui/animated'

interface TransactionModalProps {
  isOpen: boolean
  onClose: (saved?: boolean) => void
  propertyId: string
  onTransactionAdded?: () => void
  transactionToClone?: any
  setTransactionToClone?: (transaction: any) => void
}

type TransactionType = 'income' | 'expense'
type TransactionCategory = 'loyer' | 'taxe_fonciere' | 'taxe_ordures' | 'assurance' | 'frais_gestion' | 'reparation' | 'autre'

interface TransactionForm {
  date: string
  type: TransactionType
  category: TransactionCategory
  amount: number
  description: string
}

export function TransactionModal({ isOpen, onClose, propertyId, onTransactionAdded, transactionToClone, setTransactionToClone }: TransactionModalProps) {
  const supabase = createClientComponentClient<Database>()
  const { toast } = useToast()
  const [formData, setFormData] = useState<TransactionForm>({
    date: new Date().toISOString().split('T')[0],
    type: 'income',
    category: 'loyer',
    amount: 0,
    description: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProperty, setIsLoadingProperty] = useState(true)
  const [accountingMonth, setAccountingMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // Format YYYY-MM
  )
  const [propertyDetails, setPropertyDetails] = useState<any>(null)

  const categoryOptions = [
    { value: 'loyer', label: 'Loyer' },
    { value: 'taxe_fonciere', label: 'Taxe foncière' },
    { value: 'taxe_ordures', label: "Taxe d'ordures ménagères (OM)" },
    { value: 'assurance', label: 'Assurance' },
    { value: 'frais_gestion', label: 'Frais de gestion' },
    { value: 'reparation', label: 'Réparation' },
    { value: 'autre', label: 'Autre' },
  ]

  // Récupérer les détails de la propriété au chargement
  useEffect(() => {
    const fetchPropertyDetails = async () => {
      if (!isOpen || !propertyId) return

      setIsLoadingProperty(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          toast({
            title: "Session expirée",
            description: "Veuillez vous reconnecter",
            variant: "destructive"
          })
          return
        }

        const { data: property, error } = await supabase
          .from('properties')
          .select('*')
          .eq('id', propertyId)
          .eq('user_id', session.user.id)
          .single()

        if (error) {
          console.error('Erreur lors de la récupération des détails de la propriété:', error)
          return
        }

        setPropertyDetails(property)
        
        // Si nous avons une transaction à cloner, utiliser ses valeurs
        if (transactionToClone) {
          setFormData({
            date: new Date().toISOString().split('T')[0], // Utiliser la date du jour
            type: transactionToClone.type,
            category: transactionToClone.category,
            amount: transactionToClone.amount,
            description: transactionToClone.description || ''
          })
          setAccountingMonth(new Date().toISOString().slice(0, 7)) // Utiliser le mois en cours
        } 
        // Sinon, préremplir le montant du loyer si la catégorie est "loyer" et le type est "income"
        else if (formData.category === 'loyer' && formData.type === 'income' && property.rent) {
          setFormData(prev => ({
            ...prev,
            amount: property.rent
          }))
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des détails de la propriété:', error)
      } finally {
        setIsLoadingProperty(false)
      }
    }

    fetchPropertyDetails()
  }, [isOpen, propertyId, supabase, toast, transactionToClone])

  // Fonction pour préremplir le montant en fonction de la catégorie et du type
  const prefillAmount = () => {
    if (!propertyDetails) return

    let amount = 0 // Valeur par défaut à 0 pour toutes les catégories

    // Préremplir en fonction de la catégorie et du type
    if (formData.type === 'income' && formData.category === 'loyer') {
      // Pour les revenus de type loyer, utiliser le montant du loyer de la propriété
      amount = propertyDetails.rent || 0
    } else if (formData.type === 'income' && formData.category === 'taxe_ordures') {
      // Pour la taxe d'ordures ménagères, utiliser la valeur si elle existe
      amount = propertyDetails.waste_tax || 0
    } else if (formData.type === 'expense') {
      // Pour les dépenses, utiliser les montants des charges récurrentes
      switch (formData.category) {
        case 'taxe_fonciere':
          amount = propertyDetails.property_tax || 0
          break
        case 'assurance':
          amount = propertyDetails.insurance || 0
          break
        case 'frais_gestion':
          // Calculer les frais de gestion en fonction du pourcentage
          if (propertyDetails.rent && propertyDetails.management_fee_percentage) {
            amount = (propertyDetails.rent * propertyDetails.management_fee_percentage) / 100
          }
          break
        default:
          // Pour les autres catégories, on garde la valeur par défaut 0
          break
      }
    }

    // Mettre à jour le montant dans le formulaire
    setFormData(prev => ({
      ...prev,
      amount
    }))
  }

  // Appeler prefillAmount lorsque le type ou la catégorie change
  useEffect(() => {
    if (propertyDetails) {
      prefillAmount()
    }
  }, [formData.type, formData.category, propertyDetails])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast({
          title: "Session expirée",
          description: "Veuillez vous reconnecter",
          variant: "destructive"
        })
        return
      }

      // Vérifier que le bien appartient à l'utilisateur
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('id')
        .eq('id', propertyId)
        .eq('user_id', session.user.id)
        .single()

      if (propertyError || !property) {
        throw new Error("Vous n'avez pas les droits pour ajouter une transaction à ce bien")
      }

      // Créer la transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert([
          {
            date: formData.date,
            type: formData.type,
            category: formData.category,
            amount: Number(formData.amount),
            description: formData.description || '',
            property_id: propertyId,
            user_id: session.user.id,
            accounting_month: accountingMonth
          }
        ])
        .select()

      if (transactionError) {
        throw transactionError
      }

      toast({
        title: "Transaction ajoutée",
        description: "La transaction a été enregistrée avec succès."
      })

      // Réinitialiser le formulaire
      setFormData({
        date: new Date().toISOString().split('T')[0],
        type: 'income',
        category: 'loyer',
        amount: propertyDetails?.rent || 0,
        description: ''
      })
      setAccountingMonth(new Date().toISOString().slice(0, 7))

      // Fermer la modal
      onClose(true)

      // Callback pour informer le parent que la transaction a été ajoutée
      if (onTransactionAdded) {
        onTransactionAdded()
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la transaction:', error)
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la transaction. Veuillez réessayer.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            <DialogTitle>Ajouter une transaction</DialogTitle>
          </div>
        </DialogHeader>
        
        {isLoadingProperty ? (
          <div className="flex justify-center items-center py-8">
            <LoadingSpinner size={40} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td className="bg-gray-50 p-3 text-sm font-medium text-gray-500 uppercase w-1/3">
                    <div className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Type</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Select
                      value={formData.type}
                      onValueChange={(value: TransactionType) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger id="type" className="h-10 border-0">
                        <SelectValue placeholder="Type de transaction" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Revenu</SelectItem>
                        <SelectItem value="expense">Dépense</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
                
                <tr>
                  <td className="bg-gray-50 p-3 text-sm font-medium text-gray-500 uppercase">
                    <div className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span>Catégorie</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value as TransactionCategory })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
                
                <tr>
                  <td className="bg-gray-50 p-3 text-sm font-medium text-gray-500 uppercase">
                    <div className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Montant (€)</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                      required
                      className="h-10 border-0"
                    />
                  </td>
                </tr>
                
                <tr>
                  <td className="bg-gray-50 p-3 text-sm font-medium text-gray-500 uppercase">
                    <div className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Date</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                      className="h-10 border-0"
                    />
                  </td>
                </tr>
                
                <tr>
                  <td className="bg-gray-50 p-3 text-sm font-medium text-gray-500 uppercase">
                    <div className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span>Mois comptable</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Input
                      id="accountingMonth"
                      type="month"
                      value={accountingMonth}
                      onChange={(e) => setAccountingMonth(e.target.value)}
                      className="h-10 border-0"
                    />
                  </td>
                </tr>
                
                <tr>
                  <td className="bg-gray-50 p-3 text-sm font-medium text-gray-500 uppercase">
                    <div className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                      <span>Description</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Description de la transaction"
                      className="min-h-[80px] resize-none border-0"
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-end space-x-3 pt-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" type="button" onClick={() => onClose()} disabled={isLoading}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Annuler
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
                  {isLoading ? (
                    <>
                      <LoadingSpinner size={16} className="mr-2" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Enregistrer
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
