import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const documentId = params.id
  
  if (!documentId) {
    return new NextResponse('Document ID is required', { status: 400 })
  }

  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    
    // Vérifier la session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
    
    // Récupérer les informations du document
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', session.user.id)
      .single()
    
    if (documentError || !document) {
      return new NextResponse('Document not found', { status: 404 })
    }
    
    // Récupérer le fichier depuis le stockage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('documents')
      .download(document.file_path)
    
    if (fileError || !fileData) {
      return new NextResponse('File not found', { status: 404 })
    }
    
    // Créer une réponse avec le bon type MIME
    const response = new NextResponse(fileData)
    response.headers.set('Content-Type', document.mime_type)
    response.headers.set('Content-Disposition', `inline; filename="${document.name}"`)
    
    return response
  } catch (error) {
    console.error('Error fetching document:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
