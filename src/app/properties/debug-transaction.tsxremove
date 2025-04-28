'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

export function DebugTransaction({ propertyId }: { propertyId: string }) {
  const supabase = createClientComponentClient<Database>()
  const { toast } = useToast()
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const testTransaction = async () => {
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

      // Créer une transaction de test simplifiée avec l'API REST directe
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${session.access_token}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          type: 'income', // Valeur correcte selon la contrainte de la base de données
          category: 'loyer', // Valeur correcte selon la contrainte de la base de données
          amount: 100,
          description: 'Test transaction',
          property_id: propertyId,
          user_id: session.user.id,
          accounting_month: new Date().toISOString().slice(0, 7) // Format YYYY-MM uniquement
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API error:', errorData)
        setDebugInfo({
          error: true,
          status: response.status,
          statusText: response.statusText,
          errorData: errorData
        })
        throw new Error(errorData.message || 'Erreur lors de l\'ajout de la transaction')
      } else {
        setDebugInfo({
          success: true,
          status: response.status,
          statusText: response.statusText
        })
        toast({
          title: "Test réussi",
          description: "Transaction de test ajoutée avec succès"
        })
      }
    } catch (error: any) {
      console.error('Debug error:', error)
      toast({
        title: "Erreur de débogage",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Débogage des transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={testTransaction} 
          disabled={isLoading}
          className="mb-4"
        >
          {isLoading ? 'Chargement...' : 'Tester une transaction'}
        </Button>
        
        {debugInfo && (
          <div className="mt-4 p-4 bg-gray-100 rounded-md overflow-auto">
            <pre className="text-xs">{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
