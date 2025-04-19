'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { useToast } from '@/components/ui/use-toast'
import { motion } from 'framer-motion'

interface LoanModalProps {
  isOpen: boolean
  onClose: () => void
  propertyId: string
  loanId?: string
  onSuccess?: () => void
}

export function LoanModal({ isOpen, onClose, propertyId, loanId, onSuccess }: LoanModalProps) {
  const supabase = createClientComponentClient<Database>()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    interest_rate: '',
    insurance_rate: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    monthly_payment: '',
    remaining_capital: '',
    payment_day: '',
    loan_type: 'Prêt immobilier',
    notes: '',
    loan_duration_years: '20'
  })
  const [isLoading, setIsLoading] = useState(false)

  // Charger les données du prêt si on est en mode édition
  useEffect(() => {
    const fetchLoan = async () => {
      if (!loanId) {
        setFormData({
          name: '',
          amount: '',
          interest_rate: '',
          insurance_rate: '',
          start_date: new Date().toISOString().split('T')[0],
          end_date: '',
          monthly_payment: '',
          remaining_capital: '',
          payment_day: '',
          loan_type: 'Prêt immobilier',
          notes: '',
          loan_duration_years: '20'
        })
        return
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const { data, error } = await supabase
          .from('loans')
          .select('*')
          .eq('id', loanId)
          .eq('user_id', session.user.id)
          .single()

        if (error) throw error

        // Calculer la durée du prêt en années si on a une date de fin
        let loanDurationYears = '20'
        if (data.start_date && data.end_date) {
          const startDate = new Date(data.start_date)
          const endDate = new Date(data.end_date)
          const durationInMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                                  endDate.getMonth() - startDate.getMonth()
          loanDurationYears = (durationInMonths / 12).toFixed(0)
        }

        setFormData({
          name: data.name,
          amount: data.amount?.toString() || '',
          interest_rate: data.interest_rate?.toString() || '',
          insurance_rate: data.insurance_rate?.toString() || '',
          start_date: data.start_date || new Date().toISOString().split('T')[0],
          end_date: data.end_date || '',
          monthly_payment: data.monthly_payment?.toString() || '',
          remaining_capital: data.remaining_capital?.toString() || '',
          payment_day: data.payment_day?.toString() || '',
          loan_type: data.loan_type || 'Prêt immobilier',
          notes: data.notes || '',
          loan_duration_years: loanDurationYears
        })
      } catch (error) {
        console.error('Error:', error)
        toast({
          title: "Erreur",
          description: "Impossible de charger les données du prêt",
          variant: "destructive"
        })
      }
    }

    if (isOpen) {
      fetchLoan()
    }
  }, [loanId, isOpen, supabase, toast])

  // Fonction pour calculer automatiquement les valeurs manquantes
  const calculateLoanDetails = () => {
    const amount = parseFloat(formData.amount)
    const interestRate = parseFloat(formData.interest_rate)
    const insuranceRate = parseFloat(formData.insurance_rate || '0')
    const durationYears = parseInt(formData.loan_duration_years)
    
    if (isNaN(amount) || isNaN(interestRate) || isNaN(durationYears) || amount <= 0 || durationYears <= 0) {
      return
    }
    
    // Convertir les taux annuels en taux mensuels
    const monthlyInterestRate = interestRate / 100 / 12
    const monthlyInsuranceRate = insuranceRate / 100 / 12
    const totalMonths = durationYears * 12
    
    // Calculer la mensualité (formule de l'annuité constante)
    let monthlyPayment = 0
    if (monthlyInterestRate > 0) {
      monthlyPayment = amount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, totalMonths)) / 
                      (Math.pow(1 + monthlyInterestRate, totalMonths) - 1)
    } else {
      monthlyPayment = amount / totalMonths
    }
    
    // Ajouter l'assurance
    const insuranceAmount = amount * monthlyInsuranceRate
    monthlyPayment += insuranceAmount
    
    // Calculer la date de fin
    const startDate = new Date(formData.start_date)
    const endDate = new Date(startDate)
    endDate.setFullYear(endDate.getFullYear() + durationYears)
    
    // Utiliser une date de référence fixe pour 2025 (16 avril 2025)
    const referenceDate = new Date('2025-04-16')
    let remainingCapital = amount
    
    // Si la date de début est dans le passé par rapport à notre référence, calculer le capital restant
    if (startDate <= referenceDate) {
      // Nombre de mois écoulés depuis le début du prêt
      const monthsElapsed = (referenceDate.getFullYear() - startDate.getFullYear()) * 12 + 
                           (referenceDate.getMonth() - startDate.getMonth())
      
      // Pour chaque mois écoulé, calculer le remboursement du capital
      let currentCapital = amount
      for (let i = 0; i < monthsElapsed; i++) {
        // Calculer les intérêts du mois
        const monthlyInterest = currentCapital * monthlyInterestRate
        
        // Calculer le remboursement du capital (mensualité - intérêts - assurance)
        const principalPayment = monthlyPayment - monthlyInterest - insuranceAmount
        
        // Mettre à jour le capital restant
        currentCapital = Math.max(0, currentCapital - principalPayment)
      }
      
      remainingCapital = currentCapital
    }
    
    // Mettre à jour le formulaire
    setFormData(prev => ({
      ...prev,
      monthly_payment: monthlyPayment.toFixed(2),
      end_date: endDate.toISOString().split('T')[0],
      remaining_capital: remainingCapital.toFixed(2)
    }))
  }
  
  // Recalculer automatiquement lorsque les valeurs de base changent
  useEffect(() => {
    // Recalculer pour les nouveaux prêts et lors des modifications
    // si l'utilisateur a modifié un des champs de base
    calculateLoanDetails()
  }, [formData.amount, formData.interest_rate, formData.insurance_rate, formData.loan_duration_years, formData.start_date])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast({
          title: "Session expirée",
          description: "Votre session a expiré. Veuillez vous reconnecter.",
          variant: "destructive"
        })
        onClose()
        return
      }

      // Recalculer les valeurs avant soumission pour s'assurer qu'elles sont à jour
      const amount = parseFloat(formData.amount)
      const interest_rate = parseFloat(formData.interest_rate)
      const insurance_rate = formData.insurance_rate ? parseFloat(formData.insurance_rate) : null
      const durationYears = parseInt(formData.loan_duration_years)
      
      // Calculer la mensualité si elle n'est pas définie ou si les paramètres de base ont changé
      let monthly_payment = formData.monthly_payment ? parseFloat(formData.monthly_payment) : null
      let end_date = formData.end_date
      let remaining_capital = formData.remaining_capital ? parseFloat(formData.remaining_capital) : null
      
      // Forcer le recalcul des valeurs
      if (!isNaN(amount) && !isNaN(interest_rate) && !isNaN(durationYears) && durationYears > 0) {
        // Convertir les taux annuels en taux mensuels
        const monthlyInterestRate = interest_rate / 100 / 12
        const monthlyInsuranceRate = (insurance_rate || 0) / 100 / 12
        const totalMonths = durationYears * 12
        
        // Calculer la mensualité
        let calculatedMonthlyPayment = 0
        if (monthlyInterestRate > 0) {
          calculatedMonthlyPayment = amount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, totalMonths)) / 
                                    (Math.pow(1 + monthlyInterestRate, totalMonths) - 1)
        } else {
          calculatedMonthlyPayment = amount / totalMonths
        }
        
        // Ajouter l'assurance
        calculatedMonthlyPayment += amount * monthlyInsuranceRate
        
        // Mettre à jour les valeurs
        monthly_payment = calculatedMonthlyPayment
        
        // Calculer la date de fin
        const startDate = new Date(formData.start_date)
        const calculatedEndDate = new Date(startDate)
        calculatedEndDate.setFullYear(calculatedEndDate.getFullYear() + durationYears)
        end_date = calculatedEndDate.toISOString().split('T')[0]
        
        // Calculer le capital restant en fonction de la date de référence
        const referenceDate = new Date('2025-04-16')
        let calculatedRemainingCapital = amount
        
        if (startDate <= referenceDate) {
          // Nombre de mois écoulés depuis le début du prêt
          const monthsElapsed = (referenceDate.getFullYear() - startDate.getFullYear()) * 12 + 
                              (referenceDate.getMonth() - startDate.getMonth())
          
          // Pour chaque mois écoulé, calculer le remboursement du capital
          let currentCapital = amount
          for (let i = 0; i < monthsElapsed; i++) {
            // Calculer les intérêts du mois
            const monthlyInterest = currentCapital * monthlyInterestRate
            
            // Calculer l'assurance du mois
            const monthlyInsurance = amount * monthlyInsuranceRate
            
            // Calculer le remboursement du capital
            const principalPayment = calculatedMonthlyPayment - monthlyInterest - monthlyInsurance
            
            // Mettre à jour le capital restant
            currentCapital = Math.max(0, currentCapital - principalPayment)
          }
          
          calculatedRemainingCapital = currentCapital
        }
        
        remaining_capital = calculatedRemainingCapital
      }
      
      const payment_day = formData.payment_day ? parseInt(formData.payment_day) : null

      // Validation
      if (isNaN(amount) || amount <= 0) throw new Error("Le montant doit être un nombre positif")
      if (isNaN(interest_rate) || interest_rate < 0 || interest_rate > 100) 
        throw new Error("Le taux d'intérêt doit être compris entre 0 et 100")
      if (insurance_rate !== null && (isNaN(insurance_rate) || insurance_rate < 0 || insurance_rate > 100))
        throw new Error("Le taux d'assurance doit être compris entre 0 et 100")
      if (payment_day !== null && (isNaN(payment_day) || payment_day < 1 || payment_day > 31))
        throw new Error("Le jour de paiement doit être compris entre 1 et 31")
      if (monthly_payment !== null && (isNaN(monthly_payment) || monthly_payment <= 0)) 
        throw new Error("La mensualité doit être un nombre positif")
      if (remaining_capital !== null && (isNaN(remaining_capital) || remaining_capital < 0)) 
        throw new Error("Le capital restant dû doit être un nombre positif ou nul")

      // Préparation des données pour l'insertion/mise à jour
      const loanData = {
        user_id: session.user.id,
        property_id: propertyId,
        name: formData.name,
        amount,
        interest_rate,
        insurance_rate,
        start_date: formData.start_date,
        end_date: end_date || null,
        monthly_payment,
        remaining_capital,
        payment_day,
        loan_type: formData.loan_type,
        notes: formData.notes
      }

      let result
      if (loanId) {
        // Mode édition
        result = await supabase
          .from('loans')
          .update(loanData)
          .eq('id', loanId)
          .eq('user_id', session.user.id)
      } else {
        // Mode création
        result = await supabase
          .from('loans')
          .insert([loanData])
      }

      if (result.error) throw result.error

      toast({
        title: loanId ? "Prêt modifié" : "Prêt ajouté",
        description: loanId 
          ? "Le prêt a été modifié avec succès." 
          : "Le prêt a été ajouté avec succès."
      })

      if (onSuccess) onSuccess()
      onClose()
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{loanId ? 'Modifier le prêt' : 'Ajouter un prêt'}</DialogTitle>
          <DialogDescription>
            {loanId 
              ? 'Modifiez les informations du prêt ci-dessous.' 
              : 'Remplissez le formulaire pour ajouter un nouveau prêt.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du prêt</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              placeholder="ex: Prêt principal"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="loan_type">Type de prêt</Label>
            <Select
              value={formData.loan_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, loan_type: value }))}
              required
            >
              <SelectTrigger id="loan_type">
                <SelectValue placeholder="Sélectionner un type de prêt" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Prêt immobilier">Prêt immobilier</SelectItem>
                <SelectItem value="Prêt travaux">Prêt travaux</SelectItem>
                <SelectItem value="Prêt personnel">Prêt personnel</SelectItem>
                <SelectItem value="Autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Montant emprunté (€)</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                required
                placeholder="ex: 200000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loan_duration_years">Durée (années)</Label>
              <Input
                id="loan_duration_years"
                type="number"
                min="1"
                max="40"
                value={formData.loan_duration_years}
                onChange={(e) => setFormData(prev => ({ ...prev, loan_duration_years: e.target.value }))}
                required
                placeholder="ex: 20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interest_rate">Taux d'intérêt (%)</Label>
              <Input
                id="interest_rate"
                type="number"
                min="0"
                max="100"
                step="0.001"
                value={formData.interest_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, interest_rate: e.target.value }))}
                required
                placeholder="ex: 2.5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="insurance_rate">Taux d'assurance (%)</Label>
              <Input
                id="insurance_rate"
                type="number"
                min="0"
                max="100"
                step="0.001"
                value={formData.insurance_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, insurance_rate: e.target.value }))}
                placeholder="ex: 0.36"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Date de début</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_day">Jour de paiement mensuel</Label>
              <Input
                id="payment_day"
                type="number"
                min="1"
                max="31"
                value={formData.payment_day}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_day: e.target.value }))}
                placeholder="ex: 15"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthly_payment" className="flex items-center">
                Mensualité calculée (€)
                <span className="ml-2 inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-800">
                  Auto
                </span>
              </Label>
              <Input
                id="monthly_payment"
                type="number"
                min="0"
                step="0.01"
                value={formData.monthly_payment}
                onChange={(e) => setFormData(prev => ({ ...prev, monthly_payment: e.target.value }))}
                placeholder="Calculé automatiquement"
                className="bg-indigo-50 border-indigo-200 text-indigo-900 font-medium"
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date" className="flex items-center">
                Date de fin calculée
                <span className="ml-2 inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-800">
                  Auto
                </span>
              </Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                className="bg-indigo-50 border-indigo-200 text-indigo-900 font-medium"
                readOnly
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remaining_capital" className="flex items-center">
              Capital restant dû (€)
              <span className="ml-2 inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-800">
                Auto
              </span>
            </Label>
            <Input
              id="remaining_capital"
              type="number"
              min="0"
              step="0.01"
              value={formData.remaining_capital}
              onChange={(e) => setFormData(prev => ({ ...prev, remaining_capital: e.target.value }))}
              placeholder="Calculé automatiquement"
              className="bg-indigo-50 border-indigo-200 text-indigo-900 font-medium"
              readOnly
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Informations complémentaires sur le prêt..."
              className="min-h-[80px]"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button variant="outline" type="button" onClick={onClose}>
                Annuler
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
                {isLoading ? 'Enregistrement...' : loanId ? 'Modifier' : 'Ajouter'}
              </Button>
            </motion.div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
