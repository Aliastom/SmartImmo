'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { Database } from '@/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PersonalInfoForm } from './personal-info-form'
import { FamilyStatusForm } from './family-status-form'
import { SecurityForm } from './security-form'
import { Separator } from '@/components/ui/separator'
import { motion, AnimatePresence } from 'framer-motion'
import { AnimatedCard, PageTransition, LoadingSpinner, AnimatedTabsContent } from '@/components/ui/animated'
import { PageHeader } from '@/components/ui/page-header'

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("personal")
  const [userData, setUserData] = useState<{
    id: string
    email: string
    first_name: string
    last_name: string
    phone: string
    address: string
    landlord_name: string
    marital_status: 'single' | 'married' | 'pacs' | 'divorced' | 'widowed'
    children: number
    tax_situation: 'single' | 'couple' | 'family'
  }>({
    id: '',
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    landlord_name: '',
    marital_status: 'single',
    children: 0,
    tax_situation: 'single'
  })

  useEffect(() => {
    async function loadUserProfile() {
      try {
        setIsLoading(true)
        
        // Vérifier l'authentification
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/auth/login')
          return
        }
        
        // Récupérer les données du profil utilisateur
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (profileError && profileError.code === 'PGRST116') {
          // Le profil n'existe pas encore, créons-le
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              first_name: '',
              last_name: '',
              phone: '',
              marital_status: 'single',
              address: '',
              landlord_name: '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()
          
          if (createError) {
            console.error('Erreur lors de la création du profil:', createError)
            toast({
              title: "Erreur",
              description: "Impossible de créer votre profil",
              variant: "destructive"
            })
            return
          }
          
          // Utiliser le nouveau profil
          setUserData({
            id: session.user.id,
            email: session.user.email || '',
            first_name: '',
            last_name: '',
            phone: '',
            address: '',
            landlord_name: '',
            marital_status: 'single',
            children: 0,
            tax_situation: 'single'
          })
          setIsLoading(false)
          return
        } else if (profileError) {
          console.error('Erreur lors du chargement du profil:', profileError)
          toast({
            title: "Erreur",
            description: "Impossible de charger votre profil",
            variant: "destructive"
          })
          return
        }
        
        // Récupérer les données fiscales de l'utilisateur
        const currentYear = new Date().getFullYear()
        const { data: taxProfile, error: taxProfileError } = await supabase
          .from('tax_profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('fiscal_year', currentYear)
          .single()
        
        if (taxProfileError && taxProfileError.code !== 'PGRST116') {
          console.error('Erreur lors du chargement du profil fiscal:', taxProfileError)
        }
        
        // Combiner les données du profil et du profil fiscal
        setUserData({
          id: session.user.id,
          email: session.user.email || '',
          first_name: profile?.first_name || '',
          last_name: profile?.last_name || '',
          phone: profile?.phone || '',
          address: profile?.address || '',
          landlord_name: (profile as any)?.landlord_name || '',
          marital_status: profile?.marital_status || 'single',
          children: taxProfile?.number_of_children || 0,
          tax_situation: taxProfile?.tax_situation || 'single'
        })
        
        setIsLoading(false)
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error)
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors du chargement de votre profil",
          variant: "destructive"
        })
        setIsLoading(false)
      }
    }
    
    loadUserProfile()
  }, [supabase, router, toast])
  
  async function updateProfile(formData: Partial<typeof userData>) {
    try {
      setIsLoading(true)
      
      // Vérifier l'authentification
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }
      
      // Mettre à jour le profil utilisateur
      if (formData.first_name !== undefined || formData.last_name !== undefined || formData.phone !== undefined || (formData as any).address !== undefined || (formData as any).landlord_name !== undefined || formData.marital_status !== undefined) {
        const { error: updateProfileError } = await supabase
          .from('profiles')
          .update({
            first_name: formData.first_name !== undefined ? formData.first_name : userData.first_name,
            last_name: formData.last_name !== undefined ? formData.last_name : userData.last_name,
            phone: formData.phone !== undefined ? formData.phone : userData.phone,
            marital_status: formData.marital_status !== undefined ? formData.marital_status : userData.marital_status,
            address: (formData as any).address !== undefined ? (formData as any).address : userData.address,
            landlord_name: (formData as any).landlord_name !== undefined ? (formData as any).landlord_name : userData.landlord_name,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.user.id)
        
        if (updateProfileError) {
          console.error('Erreur lors de la mise à jour du profil:', updateProfileError)
          toast({
            title: "Erreur",
            description: "Impossible de mettre à jour votre profil",
            variant: "destructive"
          })
          setIsLoading(false)
          return
        }
      }
      
      // Mettre à jour le profil fiscal
      if (formData.tax_situation !== undefined || formData.children !== undefined) {
        const currentYear = new Date().getFullYear()
        
        // Vérifier si un profil fiscal existe déjà pour cette année
        const { data: existingTaxProfile, error: checkError } = await supabase
          .from('tax_profiles')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('fiscal_year', currentYear)
          .single()
        
        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Erreur lors de la vérification du profil fiscal:', checkError)
          toast({
            title: "Erreur",
            description: "Impossible de vérifier votre profil fiscal",
            variant: "destructive"
          })
          setIsLoading(false)
          return
        }
        
        if (existingTaxProfile) {
          // Mettre à jour le profil fiscal existant
          const { error: updateTaxError } = await supabase
            .from('tax_profiles')
            .update({
              tax_situation: formData.tax_situation !== undefined ? formData.tax_situation : userData.tax_situation,
              number_of_children: formData.children !== undefined ? formData.children : userData.children,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingTaxProfile.id)
          
          if (updateTaxError) {
            console.error('Erreur lors de la mise à jour du profil fiscal:', updateTaxError)
            toast({
              title: "Erreur",
              description: "Impossible de mettre à jour votre profil fiscal",
              variant: "destructive"
            })
            setIsLoading(false)
            return
          }
        } else {
          // Créer un nouveau profil fiscal
          const { error: createTaxError } = await supabase
            .from('tax_profiles')
            .insert({
              user_id: session.user.id,
              fiscal_year: currentYear,
              tax_situation: formData.tax_situation !== undefined ? formData.tax_situation : userData.tax_situation,
              number_of_children: formData.children !== undefined ? formData.children : userData.children,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          
          if (createTaxError) {
            console.error('Erreur lors de la création du profil fiscal:', createTaxError)
            toast({
              title: "Erreur",
              description: "Impossible de créer votre profil fiscal",
              variant: "destructive"
            })
            setIsLoading(false)
            return
          }
        }
      }
      
      // Mettre à jour les données locales
      setUserData(prev => ({
        ...prev,
        ...formData
      }))
      
      toast({
        title: "Succès",
        description: "Votre profil a été mis à jour avec succès",
      })
      
      setIsLoading(false)
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error)
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour de votre profil",
        variant: "destructive"
      })
      setIsLoading(false)
    }
  }
  
  async function updatePassword(currentPassword: string, newPassword: string) {
    try {
      setIsLoading(true)
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) {
        console.error('Erreur lors de la mise à jour du mot de passe:', error)
        toast({
          title: "Erreur",
          description: error.message || "Impossible de mettre à jour votre mot de passe",
          variant: "destructive"
        })
        setIsLoading(false)
        return
      }
      
      toast({
        title: "Succès",
        description: "Votre mot de passe a été mis à jour avec succès",
      })
      
      setIsLoading(false)
    } catch (error) {
      console.error('Erreur lors de la mise à jour du mot de passe:', error)
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour de votre mot de passe",
        variant: "destructive"
      })
      setIsLoading(false)
    }
  }

  return (
    <PageTransition className="container py-10">
      <PageHeader title="Profil" />
      <div className="mx-auto max-w-5xl">
        <motion.h1 
          className="text-3xl font-bold mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Profil
        </motion.h1>
        
        {isLoading ? (
          <LoadingSpinner className="h-64" size={60} />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-8">
              <motion.div className="flex space-x-1" layout>
                {[
                  { id: "personal", label: "Informations personnelles" },
                  { id: "family", label: "Situation familiale" },
                  { id: "security", label: "Sécurité" }
                ].map((tab, index) => (
                  <TabsTrigger 
                    key={tab.id} 
                    value={tab.id}
                    className="relative"
                  >
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {tab.label}
                    </motion.span>
                    {activeTab === tab.id && (
                      <motion.div 
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                        layoutId="activeTab"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                  </TabsTrigger>
                ))}
              </motion.div>
            </TabsList>
            
            <AnimatePresence mode="wait">
              {activeTab === "personal" && (
                <AnimatedTabsContent value="personal" activeValue={activeTab}>
                  <AnimatedCard>
                    <CardHeader>
                      <CardTitle>Informations personnelles</CardTitle>
                      <CardDescription>
                        Modifiez vos informations personnelles
                      </CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-6">
                      <PersonalInfoForm 
                        userData={userData} 
                        onSubmit={(data) => updateProfile(data)}
                        isLoading={isLoading}
                      />
                    </CardContent>
                  </AnimatedCard>
                </AnimatedTabsContent>
              )}
              
              {activeTab === "family" && (
                <AnimatedTabsContent value="family" activeValue={activeTab}>
                  <AnimatedCard>
                    <CardHeader>
                      <CardTitle>Situation familiale</CardTitle>
                      <CardDescription>
                        Mettez à jour votre situation familiale et fiscale
                      </CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-6">
                      <FamilyStatusForm 
                        userData={userData} 
                        onSubmit={(data: {
                          marital_status: 'single' | 'married' | 'pacs' | 'divorced' | 'widowed';
                          children: number;
                          tax_situation: 'single' | 'couple' | 'family';
                        }) => updateProfile(data)}
                        isLoading={isLoading}
                      />
                    </CardContent>
                  </AnimatedCard>
                </AnimatedTabsContent>
              )}
              
              {activeTab === "security" && (
                <AnimatedTabsContent value="security" activeValue={activeTab}>
                  <AnimatedCard>
                    <CardHeader>
                      <CardTitle>Sécurité</CardTitle>
                      <CardDescription>
                        Modifiez votre mot de passe et les paramètres de sécurité
                      </CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-6">
                      <SecurityForm 
                        onSubmit={(currentPassword: string, newPassword: string) => updatePassword(currentPassword, newPassword)}
                        isLoading={isLoading}
                      />
                    </CardContent>
                  </AnimatedCard>
                </AnimatedTabsContent>
              )}
            </AnimatePresence>
          </Tabs>
        )}
      </div>
    </PageTransition>
  )
}
