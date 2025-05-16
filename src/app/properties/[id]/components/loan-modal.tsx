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
import { motion, AnimatePresence } from 'framer-motion'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CreditCard, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'; // adapte le chemin si besoin

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
    loan_duration_years: '20',
    repayment_type: 'amortissable', // 'amortissable' ou 'in fine'
    amortization_profile: 'constant', // 'constant' ou 'classique' (nouveau champ)
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
          loan_duration_years: '20',
          repayment_type: 'amortissable',
          amortization_profile: 'constant',
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
          loan_duration_years: loanDurationYears,
          repayment_type: data.repayment_type || 'amortissable',
          amortization_profile: data.amortization_profile || 'constant',
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
                           referenceDate.getMonth() - startDate.getMonth()
      
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

  // --- Nouvelle gestion co-emprunteurs : liste à cocher ---
  const [allCoBorrowers, setAllCoBorrowers] = useState<any[]>([]);
  const [coBorrowers, setCoBorrowers] = useState<any[]>([]);
  const [newCoBorrower, setNewCoBorrower] = useState({
    first_name: '',
    last_name: '',
    email: '',
    share: 50,
  });
  const [isLoadingCoBorrowers, setIsLoadingCoBorrowers] = useState(false);
  const [editingShareId, setEditingShareId] = useState<string | null>(null);
  const [editingShareValue, setEditingShareValue] = useState<number>(50);

  // Charger tous les co-emprunteurs à l'ouverture
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const { data } = await supabase.from('co_borrowers').select('*');
      setAllCoBorrowers(data || []);
    })();
  }, [isOpen]);

  // Charger les co-emprunteurs associés au prêt
  useEffect(() => {
    if (!loanId) return;
    setIsLoadingCoBorrowers(true);
    supabase
      .from('loan_co_borrowers')
      .select('id, share, co_borrower_id, loan_id, co_borrowers(*)')
      .eq('loan_id', loanId)
      .then(({ data }) => setCoBorrowers(data || []))
      .finally(() => setIsLoadingCoBorrowers(false));
  }, [loanId, isOpen]);

  // Mapping sécurisé pour éviter undefined
  const associatedCoBorrowerIds = coBorrowers
    .map(cb => cb && cb.co_borrower_id ? String(cb.co_borrower_id) : null)
    .filter(Boolean);

  // Associer/dissocier un co-emprunteur
  const handleToggleCoBorrower = async (coBorrowerId: string, checked: boolean) => {
    setIsLoadingCoBorrowers(true);
    if (checked) {
      // Vérifie s'il existe déjà côté front
      if (coBorrowers.some(cb => cb.co_borrower_id === coBorrowerId)) {
        toast({
          title: "Déjà associé",
          description: "Ce co-emprunteur est déjà lié à ce prêt.",
          variant: "default",
        });
        setIsLoadingCoBorrowers(false);
        return;
      }
      // Vérifie s'il existe déjà côté back (sécurité)
      const { data: existing } = await supabase
        .from('loan_co_borrowers')
        .select('*')
        .eq('loan_id', loanId)
        .eq('co_borrower_id', coBorrowerId);
      if (existing && existing.length > 0) {
        toast({
          title: "Déjà associé (base)",
          description: "Ce co-emprunteur est déjà lié à ce prêt (base).",
          variant: "default",
        });
        setIsLoadingCoBorrowers(false);
        return;
      }
      // DEBUG
      console.log('INSERT loan_co_borrowers', { loan_id: loanId, co_borrower_id: coBorrowerId, share: 0 });
      const { data: insertData, error: insertError } = await supabase
        .from('loan_co_borrowers')
        .insert([{ loan_id: loanId, co_borrower_id: coBorrowerId, share: 0 }]);
      if (insertError) {
        console.error('Erreur insert loan_co_borrowers', insertError);
      } else {
        console.log('SUCCESS insert loan_co_borrowers', insertData);
      }
    } else {
      const { error: deleteError } = await supabase.from('loan_co_borrowers')
        .delete()
        .eq('loan_id', loanId)
        .eq('co_borrower_id', coBorrowerId);
      if (deleteError) {
        console.error('Erreur delete loan_co_borrowers', deleteError);
      } else {
        console.log('SUCCESS delete loan_co_borrowers', { loan_id: loanId, co_borrower_id: coBorrowerId });
      }
      // Après suppression, recalcul et update du % user connecté
      await updateCurrentUserShare(loanId);
    }
    // Refresh associations
    const { data } = await supabase
      .from('loan_co_borrowers')
      .select('id, share, co_borrower_id, loan_id, co_borrowers(*)')
      .eq('loan_id', loanId);
    setCoBorrowers(data || []);
    setIsLoadingCoBorrowers(false);
    // Rafraîchir la liste principale des prêts si onSuccess est fourni
    if (onSuccess) onSuccess();
  };


  // Modification part (%) inline
  const handleUpdateShare = async (loanId: string, coBorrowerId: string) => {
    setIsLoadingCoBorrowers(true);
    await supabase.from('loan_co_borrowers').update({ share: editingShareValue }).eq('loan_id', loanId).eq('co_borrower_id', coBorrowerId);

    // 1. Recharger tous les co-emprunteurs (pour avoir les parts à jour)
    const { data: allShares } = await supabase.from('loan_co_borrowers').select('id, share, co_borrower_id, loan_id, co_borrowers(*)').eq('loan_id', loanId);
    setCoBorrowers(allShares || []);

    // 2. Recalculer la part du user connecté (email)
    const session = await supabase.auth.getSession();
    const userEmail = session?.data?.session?.user?.email;
    if (userEmail && Array.isArray(allShares)) {
      // Somme des parts des autres co-emprunteurs (hors user connecté)
      let sumOthers = 0;
      let userEntry = allShares.find(cb => cb.co_borrowers && cb.co_borrowers.email === userEmail);
      allShares.forEach(cb => {
        if (!cb.co_borrowers || cb.co_borrowers.email !== userEmail) {
          sumOthers += Number(cb.share) || 0;
        }
      });
      const userShare = 100 - sumOthers;
      // Si l'entrée user existe, update, sinon insert
      if (userEntry) {
        await supabase.from('loan_co_borrowers').update({ share: userShare }).eq('loan_id', loanId).eq('co_borrower_id', userEntry.co_borrower_id);
      } else {
        // Trouver le co_borrower_id du user connecté (via email)
        const { data: coBorrowersList } = await supabase.from('co_borrowers').select('id').eq('email', userEmail).single();
        if (coBorrowersList && coBorrowersList.id) {
          await supabase.from('loan_co_borrowers').insert({ loan_id: loanId, co_borrower_id: coBorrowersList.id, share: userShare });
        }
      }
    }
    setEditingShareId(null);
    setIsLoadingCoBorrowers(false);
    // Rafraîchir la liste principale des prêts si onSuccess est fourni (comportement identique à handleToggleCoBorrower)
    if (onSuccess) onSuccess();
  };

  // Ajout rapide d'un nouveau co-emprunteur (optionnel)
  const handleAddCoBorrower = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingCoBorrowers(true);
    // N’envoie que les champs existants dans la table co_borrowers !
    const { data: created, error: err1 } = await supabase
      .from('co_borrowers')
      .insert([
        {
          first_name: newCoBorrower.first_name,
          last_name: newCoBorrower.last_name,
          email: newCoBorrower.email,
        }
      ])
      .select()
      .single();

    if (err1) {
      // Gérer l’erreur ici (afficher un message ou log)
      setIsLoadingCoBorrowers(false);
      return;
    }

    // Rafraîchir la liste globale
    const { data } = await supabase.from('co_borrowers').select('*');
    setAllCoBorrowers(data || []);
    setNewCoBorrower({ first_name: '', last_name: '', email: '' });
    setIsLoadingCoBorrowers(false);
  };

  // Factorisation : recalcul et update du % du user connecté
  const updateCurrentUserShare = async (loanId: string) => {
    const { data: allShares } = await supabase
      .from('loan_co_borrowers')
      .select('id, share, co_borrower_id, loan_id, co_borrowers(*)')
      .eq('loan_id', loanId);
    setCoBorrowers(allShares || []);
    const session = await supabase.auth.getSession();
    const userEmail = session?.data?.session?.user?.email;
    if (userEmail && Array.isArray(allShares)) {
      let sumOthers = 0;
      let userEntry = allShares.find(cb => cb.co_borrowers && cb.co_borrowers.email === userEmail);
      allShares.forEach(cb => {
        if (!cb.co_borrowers || cb.co_borrowers.email !== userEmail) {
          sumOthers += Number(cb.share) || 0;
        }
      });
      const userShare = 100 - sumOthers;
      if (userEntry) {
        await supabase.from('loan_co_borrowers').update({ share: userShare }).eq('loan_id', loanId).eq('co_borrower_id', userEntry.co_borrower_id);
      }
    }
  };

  const handleRemoveCoBorrower = async (coBorrowerId: string) => {
    setIsLoadingCoBorrowers(true);
    await supabase
      .from('loan_co_borrowers')
      .delete()
      .eq('loan_id', loanId)
      .eq('co_borrower_id', coBorrowerId);
    await updateCurrentUserShare(loanId);
    setIsLoadingCoBorrowers(false);
    if (onSuccess) onSuccess();
  };



  const handleEditShare = (id: string, currentShare: number) => {
    setEditingShareId(id);
    setEditingShareValue(currentShare);
  };

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
          for (let i = 0; i <monthsElapsed; i++) {
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
        notes: formData.notes,
        repayment_type: formData.repayment_type,
        amortization_profile: formData.amortization_profile,
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

  // --- Fonctions pour modifier/supprimer un co-emprunteur globalement ---
  const handleDeleteCoBorrower = async (coBorrowerId: string) => {
    setIsLoadingCoBorrowers(true);
    // Supprime le co-emprunteur dans la table co_borrowers (et donc toutes ses associations)
    await supabase.from('co_borrowers').delete().eq('id', coBorrowerId);
    // Refresh la liste globale
    const { data: all } = await supabase.from('co_borrowers').select('*');
    setAllCoBorrowers(all || []);
    // Refresh les associations pour ce crédit
    const { data: assoc } = await supabase.from('loan_co_borrowers').select('id, share, co_borrower_id, loan_id, co_borrowers(*)').eq('loan_id', loanId);
    setCoBorrowers(assoc || []);
    // Après suppression globale, recalcul et update du % user connecté
    await updateCurrentUserShare(loanId);
    setIsLoadingCoBorrowers(false);
    // Rafraîchir la liste principale des prêts si onSuccess est fourni (comportement identique à handleUpdateShare)
    if (onSuccess) onSuccess();
  };

  // State pour la modale d’édition
  const [editingCoBorrower, setEditingCoBorrower] = useState<any>(null);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '' });
  const [isEditing, setIsEditing] = useState(false);

  // Ouvre la modale avec les infos préremplies
  const openEditModal = (coBorrower: any) => {
    setEditingCoBorrower(coBorrower);
    setEditForm({
      first_name: coBorrower.first_name,
      last_name: coBorrower.last_name,
      email: coBorrower.email,
    });
    setIsEditing(true);
  };

  // Soumission du formulaire
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoBorrower) return;
    await supabase
      .from('co_borrowers')
      .update({
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        email: editForm.email,
      })
      .eq('id', editingCoBorrower.id);
    // Rafraîchir la liste globale
    const { data } = await supabase.from('co_borrowers').select('*');
    setAllCoBorrowers(data || []);
    setIsEditing(false);
    setEditingCoBorrower(null);
  };

  const handleEditCoBorrower = (coBorrower: any) => {
    openEditModal(coBorrower);
  };

  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // Association automatique de l’utilisateur connecté au prêt si absent
  useEffect(() => {
    if (!user || !loanId) return;

    // 1. Vérifier si le user existe dans co_borrowers
    supabase
      .from('co_borrowers')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()
      .then(async ({ data: coBorrower }) => {
        if (!coBorrower) {
          // 2. Créer le co-borrower minimal si absent
          await supabase.from('co_borrowers').insert([{
            id: user.id,
            first_name: user.user_metadata?.first_name || '',
            last_name: user.user_metadata?.last_name || '',
            email: user.email || ''
          }]);
        }

        // 3. Vérifier l’association dans loan_co_borrowers
        supabase
          .from('loan_co_borrowers')
          .select('id')
          .eq('loan_id', loanId)
          .eq('co_borrower_id', user.id)
          .maybeSingle()
          .then(({ data: existing }) => {
            if (!existing) {
              supabase.from('loan_co_borrowers').insert([
                { loan_id: loanId, co_borrower_id: user.id, share: 50 }
              ]).then(() => {
                supabase
                  .from('loan_co_borrowers')
                  .select('id, share, co_borrower_id, loan_id, co_borrowers(*)')
                  .eq('loan_id', loanId)
                  .then(({ data }) => setCoBorrowers(data || []));
              });
            }
          });
      });
  }, [user, loanId]);

  const filteredCoBorrowers = allCoBorrowers.filter(cb => cb && (cb.id || cb.email || cb.first_name || cb.last_name));

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="w-full max-w-[95vw] overflow-x-hidden sm:max-w-[560px] rounded-2xl shadow-2xl bg-gradient-to-br from-white via-blue-50 to-blue-100 border-0">
            <DialogTitle>Modifier le prêt</DialogTitle>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <DialogHeader className="mb-2">
                <div className="flex items-center gap-3 mb-1">
                  <CreditCard className="w-7 h-7 text-blue-500 bg-blue-100 rounded-full p-1 shadow-md" />
                  <DialogTitle className="text-xl font-bold text-blue-800">
                    {loanId ? 'Modifier le prêt' : 'Ajouter un prêt'}
                  </DialogTitle>
                </div>
                <DialogDescription className="text-sm text-blue-700/80">
                  {loanId 
                    ? 'Modifiez les informations du prêt ci-dessous.' 
                    : 'Remplissez le formulaire pour ajouter un nouveau prêt.'}
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="infos" className="w-full mt-2">
                <TabsList className="w-full mb-4 bg-blue-100/70">
                  <TabsTrigger value="infos" className="w-1/2 data-[state=active]:bg-blue-200 data-[state=active]:text-blue-900">
                    <CreditCard className="w-4 h-4 mr-1" /> Informations
                  </TabsTrigger>
                  <TabsTrigger value="co-borrowers" className="w-1/2 data-[state=active]:bg-blue-200 data-[state=active]:text-blue-900">
                    <Users className="w-4 h-4 mr-1" /> Co-emprunteurs
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="infos" asChild>
                  <motion.form
                    onSubmit={handleSubmit}
                    className="space-y-4"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom du prêt</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        required
                        placeholder="ex: Prêt principal"
                        className="rounded-lg focus:ring-2 focus:ring-blue-300"
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

                    <div className="space-y-2">
                      <Label htmlFor="repayment_type">Type de remboursement</Label>
                      <Select
                        value={formData.repayment_type}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, repayment_type: value }))}
                        required
                      >
                        <SelectTrigger id="repayment_type">
                          <SelectValue placeholder="Sélectionner un type de remboursement" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="amortissable">Prêt classique (remboursement progressif)</SelectItem>
                          <SelectItem value="in fine">Prêt in fine</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.repayment_type === 'amortissable' && (
                      <div className="space-y-2 mt-2">
                        <Label htmlFor="amortization_profile">Profil d'amortissement</Label>
                        <Select
                          value={formData.amortization_profile}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, amortization_profile: value }))}
                          required
                        >
                          <SelectTrigger id="amortization_profile">
                            <SelectValue placeholder="Sélectionner un profil d'amortissement" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="classique">Mensualités constantes (annuité classique)</SelectItem>
                            <SelectItem value="constant">Amortissement constant (mensualités dégressives)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

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
                          className="rounded-lg focus:ring-2 focus:ring-blue-300"
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
                          className="rounded-lg focus:ring-2 focus:ring-blue-300"
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
                          className="rounded-lg focus:ring-2 focus:ring-blue-300"
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
                          className="rounded-lg focus:ring-2 focus:ring-blue-300"
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
                          className="rounded-lg focus:ring-2 focus:ring-blue-300"
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
                          className="rounded-lg focus:ring-2 focus:ring-blue-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="monthly_payment" className="flex items-center">
                          Mensualité calculée (€)
                          <span className="ml-2 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
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
                          className="bg-blue-50 border-blue-200 text-blue-900 font-medium rounded-lg focus:ring-2 focus:ring-blue-300"
                          readOnly
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="end_date" className="flex items-center">
                          Date de fin calculée
                          <span className="ml-2 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
                            Auto
                          </span>
                        </Label>
                        <Input
                          id="end_date"
                          type="date"
                          value={formData.end_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                          className="bg-blue-50 border-blue-200 text-blue-900 font-medium rounded-lg focus:ring-2 focus:ring-blue-300"
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="remaining_capital" className="flex items-center">
                        Capital restant dû (€)
                        <span className="ml-2 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
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
                        className="bg-blue-50 border-blue-200 text-blue-900 font-medium rounded-lg focus:ring-2 focus:ring-blue-300"
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
                        className="min-h-[80px] rounded-lg focus:ring-2 focus:ring-blue-300"
                      />
                    </div>

                    <div className="flex justify-end space-x-2 mt-2">
                      <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                        <Button variant="outline" type="button" onClick={onClose} className="rounded-lg border-blue-200">
                          Annuler
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                        <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md">
                          {isLoading ? 'Enregistrement...' : loanId ? 'Modifier' : 'Ajouter'}
                        </Button>
                      </motion.div>
                    </div>
                  </motion.form>
                </TabsContent>
                <TabsContent value="co-borrowers" asChild>
                  <motion.div
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="space-y-5">
                      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-blue-800">
                        <Users className="w-5 h-5" /> Associer des co-emprunteurs
                      </h3>
                      <div className="max-h-60 overflow-y-auto overflow-x-hidden bg-blue-50 rounded-lg p-3 border border-blue-100">
                        {/* Affichage de l'utilisateur connecté (toujours coché, part grisée, pas de modif) */}
                        {user && (
                          <li key={`me-${user?.id || 'current'}`} className="flex flex-wrap items-center justify-between bg-white rounded px-2 py-1 border border-blue-100 mb-1">
                            <label className="flex items-center gap-2 font-bold text-blue-700">
                              <input
                                type="checkbox"
                                checked={true}
                                disabled
                              />
                              <span className="font-semibold text-gray-800">Moi ({user.email})</span>
                            </label>
                            {/* Calcul du pourcentage du user connecté */}
                            <span className="ml-2 px-2 py-0.5 rounded bg-gray-100 text-gray-400 border border-gray-200 text-xs">
                              {(() => {
                                if (!coBorrowers || coBorrowers.length === 0) return '100%';
                                const othersShare = coBorrowers.filter(cb => cb.co_borrowers?.id !== user.id).reduce((sum, cb) => sum + (cb.share || 0), 0);
                                return `${Math.max(0, 100 - othersShare)}%`;
                              })()}
                            </span>
                            {/* Bouton Modifier part grisé et désactivé */}
                            <button className="ml-2 text-gray-400 cursor-not-allowed text-xs font-normal" disabled>Modifier</button>
                            {/* Bouton Modifier infos grisé et désactivé */}
                            <button className="ml-1 text-gray-300 cursor-not-allowed text-xs font-normal" disabled>Modifier infos</button>
                          </li>
                        )}
                        {/* Autres co-emprunteurs (hors user connecté) */}
                        <ul className="space-y-3">
                          <AnimatePresence>
                            {filteredCoBorrowers.filter(cb => cb.id !== user?.id).map((cb, index) => {
                              const key = cb?.id ? `cbid-${cb.id}-${index}`
                                : cb?.email ? `cbmail-${cb.email}-${index}`
                                : cb?.first_name || cb?.last_name ? `cbname-${cb.first_name || ''}-${cb.last_name || ''}-${index}`
                                : `cbidx-${index}`;
                              return (
                                <motion.li
                                  key={key}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="flex flex-wrap items-center justify-between bg-white rounded px-2 py-1 border border-blue-100"
                                >
                                  <label className="flex items-center gap-2 cursor-pointer w-full">
                                    <input
                                      type="checkbox"
                                      checked={associatedCoBorrowerIds.includes(String(cb.id))}
                                      onChange={e => handleToggleCoBorrower(cb.id, e.target.checked)}
                                      disabled={isLoadingCoBorrowers}
                                      className="accent-blue-600"
                                    />
                                    <span className="font-medium text-blue-900">
                                      {cb.first_name} {cb.last_name} <span className="text-gray-500">({cb.email || "—"})</span>
                                    </span>
                                  </label>
                                  <div className="flex items-center gap-2 ml-2">
                                    <button
                                      className="text-red-600 hover:text-red-800"
                                      onClick={async () => {
                                        setIsLoadingCoBorrowers(true);
                                        const { data: associations, error } = await supabase
                                          .from('loan_co_borrowers')
                                          .select('loan_id')
                                          .eq('co_borrower_id', cb.id);
                                        setIsLoadingCoBorrowers(false);
                                        if (error) {
                                          toast({
                                            title: "Erreur",
                                            description: "Impossible de vérifier les associations du co-emprunteur.",
                                            variant: "destructive",
                                          });
                                          return;
                                        }
                                        if (associations && associations.length > 1) {
                                          toast({
                                            title: "Suppression impossible",
                                            description: "Ce co-emprunteur est encore associé à d'autres prêts. Veuillez d'abord le dissocier de tous les prêts avant de le supprimer.",
                                            variant: "destructive",
                                          });
                                          return;
                                        }
                                        if (window.confirm('Voulez-vous vraiment supprimer ce co-emprunteur de la base ? Cette action est irréversible.')) {
                                          await handleDeleteCoBorrower(cb.id);
                                        }
                                      }}
                                      type="button"
                                      disabled={isLoadingCoBorrowers}
                                      title="Supprimer ce co-emprunteur de la base"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5-4h4a2 2 0 0 1 2 2v2H7V5a2 2 0 0 1 2-2zm-3 6h10" />
                                      </svg>
                                    </button>
                                    {associatedCoBorrowerIds.includes(String(cb.id)) && (
                                      <>
                                        {editingShareId === cb.id ? (
                                          <>
                                            <input
                                              type="number"
                                              min={1}
                                              max={100}
                                              value={editingShareValue}
                                              onChange={e => setEditingShareValue(Number(e.target.value))}
                                              className="w-16 rounded border-blue-200 focus:ring-2 focus:ring-blue-400 text-center text-sm"
                                            />
                                            <button
                                              className="text-blue-700 font-semibold hover:underline text-sm"
                                              onClick={() => handleUpdateShare(loanId, cb.id)}
                                              type="button"
                                              disabled={isLoadingCoBorrowers}
                                            >
                                              Valider
                                            </button>
                                            <button
                                              className="text-gray-500 hover:underline text-sm"
                                              onClick={() => setEditingShareId(null)}
                                              type="button"
                                              disabled={isLoadingCoBorrowers}
                                            >
                                              Annuler
                                            </button>
                                          </>
                                        ) : (
                                          <>
                                            <span className="text-xs text-blue-700 font-semibold bg-blue-50 rounded px-2 py-0.5 border border-blue-200">
                                              {coBorrowers.find(a => String(a.co_borrower_id) === String(cb.id))?.share ?? 0}%
                                            </span>
                                            <button
                                              className="text-blue-700 hover:underline text-xs font-normal ml-1"
                                              onClick={() => handleEditShare(cb.id, coBorrowers.find(a => String(a.co_borrower_id) === String(cb.id))?.share ?? 0)}
                                              type="button"
                                              disabled={isLoadingCoBorrowers}
                                            >
                                              Modifier
                                            </button>
                                            <button
                                              className="text-blue-700 hover:underline text-xs font-normal ml-1"
                                              onClick={() => handleEditCoBorrower(cb)}
                                              type="button"
                                              disabled={isLoadingCoBorrowers}
                                            >
                                              Modifier infos
                                            </button>
                                          </>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </motion.li>
                              );
                            })}
                          </AnimatePresence>
                        </ul>
                      </div>
                      {/* Ajout rapide d'un nouveau co-emprunteur (optionnel) */}
                      <div className="mt-4">
                        <h4 className="font-semibold text-blue-800 mb-1">Ajouter un nouveau co-emprunteur</h4>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Prénom"
                            value={newCoBorrower.first_name}
                            onChange={e => setNewCoBorrower(prev => ({ ...prev, first_name: e.target.value }))}
                            required
                            className="rounded-lg focus:ring-2 focus:ring-blue-300"
                          />
                          <Input
                            placeholder="Nom"
                            value={newCoBorrower.last_name}
                            onChange={e => setNewCoBorrower(prev => ({ ...prev, last_name: e.target.value }))}
                            required
                            className="rounded-lg focus:ring-2 focus:ring-blue-300"
                          />
                          <Input
                            placeholder="Email"
                            value={newCoBorrower.email}
                            onChange={e => setNewCoBorrower(prev => ({ ...prev, email: e.target.value }))}
                            type="email"
                            className="rounded-lg focus:ring-2 focus:ring-blue-300"
                          />
                          <Button
                            type="button"
                            disabled={isLoadingCoBorrowers}
                            onClick={handleAddCoBorrower}
                            className="bg-blue-500 hover:bg-blue-700 text-white rounded-lg shadow"
                          >
                            Ajouter
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </TabsContent>
              </Tabs>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
      {isEditing && (
        <Dialog key={editingCoBorrower?.id || 'edit-co-borrower'} open={isEditing} onOpenChange={() => setIsEditing(false)}>
          <DialogContent key={editingCoBorrower?.id || 'edit-co-borrower'} className="w-full max-w-[400px] p-6 rounded-xl shadow-lg bg-white border border-gray-200">
            <DialogTitle className="text-lg font-semibold text-gray-800 mb-2 text-center">Modifier le co-emprunteur</DialogTitle>
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600 font-medium" htmlFor="edit-first-name">Prénom</label>
                <input
                  id="edit-first-name"
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-900 bg-gray-50"
                  placeholder="Prénom"
                  value={editForm.first_name}
                  onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600 font-medium" htmlFor="edit-last-name">Nom</label>
                <input
                  id="edit-last-name"
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-900 bg-gray-50"
                  placeholder="Nom"
                  value={editForm.last_name}
                  onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600 font-medium" htmlFor="edit-email">Email</label>
                <input
                  id="edit-email"
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-900 bg-gray-50"
                  placeholder="Email"
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" className="px-4 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 transition" onClick={() => setIsEditing(false)}>
                  Annuler
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition">
                  Enregistrer
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  )
}
