'use client'

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { useToast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { useEffect, useState, useRef } from "react"
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation';
import TransactionFormFields from './components/TransactionFormFields.tsx';

interface TransactionModalProps {
  isOpen: boolean
  onClose: (saved?: boolean) => void
  transactionId?: string
  transactionToClone?: any
  propertyId?: string
}

// Nouvelle version de Property avec categoryName
interface Property {
  id: string
  name: string
  category?: string
  categoryName?: string // Ajouté pour le mapping front
}

export default function TransactionModal({ isOpen, onClose, transactionId, transactionToClone, propertyId }: TransactionModalProps) {
  const supabase = createClientComponentClient<Database>()
  const [isLoading, setIsLoading] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])
  const [transactionSaved, setTransactionSaved] = useState(false)
  
  // Get current date and first day of current month for defaults
  const today = new Date().toISOString().split('T')[0]
  const currentMonth = new Date().toISOString().slice(0, 7) // Format YYYY-MM pour accounting_month
  
  const [formData, setFormData] = useState({
    property_id: '',
    transaction_type: '', // 'income' ou 'expense'
    category: '',
    type: '', // type lié à la catégorie
    amount: '',
    date: today,
    accounting_month: currentMonth,
    description: '',
    platform: '',
    reservation_ref: '',
    guest_name: '',
    notes: '',
    start_date: '',
    end_date: ''
  })
  const { toast } = useToast()

  const [categories, setCategories] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [formInitialized, setFormInitialized] = useState(false);

  useEffect(() => {
    setFormInitialized(false);
  }, [isOpen, transactionId]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchCategoriesAndTypes = async () => {
      setFetchError(null);
      try {
        const { data: categoriesData, error: catError } = await supabase
          .from('categories')
          .select('*')
          .eq('active', true);
        if (catError) throw catError;
        setCategories(categoriesData || []);
        if (categoriesData && categoriesData.length > 0) {
          // Charger les types pour la première catégorie par défaut
          const firstCategoryId = categoriesData[0].id;
          const { data: typesData, error: typeError } = await supabase
            .from('types')
            .select('*')
            .eq('active', true)
            .eq('category_id', firstCategoryId);
          if (typeError) throw typeError;
          setTypes(typesData || []);
        } else {
          setTypes([]);
        }
      } catch (err: any) {
        setFetchError("Erreur lors du chargement des catégories ou types.");
        setCategories([]);
        setTypes([]);
      }
    };
    fetchCategoriesAndTypes();
  }, [isOpen, supabase]);

  // --- Initialisation robuste du formulaire lors de l'édition ou de la duplication ---
  useEffect(() => {
    if (!isOpen || (!transactionId && !transactionToClone)) return;
    let cancelled = false;
    const doInit = async () => {
      setIsLoading(true);
      try {
        let baseTransaction = null;
        // 1. Fetch transaction si édition, sinon utiliser transactionToClone
        if (transactionId) {
          const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', transactionId)
            .single();
          if (error || !data) return;
          baseTransaction = data;
        } else if (transactionToClone) {
          baseTransaction = transactionToClone;
        }
        if (!baseTransaction) return;
        // 2. Charger les types pour la catégorie de la transaction
        const { data: typesData } = await supabase
          .from('types')
          .select('*')
          .eq('active', true)
          .eq('category_id', baseTransaction.category);
        // 3. Sélectionner le type s'il existe, sinon le premier
        let typeId = '';
        if (typesData && typesData.length > 0) {
          typeId = typesData.some(t => t.id === baseTransaction.type)
            ? baseTransaction.type
            : typesData[0].id;
        }
        // 4. Préremplir le montant selon le type
        let montant = '';
        if (typeId) {
          const selectedType = typesData.find(t => t.id === typeId);
          const valeurPourPreRemplissage = selectedType?.name?.toLowerCase() || '';
          const { data: property } = await supabase
            .from('properties')
            .select('*')
            .eq('id', baseTransaction.property_id)
            .single();
          if (property) {
            switch (valeurPourPreRemplissage) {
              case 'loyer':
                montant = property.rent?.toString() || '0';
                break;
              case 'taxe foncière':
              case 'taxe_fonciere':
                montant = property.property_tax?.toString() || '0';
                break;
              case 'taxe habitation':
              case 'taxe_habitation':
                montant = property.habitation_tax?.toString() || '0';
                break;
              case 'assurance':
                montant = property.insurance?.toString() || '0';
                break;
              case 'frais de gestion':
              case 'frais_gestion':
                if (property.rent && property.management_fee_percentage) {
                  const mgmt = (property.rent * property.management_fee_percentage) / 100;
                  montant = mgmt.toFixed(2);
                } else {
                  montant = '0';
                }
                break;
              default:
                montant = '0';
            }
          }
        }
        if (!cancelled) {
          setTypes(typesData || []);
          setFormData({
            property_id: baseTransaction.property_id || (propertyId || ''),
            transaction_type: baseTransaction.transaction_type || '',
            category: baseTransaction.category || '',
            type: typeId,
            // Correction: priorité à baseTransaction.amount si présent (cas édition), sinon fallback montant calculé
            amount: baseTransaction.amount?.toString() || montant || '',
            date: transactionId ? (baseTransaction.date || today) : today,
            accounting_month: transactionId ? (baseTransaction.accounting_month || currentMonth) : currentMonth,
            description: baseTransaction.description || '',
            platform: baseTransaction.platform || '',
            reservation_ref: baseTransaction.reservation_ref || '',
            guest_name: baseTransaction.guest_name || '',
            notes: baseTransaction.notes || '',
            start_date: baseTransaction.start_date || '',
            end_date: baseTransaction.end_date || ''
          });
          setFormInitialized(true);
        }
      } finally {
        setIsLoading(false);
      }
    };
    doInit();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, transactionId, transactionToClone, propertyId, supabase, categories]);

  useEffect(() => {
    if (isOpen) {
      const fetchProperties = async () => {
        try {
          // First get the current session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError || !session) {
            console.error('Erreur de session:', sessionError)
            return
          }
          
          // Then fetch properties for this user
          const { data: propertiesData, error: propertiesError } = await supabase
            .from('properties')
            .select('id, name, category')
            .eq('user_id', session.user.id)
            .order('name', { ascending: true })
          
          if (propertiesError) {
            console.error('Erreur lors de la récupération des propriétés:', propertiesError)
            return
          }
          
          // On mappe l'id de catégorie vers son nom
          const mapped = (propertiesData || []).map((p: any) => ({
            ...p,
            categoryName: categories.find((c: any) => c.id === p.category)?.name || ''
          }));
          setProperties(mapped);
          
          // If we have a transactionId, fetch the transaction
          if (transactionId) {
            // init()
          } else if (propertyId) {
            setFormData(prev => ({
              ...prev,
              property_id: propertyId
            }))
          } else if (propertiesData && propertiesData.length > 0 && !formData.property_id) {
            // Sélectionner la première propriété par défaut
            setFormData(prev => ({
              ...prev,
              property_id: propertiesData[0].id
            }))
          }
        } catch (error) {
          console.error('Erreur lors du chargement des propriétés:', error)
        }
      };
      fetchProperties();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, transactionId, transactionToClone, propertyId, supabase, categories]);

  useEffect(() => {
    if (!isOpen) setFormInitialized(false);
  }, [isOpen]);

  // --- Attachments State ---
  const [attachments, setAttachments] = useState<File[]>([])
  const [existingAttachments, setExistingAttachments] = useState<any[]>([])
  const attachmentsInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (transactionId && isOpen) {
      (async () => {
        setIsLoading(true)
        try {
          // Fetch all document_ids for the transaction
          const { data: rels, error: relsError } = await supabase
            .from('transaction_documents')
            .select('document_id')
            .eq('transaction_id', transactionId);
          if (relsError) {
            console.error('Erreur fetch transaction_documents:', relsError);
            setExistingAttachments([]);
            return;
          }
          const docIds = rels.map(r => r.document_id);
          if (docIds.length === 0) {
            setExistingAttachments([]);
            return;
          }
          // Fetch all documents by ids
          const { data: docs, error: docsError } = await supabase
            .from('documents')
            .select('*')
            .in('id', docIds);
          if (docsError) {
            console.error('Erreur fetch documents:', docsError);
            setExistingAttachments([]);
            return;
          }
          // Ajoute le signedUrl à chaque doc existant dès le fetch
          const updated = await Promise.all(docs.map(async (doc) => {
            if (doc.signedUrl) return doc;
            try {
              const { data } = await supabase.storage.from('documents').createSignedUrl(doc.path || doc.file_path || doc.name, 60 * 60);
              return { ...doc, signedUrl: data?.signedUrl || '' };
            } catch {
              return { ...doc, signedUrl: '' };
            }
          }));
          setExistingAttachments(updated);
        } catch (e) {
          // ignore
        } finally {
          setIsLoading(false)
        }
      })()
    } else {
      setExistingAttachments([])
    }
  }, [transactionId, isOpen])

  // --- Dupliquer les pièces jointes lors de la duplication ---
  useEffect(() => {
    if (transactionToClone && isOpen && !transactionId) {
      (async () => {
        setIsLoading(true)
        try {
          // Fetch all document_ids for la transaction à cloner
          const { data: rels, error: relsError } = await supabase
            .from('transaction_documents')
            .select('document_id')
            .eq('transaction_id', transactionToClone.id);
          if (relsError) {
            console.error('Erreur fetch transaction_documents:', relsError);
            setExistingAttachments([]);
            return;
          }
          const docIds = rels.map(r => r.document_id);
          if (docIds.length === 0) {
            setExistingAttachments([]);
            return;
          }
          // Fetch all documents by ids
          const { data: docs, error: docsError } = await supabase
            .from('documents')
            .select('*')
            .in('id', docIds);
          if (docsError) {
            console.error('Erreur fetch documents:', docsError);
            setExistingAttachments([]);
            return;
          }
          // Ajoute le signedUrl à chaque doc existant dès le fetch
          const updated = await Promise.all(docs.map(async (doc) => {
            if (doc.signedUrl) return doc;
            try {
              const { data } = await supabase.storage.from('documents').createSignedUrl(doc.path || doc.file_path || doc.name, 60 * 60);
              return { ...doc, signedUrl: data?.signedUrl || '' };
            } catch {
              return { ...doc, signedUrl: '' };
            }
          }));
          setExistingAttachments(updated);
        } catch (e) {
          // ignore
        } finally {
          setIsLoading(false)
        }
      })()
    }
  }, [transactionToClone, isOpen, transactionId])

  // --- Attachments Handlers ---
  const handleAttachmentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Ajoute les nouvelles pièces jointes à celles déjà sélectionnées
      setAttachments(prev => ([...prev, ...Array.from(e.target.files)]))
      // Réinitialise la valeur de l'input pour permettre de re-sélectionner les mêmes fichiers si besoin
      if (attachmentsInputRef.current) attachmentsInputRef.current.value = ''
    }
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleRemoveExistingAttachment = async (docId: string) => {
    setIsLoading(true)
    try {
      await supabase.from('documents').delete().eq('id', docId)
      setExistingAttachments(prev => prev.filter(doc => doc.id !== docId))
      toast({ title: 'Suppression', description: 'Pièce jointe supprimée.' })
    } catch (e) {
      toast({ title: 'Erreur', description: "Impossible de supprimer la pièce jointe.", variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsLoading(true)
      
      // Récupère l'utilisateur connecté
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erreur",
          description: "Utilisateur non authentifié.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      if (formData.category === 'loyer' && formData.transaction_type === 'income') {
        if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
          toast({
            title: "Erreur",
            description: "Le montant du loyer doit être renseigné et strictement supérieur à 0.",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
      }
      
      const transactionData = {
        ...formData,
        amount: parseFloat(formData.amount),
        user_id: user.id, // Ajoute l'ID de l'utilisateur ici !
        start_date: formData.start_date?.trim() ? formData.start_date : null,
        end_date: formData.end_date?.trim() ? formData.end_date : null,
      }
      let transactionRes
      if (transactionId) {
        transactionRes = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', transactionId)
          .select()
          .single()
      } else {
        transactionRes = await supabase
          .from('transactions')
          .insert([transactionData])
          .select()
          .single()
      }
      if (transactionRes.error || !transactionRes.data) {
        toast({
          title: "Erreur",
          description: transactionRes.error?.message || "Impossible de créer la transaction.",
          variant: "destructive"
        })
        return
      }
      const txnId = transactionRes.data.id
      // --- Handle attachments upload ---
      if (attachments.length > 0) {
        for (const file of attachments) {
          // Générer un chemin unique pour le fichier (même logique que la modale principale)
          const fileExtension = file.name.split('.').pop() || '';
          const fileName = `${Date.now()}_${file.name}`;
          const filePath = `${user.id}/transactions/${txnId}/${fileName}`;

          // Upload storage avec options
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });
          if (uploadError) {
            toast({ title: 'Erreur', description: `Erreur lors de l'upload de ${file.name}` })
            console.error('Erreur upload storage:', uploadError)
            continue
          }

          // Insert document record (avec user_id et metadata)
          const { data: docInsert, error: docError } = await supabase
            .from('documents')
            .insert({
              user_id: user.id,
              name: file.name,
              file_path: filePath,
              file_size: file.size,
              mime_type: file.type,
              type: 'attachment',
              category: 'transaction',
              metadata: { original_filename: file.name }
            })
            .select()
            .single();
          if (docError || !docInsert) {
            console.error('Erreur insert documents:', docError);
            continue;
          }
          // Insert relation in transaction_documents
          const { error: relError } = await supabase
            .from('transaction_documents')
            .insert({
              transaction_id: txnId,
              document_id: docInsert.id,
            });
          if (relError) {
            console.error('Erreur insert transaction_documents:', relError);
          }
        }
      }
      // --- Lier les pièces jointes existantes lors de la duplication ---
      if (!transactionId && existingAttachments.length > 0) {
        for (const doc of existingAttachments) {
          const { error: relError } = await supabase
            .from('transaction_documents')
            .insert({
              transaction_id: txnId,
              document_id: doc.id,
            });
          if (relError) {
            console.error('Erreur insert transaction_documents (duplication):', relError);
          }
        }
      }
      toast({
        title: "Succès",
        description: transactionId ? "Transaction modifiée avec succès." : "Transaction créée avec succès.",
      })
      setTransactionSaved(true)
      setAttachments([])
      if (attachmentsInputRef.current) attachmentsInputRef.current.value = ''
      onClose(true)
    } catch (error) {
      console.error('Erreur lors de la soumission du formulaire:', error)
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors du traitement de la transaction.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Récupérer l'id du bien depuis l'URL (ex: /properties/[id])
  const params = useParams();
  const propertyIdFromUrl = params?.id as string | undefined;

  useEffect(() => {
    if (isOpen) {
      // Si on a un id dans l'URL, on le sélectionne automatiquement
      if (propertyIdFromUrl) {
        setFormData(prev => ({
          ...prev,
          property_id: propertyIdFromUrl
        }));
      } else if (properties && properties.length > 0 && !formData.property_id) {
        // Sinon, sélection automatique du premier bien (logique existante)
        setFormData(prev => ({
          ...prev,
          property_id: properties[0].id
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, propertyIdFromUrl, properties]);

  // --- Effet de préremplissage automatique montant ---
  useEffect(() => {
    // Ne jamais préremplir lors de l’édition d’une transaction !
    if (transactionId) return;
    // Ne préremplir que si toutes les infos nécessaires sont là
    if (!formData.property_id || !formData.category || !formData.type || !formData.transaction_type) return;
    const selectedType = types.find(t => t.id === formData.type);
    const valeurPourPreRemplissage = (selectedType?.name || '').toLowerCase();
    const fetchAndPrefillAmount = async () => {
      try {
        const { data: property, error } = await supabase
          .from('properties')
          .select('*')
          .eq('id', formData.property_id)
          .single();
        if (error || !property) return;
        if (formData.transaction_type === 'income' && valeurPourPreRemplissage === 'loyer') {
          setFormData(prev => ({ ...prev, amount: property.rent?.toString() || '0' }));
        } else if (formData.transaction_type === 'expense') {
          let montant = '0';
          switch (valeurPourPreRemplissage) {
            case 'taxe foncière':
            case 'taxe_fonciere':
              montant = property.property_tax?.toString() || '0';
              break;
            case 'taxe habitation':
            case 'taxe_habitation':
              montant = property.habitation_tax?.toString() || '0';
              break;
            case 'assurance':
            case 'quittance assurance':
            case 'quittance_assurance':
              montant = property.insurance?.toString() || '0';
              break;
            case 'frais de gestion':
            case 'frais_gestion':
              if (property.rent && property.management_fee_percentage) {
                const mgmt = (property.rent * property.management_fee_percentage) / 100;
                montant = mgmt.toFixed(2);
              } else {
                montant = '0';
              }
              break;
            default:
              montant = '0';
          }
          setFormData(prev => ({ ...prev, amount: montant }));
        } else {
          setFormData(prev => ({ ...prev, amount: '0' }));
        }
      } catch (err) {
        // Rien à faire
      }
    };
    fetchAndPrefillAmount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.property_id, formData.category, formData.type, formData.transaction_type, categories, types, transactionId]);

  // Effet pour sélectionner automatiquement le premier type disponible dès que la liste des types change (utile après changement de catégorie)
  useEffect(() => {
    if (types.length > 0 && !formData.type) {
      setFormData(prev => ({ ...prev, type: types[0].id }));
    }
    // Si plus aucun type dispo, on vide le champ
    if (types.length === 0 && formData.type) {
      setFormData(prev => ({ ...prev, type: '' }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [types]);

  // Fallback : si la catégorie/type de la transaction n'existe plus, sélectionner la première catégorie/type dispo
  useEffect(() => {
    if (!transactionId || !formInitialized) return;
    // Catégorie absente ?
    if (formData.category && !categories.some(cat => cat.id === formData.category)) {
      setFormData(prev => ({
        ...prev,
        category: categories[0]?.id || '',
        type: ''
      }));
    }
    // Type absent ?
    if (formData.type && types.length > 0 && !types.some(t => t.id === formData.type)) {
      setFormData(prev => ({
        ...prev,
        type: types[0]?.id || ''
      }));
    }
  }, [transactionId, formInitialized, categories, types]);

  // --- Correction du handleCategoryChange pour sélectionner automatiquement le premier type disponible
  const handleCategoryChange = async (categoryId: string) => {
    setFormData(prev => ({ ...prev, category: categoryId, type: '' }));
    setFetchError(null);
    try {
      const { data: typesData, error: typeError } = await supabase
        .from('types')
        .select('*')
        .eq('active', true)
        .eq('category_id', categoryId);
      if (typeError) throw typeError;
      setTypes(typesData || []);
      // Sélection auto du premier type
      if (typesData && typesData.length > 0) {
        setFormData(prev => ({ ...prev, type: typesData[0].id }));
      } else {
        setFormData(prev => ({ ...prev, type: '' }));
      }
    } catch (err: any) {
      setFetchError("Erreur lors du chargement des types.");
      setTypes([]);
      setFormData(prev => ({ ...prev, type: '' }));
    }
  };

  function AttachmentLink({ filePath, fileName }: { filePath: string, fileName: string }) {
    const [signedUrl, setSignedUrl] = useState<string>("");
    useEffect(() => {
      async function getUrl() {
        const { data, error } = await supabase
          .storage
          .from('documents')
          .createSignedUrl(filePath, 60 * 60); // 1h
        if (data?.signedUrl) setSignedUrl(data.signedUrl)
      }
      getUrl();
    }, [filePath]);
    if (!signedUrl) return <span>Chargement...</span>;
    return <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">{fileName}</a>;
  }

  // Affichage conditionnel du formulaire : masquer tant que tout n'est pas prêt
  const isReadyToShowForm = (!transactionId && !transactionToClone) || (
    categories.length > 0 && properties.length > 0 && formInitialized
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        {/* DialogTitle visually hidden pour accessibilité Radix UI */}
        <DialogTitle asChild>
          <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
            {transactionId ? 'Modifier la transaction' : transactionToClone ? 'Dupliquer la transaction' : 'Ajouter une transaction'}
          </span>
        </DialogTitle>
        {isReadyToShowForm ? (
          <TransactionFormFields
            formData={formData}
            setFormData={setFormData}
            categories={categories}
            types={types}
            properties={properties}
            isLoading={isLoading}
            handleSubmit={handleSubmit}
            handleCategoryChange={handleCategoryChange}
            attachments={attachments}
            attachmentsInputRef={attachmentsInputRef}
            handleAttachmentsChange={handleAttachmentsChange}
            handleRemoveAttachment={handleRemoveAttachment}
            existingAttachments={existingAttachments}
            handleRemoveExistingAttachment={handleRemoveExistingAttachment}
            fetchError={fetchError}
            onClose={onClose}
            transactionId={transactionId}
            transactionToClone={transactionToClone}
          />
        ) : (
          <div style={{padding: 40, textAlign: 'center'}}>
            <span>Chargement des données...</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
