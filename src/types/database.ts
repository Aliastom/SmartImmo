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
      properties: {
        Row: {
          id: string
          user_id: string
          name: string
          address: string
          city: string | null
          postal_code: string | null
          area: number
          bedrooms: number
          bathrooms: number
          status: 'vacant' | 'rented'
          rent: number
          value: number
          image_url: string | null
          created_at: string
          updated_at: string
          purchase_date: string | null
          property_tax: number | null
          housing_tax: number | null
          insurance: number | null
          management_fee_percentage: number | null
          loan_interest: number | null
          category: string | null
          type: string | null
          property_regime_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          address: string
          city?: string | null
          postal_code?: string | null
          area: number
          bedrooms: number
          bathrooms: number
          status?: 'vacant' | 'rented'
          rent: number
          value: number
          image_url?: string | null
          created_at?: string
          updated_at?: string
          purchase_date?: string | null
          property_tax?: number | null
          housing_tax?: number | null
          insurance?: number | null
          management_fee_percentage?: number | null
          loan_interest?: number | null
          category?: string | null
          type?: string | null
          property_regime_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          address?: string
          city?: string | null
          postal_code?: string | null
          area?: number
          bedrooms?: number
          bathrooms?: number
          status?: 'vacant' | 'rented'
          rent?: number
          value?: number
          image_url?: string | null
          created_at?: string
          updated_at?: string
          purchase_date?: string | null
          property_tax?: number | null
          housing_tax?: number | null
          insurance?: number | null
          management_fee_percentage?: number | null
          loan_interest?: number | null
          category?: string | null
          type?: string | null
          property_regime_id?: string | null
        }
      }
      tenants: {
        Row: {
          id: string
          user_id: string
          first_name: string
          last_name: string
          email: string
          phone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          first_name: string
          last_name: string
          email: string
          phone: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string
          created_at?: string
          updated_at?: string
        }
      }
      leases: {
        Row: {
          id: string
          user_id: string
          tenant_id: string
          property_id: string
          lease_start: string
          lease_end: string | null
          rent: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tenant_id: string
          property_id: string
          lease_start: string
          lease_end?: string | null
          rent: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tenant_id?: string
          property_id?: string
          lease_start?: string
          lease_end?: string | null
          rent?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          property_id: string
          amount: number
          type: 'income' | 'expense'
          category: string
          description: string
          date: string
          accounting_month: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          property_id: string
          amount: number
          type: 'income' | 'expense'
          category: string
          description: string
          date: string
          accounting_month: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          property_id?: string
          amount?: number
          type?: 'income' | 'expense'
          category?: string
          description?: string
          date?: string
          accounting_month?: string
          created_at?: string
          updated_at?: string
        }
      }
      loans: {
        Row: {
          id: string
          user_id: string
          property_id: string
          name: string
          amount: number
          interest_rate: number
          insurance_rate: number | null
          start_date: string
          end_date: string | null
          monthly_payment: number | null
          remaining_capital: number | null
          payment_day: number | null
          loan_type: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          property_id: string
          name: string
          amount: number
          interest_rate: number
          insurance_rate?: number | null
          start_date: string
          end_date?: string | null
          monthly_payment?: number | null
          remaining_capital?: number | null
          payment_day?: number | null
          loan_type: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          property_id?: string
          name?: string
          amount?: number
          interest_rate?: number
          insurance_rate?: number | null
          start_date?: string
          end_date?: string | null
          monthly_payment?: number | null
          remaining_capital?: number | null
          payment_day?: number | null
          loan_type?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tax_profiles: {
        Row: {
          id: string
          user_id: string
          fiscal_year: number
          salary_income: number
          loan_interests: number
          retirement_savings: number
          tax_situation: string
          number_of_children: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          fiscal_year: number
          salary_income: number
          loan_interests: number
          retirement_savings: number
          tax_situation: string
          number_of_children: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          fiscal_year?: number
          salary_income?: number
          loan_interests?: number
          retirement_savings?: number
          tax_situation?: string
          number_of_children?: number
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          created_at: string
          email: string
          full_name: string | null
          avatar_url: string | null
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['users']['Row']>
      }
      property_regimes: {
        Row: {
          id: string
          name: string
          location_type: string | null
          rental_type: string | null
          revenue_threshold: string | null
          flat_deduction: string | null
          real_expenses_deduction: boolean
          property_amortization: boolean
          capital_gain_duration: string | null
          accounting_type: string | null
          advantages: string | null
          disadvantages: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          location_type?: string | null
          rental_type?: string | null
          revenue_threshold?: string | null
          flat_deduction?: string | null
          real_expenses_deduction: boolean
          property_amortization: boolean
          capital_gain_duration?: string | null
          accounting_type?: string | null
          advantages?: string | null
          disadvantages?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          location_type?: string | null
          rental_type?: string | null
          revenue_threshold?: string | null
          flat_deduction?: string | null
          real_expenses_deduction?: boolean
          property_amortization?: boolean
          capital_gain_duration?: string | null
          accounting_type?: string | null
          advantages?: string | null
          disadvantages?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
