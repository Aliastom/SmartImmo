import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import DocumentsTable from './components/documents-table'
import { Database } from '@/lib/database.types'

export default async function Documents2Page() {
  const cookieStore = cookies()
  const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore })
  
  // Récupérer la session utilisateur de manière asynchrone
  const { data: { session } } = await supabase.auth.getSession()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!session || !user) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Documents 2</h1>
        <p>Veuillez vous connecter pour accéder à cette page.</p>
      </div>
    )
  }

  // Récupérer les documents avec leurs relations
  const { data: documents, error } = await supabase
    .from('documents')
    .select(`
      *,
      properties:properties(*),
      types:types!inner(
        *,
        categories:categories(*)
      )
    `)
    .eq('user_id', user.id)
    .order('uploaded_at', { ascending: false })

  // Formater les données pour correspondre à l'interface attendue
  const formattedDocuments = documents?.map(doc => ({
    ...doc,
    property: doc.properties ? { name: doc.properties.name } : null,
    type: doc.types ? { 
      name: doc.types.name,
      category: doc.types.categories ? { name: doc.types.categories.name } : null
    } : null
  })) || []

  if (error) {
    console.error('Erreur lors du chargement des documents:', error)
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Documents 2</h1>
        <p>Erreur lors du chargement des documents. Veuillez réessayer.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Documents 2</h1>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <DocumentsTable documents={formattedDocuments} />
      </div>
    </div>
  )
}
