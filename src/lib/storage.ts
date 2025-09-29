import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'

export const STORAGE_BUCKETS = {
  LEASES: 'leases',
  DOCUMENTS: 'documents',
  PROPERTY_PHOTOS: 'property-photos'
} as const

type BucketName = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS]

export class StorageService {
  private supabase = createClientComponentClient<Database>()
  private bucket: BucketName

  constructor(bucket: BucketName) {
    this.bucket = bucket
  }

  /**
   * Upload un fichier dans le bucket spécifié
   */
  async uploadFile(
    file: File,
    path: string,
    metadata?: Record<string, string>
  ): Promise<{ path: string; url: string }> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${path}.${fileExt}`

    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
        ...(metadata && { metadata })
      })

    if (error) {
      throw new Error(`Erreur lors de l'upload du fichier: ${error.message}`)
    }

    // Récupérer l'URL publique
    const { data: { publicUrl } } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(data.path)

    return {
      path: data.path,
      url: publicUrl
    }
  }

  /**
   * Supprime un fichier du stockage
   */
  async deleteFile(path: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(this.bucket)
      .remove([path])

    if (error) {
      throw new Error(`Erreur lors de la suppression du fichier: ${error.message}`)
    }
  }

  /**
   * Génère un lien de téléchargement signé
   */
  async getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .createSignedUrl(path, expiresIn)

    if (error) {
      throw new Error(`Erreur lors de la génération du lien: ${error.message}`)
    }

    return data.signedUrl
  }

  /**
   * Vérifie si un fichier existe
   */
  async fileExists(path: string): Promise<boolean> {
    const { data } = await this.supabase.storage
      .from(this.bucket)
      .list(undefined, {
        search: path
      })

    return (data?.length ?? 0) > 0
  }

  /**
   * Télécharge un fichier sous forme de blob
   */
  async downloadFile(path: string): Promise<Blob> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .download(path)

    if (error) {
      throw new Error(`Erreur lors du téléchargement du fichier: ${error.message}`)
    }

    return data
  }
}

// Instances prédéfinies pour chaque type de stockage
export const leaseStorage = new StorageService(STORAGE_BUCKETS.LEASES)
export const documentStorage = new StorageService(STORAGE_BUCKETS.DOCUMENTS)
export const propertyPhotoStorage = new StorageService(STORAGE_BUCKETS.PROPERTY_PHOTOS)
