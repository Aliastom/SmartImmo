import { GenerateLeaseForm } from '@/app/leases/components/generate-lease/GenerateLeaseForm'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nouveau bail',
  description: 'Créez un nouveau bail de location',
}

export default function NewLeasePage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Nouveau bail de location</h1>
        <p className="text-muted-foreground">
          Remplissez les informations ci-dessous pour générer un nouveau bail
        </p>
      </div>
      
      <div className="bg-card rounded-lg border p-6 shadow-sm">
        <GenerateLeaseForm />
      </div>
    </div>
  )
}
