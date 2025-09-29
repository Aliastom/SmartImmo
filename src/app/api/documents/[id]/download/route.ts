import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Récupérer la session utilisateur
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return new NextResponse('Non autorisé', { status: 401 })
    }

    // Récupérer les informations du document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single()

    if (docError || !document) {
      return new NextResponse('Document non trouvé', { status: 404 })
    }

    // Télécharger le fichier depuis le stockage
    const { data: file, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.file_path)

    if (downloadError || !file) {
      console.error('Erreur lors du téléchargement du fichier:', downloadError)
      return new NextResponse('Erreur lors du téléchargement du fichier', { status: 500 })
    }

    // Créer la réponse avec le fichier
    const headers = new Headers()
    headers.set('Content-Type', document.mime_type || 'application/octet-stream')
    headers.set('Content-Disposition', `attachment; filename="${document.name}"`)
    
    return new NextResponse(file, {
      status: 200,
      headers
    })
    
  } catch (error) {
    console.error('Erreur lors du téléchargement du document:', error)
    return new NextResponse('Erreur interne du serveur', { status: 500 })
  }
}
