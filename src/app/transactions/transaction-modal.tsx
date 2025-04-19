'use client'

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { useToast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { useEffect, useState } from "react"
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation';

interface TransactionModalProps {
  isOpen: boolean
  onClose: (saved?: boolean) => void
  transactionId?: string
  transactionToClone?: any
  propertyId?: string
}

interface Property {
  id: string
  name: string
}

export default function TransactionModal({ isOpen, onClose, transactionId, transactionToClone, propertyId }: TransactionModalProps) {
  const supabase = createClientComponentClient<Database>()
  const [isLoading, setIsLoading] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])
  const [transactionSaved, setTransactionSaved] = useState(false)
  
  // Get current date and first day of current month for defaults
  const today = new Date().toISOString().split('T')[0]
  const currentMonth = new Date().toISOString().slice(0, 7) // Format YYYY-MM pour accounting_month
  
  const [formData, setFormData] = useState({
    property_id: '',
    type: 'income',
    category: '',
    amount: '',
    date: today,
    accounting_month: currentMonth,
    description: ''
  })
  const { toast } = useToast()

  // Fonction pour préremplir le montant en fonction de la propriété et de la catégorie
  const prefillAmount = async (propertyId: string, category: string, type: string) => {
    if (!propertyId || !category) return

    console.log("prefillAmount appelé avec:", { propertyId, category, type })

    // Si la catégorie est "loyer" et le type est "income", préremplir directement avec le loyer de la propriété
    if (type === 'income' && category === 'loyer') {
      try {
        // Récupérer les détails de la propriété
        const { data: property, error } = await supabase
          .from('properties')
          .select('rent')
          .eq('id', propertyId)
          .single()

        if (error) {
          console.error('Erreur lors de la récupération des détails de la propriété:', error)
          return
        }

        if (!property) {
          console.log("Propriété non trouvée")
          return
        }

        console.log("Propriété récupérée:", property)

        // Pour les revenus de type loyer, utiliser le montant du loyer de la propriété
        const amount = property.rent?.toString() || '0'
        console.log("Montant du loyer trouvé:", amount)

        // Mettre à jour le montant dans le formulaire immédiatement
        setFormData(prev => {
          console.log("Mise à jour du montant dans le formulaire:", amount)
          return {
            ...prev,
            amount
          }
        })
      } catch (error) {
        console.error('Erreur lors du préremplissage du montant du loyer:', error)
      }
      return
    }

    // Pour les autres catégories, utiliser la logique existante
    try {
      // Récupérer les détails de la propriété
      const { data: property, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single()

      if (error) {
        console.error('Erreur lors de la récupération des détails de la propriété:', error)
        return
      }

      if (!property) {
        console.log("Propriété non trouvée")
        return
      }

      console.log("Propriété récupérée:", property)

      let amount = '0' // Valeur par défaut à 0 pour toutes les catégories

      // Préremplir en fonction de la catégorie et du type
      if (type === 'expense') {
        // Pour les dépenses, utiliser les montants des charges récurrentes
        switch (category) {
          case 'taxe_fonciere':
            amount = property.property_tax?.toString() || '0'
            break
          case 'assurance':
            amount = property.insurance?.toString() || '0'
            break
          case 'frais_gestion':
            // Calculer les frais de gestion en fonction du pourcentage
            if (property.rent && property.management_fee_percentage) {
              const managementFee = (property.rent * property.management_fee_percentage) / 100
              amount = managementFee.toFixed(2)
            }
            break
          default:
            // Pour les autres catégories, on garde la valeur par défaut '0'
            break
        }
      }

      console.log("Montant calculé:", amount)

      // Mettre à jour le montant dans le formulaire
      setFormData(prev => {
        console.log("Mise à jour du montant dans le formulaire:", amount)
        return {
          ...prev,
          amount
        }
      })
    } catch (error) {
      console.error('Erreur lors du préremplissage du montant:', error)
    }
  }

  // Fonction spécifique pour préremplir le montant du loyer
  const prefillRent = async (propertyId: string) => {
    if (!propertyId) return
    
    try {
      // Récupérer directement le loyer de la propriété sélectionnée
      const { data, error } = await supabase
        .from('properties')
        .select('rent')
        .eq('id', propertyId)
        .single()
        
      if (error) {
        console.error('Erreur lors de la récupération du loyer:', error)
        return
      }
      
      if (data) {
        const rent = data.rent || 0
        console.log('Loyer trouvé:', rent)
        
        // Mettre à jour directement le montant avec le loyer
        setFormData(prev => ({
          ...prev,
          amount: rent.toString()
        }))
      }
    } catch (error) {
      console.error('Erreur lors du préremplissage du loyer:', error)
    }
  }

  useEffect(() => {
    if (isOpen) {
      const fetchProperties = async () => {
        try {
          // First get the current session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError || !session) {
            console.error('Erreur de session:', sessionError)
            return
          }
          
          // Then fetch properties for this user
          const { data: propertiesData, error: propertiesError } = await supabase
            .from('properties')
            .select('id, name')
            .eq('user_id', session.user.id)
            .order('name', { ascending: true })
          
          if (propertiesError) {
            console.error('Erreur lors de la récupération des propriétés:', propertiesError)
            return
          }
          
          setProperties(propertiesData || [])
          
          // If we have a transactionId, fetch the transaction
          if (transactionId) {
            fetchTransaction()
          } else if (transactionToClone) {
            // If we have a transaction to clone, set the form data
            setFormData({
              property_id: transactionToClone.property_id || (propertyId || ''),
              type: transactionToClone.type || 'income',
              category: transactionToClone.category || '',
              amount: transactionToClone.amount?.toString() || '',
              date: today,
              accounting_month: currentMonth,
              description: transactionToClone.description || ''
            })
          } else if (propertyId) {
            setFormData(prev => ({
              ...prev,
              property_id: propertyId
            }))
            // Préremplir le loyer si la catégorie est déjà "loyer"
            if (formData.category === 'loyer') {
              prefillRent(propertyId)
            }
          } else if (propertiesData && propertiesData.length > 0 && !formData.property_id) {
            // Sélectionner la première propriété par défaut
            setFormData(prev => ({
              ...prev,
              property_id: propertiesData[0].id
            }))
            // Préremplir le loyer si la catégorie est déjà "loyer"
            if (formData.category === 'loyer') {
              prefillRent(propertiesData[0].id)
            }
          }
        } catch (error) {
          console.error('Erreur lors du chargement des propriétés:', error)
        }
      }
      
      fetchProperties()
    }
  }, [isOpen, transactionId, transactionToClone, propertyId, supabase])
  
  // Effet pour préremplir le montant lorsque la catégorie change
  useEffect(() => {
    if (formData.property_id && formData.category) {
      prefillAmount(formData.property_id, formData.category, formData.type)
    }
  }, [formData.category, formData.property_id, formData.type])

  // Préremplir le montant avec le loyer du bien si la catégorie est "loyer" et le type "income"
  useEffect(() => {
    if (
      isOpen &&
      formData.property_id &&
      formData.category === 'loyer' &&
      formData.type === 'income'
    ) {
      (async () => {
        const { data: property, error } = await supabase
          .from('properties')
          .select('rent')
          .eq('id', formData.property_id)
          .single()
        if (!error && property && property.rent && Number(property.rent) > 0) {
          setFormData(prev => ({ ...prev, amount: property.rent.toString() }))
        } else if (!error && property && (!property.rent || Number(property.rent) <= 0)) {
          toast({
            title: "Erreur",
            description: "Le bien sélectionné n'a pas de loyer défini. Merci de renseigner le loyer dans la fiche du bien avant d'associer un locataire.",
            variant: "destructive"
          })
        }
      })();
    }
  }, [isOpen, formData.property_id, formData.category, formData.type]);

  // Fetch transaction details when editing
  const fetchTransaction = async () => {
    if (!transactionId) return
    
    try {
      setIsLoading(true)
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single()
      
      if (error) {
        console.error('Erreur lors de la récupération de la transaction:', error)
        return
      }
      
      if (data) {
        setFormData({
          property_id: data.property_id || '',
          type: data.type || 'income',
          category: data.category || '',
          amount: data.amount?.toString() || '',
          date: data.date || today,
          accounting_month: data.accounting_month || currentMonth,
          description: data.description || ''
        })
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de la transaction:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsLoading(true)
      
      if (formData.category === 'loyer' && formData.type === 'income') {
        if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
          toast({
            title: "Erreur",
            description: "Le montant du loyer doit être renseigné et strictement supérieur à 0.",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
      }
      
      const transactionData = {
        ...formData,
        amount: parseFloat(formData.amount),
        updated_at: new Date().toISOString()
      }
      
      if (transactionId) {
        // Update existing transaction
        const { error } = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', transactionId)
        
        if (error) {
          console.error('Erreur lors de la mise à jour de la transaction:', error)
          toast({
            title: "Erreur",
            description: "Impossible de mettre à jour la transaction.",
            variant: "destructive"
          })
          return
        }
        
        toast({
          title: "Succès",
          description: "Transaction mise à jour avec succès.",
        })
      } else {
        // Create new transaction
        // Récupérer l'ID de l'utilisateur actuel
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          console.error('Erreur de session:', sessionError)
          toast({
            title: "Erreur de session",
            description: "Veuillez vous reconnecter pour créer une transaction.",
            variant: "destructive"
          })
          return
        }
        
        const { error } = await supabase
          .from('transactions')
          .insert({
            ...transactionData,
            user_id: session.user.id,
            created_at: new Date().toISOString()
          })
        
        if (error) {
          console.error('Erreur lors de la création de la transaction:', error)
          toast({
            title: "Erreur",
            description: "Impossible de créer la transaction.",
            variant: "destructive"
          })
          return
        }
        
        toast({
          title: "Succès",
          description: "Transaction créée avec succès.",
        })
      }
      
      setTransactionSaved(true)
      onClose(true)
    } catch (error) {
      console.error('Erreur lors de la soumission du formulaire:', error)
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors du traitement de la transaction.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Récupérer l'id du bien depuis l'URL (ex: /properties/[id])
  const params = useParams();
  const propertyIdFromUrl = params?.id as string | undefined;

  useEffect(() => {
    if (isOpen) {
      // Si on a un id dans l'URL, on le sélectionne automatiquement
      if (propertyIdFromUrl) {
        setFormData(prev => ({
          ...prev,
          property_id: propertyIdFromUrl
        }));
      } else if (properties && properties.length > 0 && !formData.property_id) {
        // Sinon, sélection automatique du premier bien (logique existante)
        setFormData(prev => ({
          ...prev,
          property_id: properties[0].id
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, propertyIdFromUrl, properties]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            <DialogTitle>
              {transactionId ? 'Modifier la transaction' : transactionToClone ? 'Dupliquer la transaction' : 'Ajouter une transaction'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div>
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '40%' }}>
                      <div className="flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span>Propriété</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Select
                        value={formData.property_id}
                        onValueChange={(value) => {
                          setFormData(prev => ({
                            ...prev,
                            property_id: value
                          }))
                          
                          // Si la catégorie est déjà "loyer", préremplir le montant du loyer
                          if (formData.category === 'loyer') {
                            prefillRent(value)
                          }
                        }}
                        disabled={!!propertyId} // Désactiver si propertyId est fourni
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une propriété" />
                        </SelectTrigger>
                        <SelectContent>
                          {properties.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              {property.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Type</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Select
                        value={formData.type}
                        onValueChange={(value) => {
                          setFormData(prev => ({
                            ...prev,
                            type: value
                          }))
                          // Préremplir le montant en fonction de la propriété et de la catégorie
                          prefillAmount(formData.property_id, formData.category, value)
                        }}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="income">Revenu</SelectItem>
                          <SelectItem value="expense">Dépense</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span>Catégorie</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Select
                        value={formData.category}
                        onValueChange={(value) => {
                          // Mettre à jour la catégorie dans le formulaire
                          setFormData(prev => ({
                            ...prev,
                            category: value
                          }))
                          
                          // Si la catégorie est "loyer" et qu'une propriété est sélectionnée, préremplir le montant du loyer
                          if (value === 'loyer' && formData.property_id) {
                            prefillRent(formData.property_id)
                          }
                        }}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.type === 'income' ? (
                            <>
                              <SelectItem value="loyer">Loyer</SelectItem>
                              <SelectItem value="caution">Caution</SelectItem>
                              <SelectItem value="autre_revenu">Autre revenu</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="taxe_fonciere">Taxe foncière</SelectItem>
                              <SelectItem value="taxe_habitation">Taxe d'habitation</SelectItem>
                              <SelectItem value="assurance">Assurance</SelectItem>
                              <SelectItem value="frais_gestion">Frais de gestion</SelectItem>
                              <SelectItem value="charges_copropriete">Charges de copropriété</SelectItem>
                              <SelectItem value="travaux">Travaux</SelectItem>
                              <SelectItem value="interet_emprunt">Intérêts d'emprunt</SelectItem>
                              <SelectItem value="autre_depense">Autre dépense</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Montant</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          amount: e.target.value
                        }))}
                        required
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '20%' }}>
                      <div className="flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Date</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          date: e.target.value
                        }))}
                        required
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Mois comptable</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="month"
                        value={formData.accounting_month}
                        onChange={(e) => {
                          // Correction : pas de -1 sur le mois, car le champ <input type="month"> fournit déjà le bon format YYYY-MM
                          // Il suffit d'utiliser la valeur telle quelle
                          setFormData(prev => ({
                            ...prev,
                            accounting_month: e.target.value
                          }))
                        }}
                        required
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '20%' }}>
                      <div className="flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                        <span>Description</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          description: e.target.value
                        }))}
                        placeholder="Description optionnelle..."
                        className="resize-none"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex justify-end space-x-3">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onClose(false)}
                  disabled={isLoading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Annuler
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {transactionId ? "Modification..." : "Création..."}
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {transactionId ? "Modifier" : "Créer"}
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
