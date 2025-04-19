'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'
import { useEffect, useState } from "react"

interface TaxFormProps {
  year: number
}

interface TransactionSummary {
  propertyTaxes: number
  insurance: number
  managementFees: number
  repairs: number
  rentalIncome: number
}

export function TaxForm({ year }: TaxFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [transactions, setTransactions] = useState<TransactionSummary>({
    propertyTaxes: 0,
    insurance: 0,
    managementFees: 0,
    repairs: 0,
    rentalIncome: 0
  })
  const [formData, setFormData] = useState({
    salary_income: 0,
    loan_interests: 0,
    retirement_savings: 0,
    tax_situation: 'célibataire',
    number_of_children: 0
  })
  const { toast } = useToast()
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadTaxProfile()
    loadTransactions()
  }, [year])

  const loadTaxProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase
        .from('tax_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('fiscal_year', year)
        .single()

      if (error) throw error

      if (data) {
        setFormData({
          salary_income: data.salary_income,
          loan_interests: data.loan_interests,
          retirement_savings: data.retirement_savings,
          tax_situation: data.tax_situation,
          number_of_children: data.number_of_children
        })
      }
    } catch (error) {
      console.error('Error loading tax profile:', error)
    }
  }

  const loadTransactions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const startDate = `${year}-01-01`
      const endDate = `${year}-12-31`

      const { data, error } = await supabase
        .from('transactions')
        .select('type, category, amount')
        .eq('user_id', session.user.id)
        .gte('date', startDate)
        .lte('date', endDate)

      if (error) throw error

      const summary = data.reduce((acc, transaction) => {
        switch (transaction.category) {
          case 'taxe_fonciere':
            acc.propertyTaxes += transaction.amount
            break
          case 'assurance':
            acc.insurance += transaction.amount
            break
          case 'frais_gestion':
            acc.managementFees += transaction.amount
            break
          case 'reparation':
            acc.repairs += transaction.amount
            break
          case 'loyer':
            if (transaction.type === 'income') {
              acc.rentalIncome += transaction.amount
            }
            break
        }
        return acc
      }, {
        propertyTaxes: 0,
        insurance: 0,
        managementFees: 0,
        repairs: 0,
        rentalIncome: 0
      })

      setTransactions(summary)
    } catch (error) {
      console.error('Error loading transactions:', error)
    }
  }

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
        return
      }

      const { error } = await supabase
        .from('tax_profiles')
        .upsert({
          user_id: session.user.id,
          fiscal_year: year,
          ...formData
        })

      if (error) throw error

      toast({
        title: "Succès",
        description: "Les données fiscales ont été enregistrées"
      })
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Données des transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Données des transactions {year}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Revenus locatifs</Label>
              <Input
                type="number"
                value={transactions.rentalIncome}
                disabled
              />
            </div>
            <div>
              <Label>Taxe foncière</Label>
              <Input
                type="number"
                value={transactions.propertyTaxes}
                disabled
              />
            </div>
            <div>
              <Label>Assurance</Label>
              <Input
                type="number"
                value={transactions.insurance}
                disabled
              />
            </div>
            <div>
              <Label>Frais de gestion</Label>
              <Input
                type="number"
                value={transactions.managementFees}
                disabled
              />
            </div>
            <div>
              <Label>Réparations et entretien</Label>
              <Input
                type="number"
                value={transactions.repairs}
                disabled
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Données complémentaires */}
      <Card>
        <CardHeader>
          <CardTitle>Données complémentaires</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Revenus salariés</Label>
              <Input
                type="number"
                value={formData.salary_income}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  salary_income: parseFloat(e.target.value) || 0
                }))}
                required
              />
            </div>
            <div>
              <Label>Intérêts d'emprunt</Label>
              <Input
                type="number"
                value={formData.loan_interests}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  loan_interests: parseFloat(e.target.value) || 0
                }))}
                required
              />
            </div>
            <div>
              <Label>PER</Label>
              <Input
                type="number"
                value={formData.retirement_savings}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  retirement_savings: parseFloat(e.target.value) || 0
                }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Situation fiscale</Label>
              <Select
                value={formData.tax_situation}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  tax_situation: value
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="célibataire">Célibataire</SelectItem>
                  <SelectItem value="marié">Marié(e)</SelectItem>
                  <SelectItem value="pacsé">Pacsé(e)</SelectItem>
                  <SelectItem value="veuf">Veuf/Veuve</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nombre d'enfants</Label>
              <Input
                type="number"
                min="0"
                value={formData.number_of_children}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  number_of_children: parseInt(e.target.value) || 0
                }))}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <i className="fas fa-circle-notch fa-spin mr-2"></i>
            Enregistrement...
          </>
        ) : (
          <>
            <i className="fas fa-save mr-2"></i>
            Enregistrer
          </>
        )}
      </Button>
    </form>
  )
}
