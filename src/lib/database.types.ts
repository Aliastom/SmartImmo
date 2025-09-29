export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string
          user_id: string
          property_id: string | null
          type_id: string | null
          name: string
          file_path: string
          file_size: number
          mime_type: string
          uploaded_at: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          property_id?: string | null
          type_id?: string | null
          name: string
          file_path: string
          file_size: number
          mime_type: string
          uploaded_at?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          property_id?: string | null
          type_id?: string | null
          name?: string
          file_path?: string
          file_size?: number
          mime_type?: string
          uploaded_at?: string
          metadata?: Json | null
        }
      }
      properties: {
        Row: {
          id: string
          name: string
          user_id: string
        }
      }
      types: {
        Row: {
          id: string
          name: string
          category_id: string | null
        }
      }
      categories: {
        Row: {
          id: string
          name: string
        }
      }
    }
  }
}
