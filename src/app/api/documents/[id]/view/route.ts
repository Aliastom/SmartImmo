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

    // Obtenir l'URL signée pour le fichier
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('documents')
      .createSignedUrl(document.file_path, 3600) // Lien valide 1 heure

    if (urlError || !signedUrl) {
      console.error('Erreur lors de la génération de l\'URL signée:', urlError)
      return new NextResponse('Erreur lors de la génération du lien de prévisualisation', { status: 500 })
    }

    // Rediriger vers l'URL signée
    return NextResponse.redirect(signedUrl.signedUrl)
    
  } catch (error) {
    console.error('Erreur lors de la prévisualisation du document:', error)
    return new NextResponse('Erreur interne du serveur', { status: 500 })
  }
}
