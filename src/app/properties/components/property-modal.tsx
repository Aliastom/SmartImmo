'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { motion } from 'framer-motion'
import { PropertyRegimeSelector } from '@/components/property/property-regime-selector'
import axios from 'axios';

interface PropertyModalProps {
  isOpen: boolean
  onClose: () => void
  property?: any
  onPropertyUpdated?: () => void
}

async function fetchDVFEstimation({ address, city, postal_code, area }, fallback = false) {
  if (!address || !city || !postal_code || !area) return null;
  try {
    const geoRes = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address + ', ' + city + ' ' + postal_code)}&limit=1`);
    const geoData = await geoRes.json();
    if (!geoData.features?.[0]) return null;
    const { citycode, postcode } = geoData.features[0].properties;
    let dvfRes, dvfData, ventes;
    if (!fallback) {
      dvfRes = await fetch(`https://api.data.gouv.fr/api/1/datasets/demandes-de-valeurs-foncieres-dvf/lines/?q=code_commune:${citycode}&sort=-date_mutation&size=30`);
      dvfData = await dvfRes.json();
      ventes = dvfData.data?.filter(row => row.valeur_fonciere && row.surface_reelle_bati && row.surface_reelle_bati > 10);
      if (ventes?.length) {
        const prixM2 = ventes.reduce((sum, v) => sum + (v.valeur_fonciere / v.surface_reelle_bati), 0) / ventes.length;
        return { estimation: Math.round(prixM2 * area), precision: 'adresse', prixM2: Math.round(prixM2) };
      }
    }
    if (!fallback) {
      return await fetchDVFEstimation({ address: '', city, postal_code, area }, true);
    } else {
      return null;
    }
  } catch {
    return null;
  }
}

// --- WRAPPER AVEC TIMEOUT POUR FETCH DVF ---
function withTimeout<T>(promise: Promise<T>, ms = 7000): Promise<T | 'timeout'> {
  return Promise.race([
    promise,
    new Promise<'timeout'>(resolve => setTimeout(() => resolve('timeout'), ms))
  ]);
}

async function fetchDVFEstimationWithTimeout(args: any, fallback = false) {
  const result = await withTimeout(fetchDVFEstimation(args, fallback), 7000);
  if (result === 'timeout') return { error: 'timeout' };
  return result;
}

export function PropertyModal({ isOpen, onClose, property, onPropertyUpdated }: PropertyModalProps) {
  const supabase = createClientComponentClient<Database>()
  const { toast } = useToast()
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    postal_code: '',
    area: '',
    bedrooms: '',
    bathrooms: '',
    rent: '',
    value: '',
    status: 'vacant' as 'vacant' | 'rented',
    image_url: '/images/placeholder-property.jpg',
    property_tax: '',
    housing_tax: '',
    insurance: '',
    management_fee_percentage: '',
    loan_interest: '',
    category: 'Bien locatif' as 'Résidence principale' | 'Résidence secondaire' | 'Bien locatif' | 'Saisonnière/Airbnb' | 'Autre',
    purchase_date: '',
    purchase_price: '',
    property_regime_id: null as string | null,
    airbnb_listing_url: '',
    acquisition_fees: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [addressInput, setAddressInput] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);

  const fetchAddressSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setAddressSuggestions([]);
      return;
    }
    setAddressLoading(true);
    try {
      const res = await axios.get(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=6`);
      setAddressSuggestions(res.data.features || []);
    } catch (e) {
      setAddressSuggestions([]);
    } finally {
      setAddressLoading(false);
    }
  };

  useEffect(() => {
    if (addressInput.length >= 3) {
      fetchAddressSuggestions(addressInput);
      setSuggestionsVisible(true);
    } else {
      setAddressSuggestions([]);
      setSuggestionsVisible(false);
    }
  }, [addressInput]);

  const handleSelectAddress = (feature: any) => {
    setAddressInput(feature.properties.label);
    setFormData(prev => ({
      ...prev,
      address: feature.properties.label, // Utilise toujours le label complet (numéro + rue + ville)
      city: feature.properties.city || '',
      postal_code: feature.properties.postcode || '',
    }));
    setSuggestionsVisible(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("Vous devez être connecté pour effectuer cette action")

      const propertyData = {
        user_id: session.user.id,
        name: formData.name,
        address: formData.address,
        city: formData.city || null,
        postal_code: formData.postal_code || null,
        area: parseFloat(formData.area) || 0,
        bedrooms: parseInt(formData.bedrooms) || 0,
        bathrooms: parseInt(formData.bathrooms) || 0,
        status: formData.status,
        rent: parseFloat(formData.rent) || 0,
        value: parseFloat(formData.value) || 0,
        image_url: formData.image_url,
        property_tax: parseFloat(formData.property_tax) || null,
        housing_tax: parseFloat(formData.housing_tax) || null,
        insurance: parseFloat(formData.insurance) || null,
        management_fee_percentage: parseFloat(formData.management_fee_percentage) || null,
        loan_interest: parseFloat(formData.loan_interest) || null,
        category: formData.category,
        purchase_date: formData.purchase_date || null,
        purchase_price: parseFloat(formData.purchase_price) || 0,
        property_regime_id: formData.property_regime_id,
        airbnb_listing_url: formData.airbnb_listing_url || null,
        acquisition_fees: parseFloat(formData.acquisition_fees) || 0,
      }

      if (propertyData.area <= 0) throw new Error("La surface doit être un nombre positif")
      if (propertyData.bedrooms < 0) throw new Error("Le nombre de chambres doit être un nombre positif ou zéro")
      if (propertyData.bathrooms < 0) throw new Error("Le nombre de salles de bain doit être un nombre positif ou zéro")
      if (propertyData.rent < 0) throw new Error("Le loyer doit être un nombre positif")
      if (propertyData.value < 0) throw new Error("La valeur doit être un nombre positif")
      if (propertyData.property_tax !== null && propertyData.property_tax < 0) throw new Error("La taxe foncière doit être un nombre positif ou zéro")
      if (propertyData.housing_tax !== null && propertyData.housing_tax < 0) throw new Error("La taxe d'habitation doit être un nombre positif ou zéro")
      if (propertyData.insurance !== null && propertyData.insurance < 0) throw new Error("L'assurance habitation doit être un nombre positif ou zéro")
      if (propertyData.management_fee_percentage !== null && 
          (propertyData.management_fee_percentage < 0 || propertyData.management_fee_percentage > 100)) 
        throw new Error("Le pourcentage des frais de gestion doit être compris entre 0 et 100")
      if (propertyData.loan_interest !== null && propertyData.loan_interest < 0) throw new Error("Les intérêts d'emprunt doivent être un nombre positif ou zéro")

      let result
      if (property) {
        result = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', property.id)
          .eq('user_id', session.user.id)
      } else {
        result = await supabase
          .from('properties')
          .insert([propertyData])
      }

      if (result.error) throw result.error

      toast({
        title: "Succès",
        description: property ? "Bien modifié avec succès" : "Bien ajouté avec succès"
      })

      onClose()
      if (onPropertyUpdated) onPropertyUpdated()
    } catch (error: any) {
      console.error('Error:', error)
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une image (JPG, PNG, etc.)",
        variant: "destructive"
      })
      return
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erreur",
        description: "L'image est trop volumineuse. Taille maximale: 5MB",
        variant: "destructive"
      })
      return
    }
    
    setSelectedFile(file)
    
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64String = e.target?.result as string
      setImagePreview(base64String)
      setFormData(prev => ({ ...prev, image_url: base64String }))
    }
    reader.readAsDataURL(file)
  }
  
  const resetImage = () => {
    setSelectedFile(null)
    setImagePreview(null)
    setFormData(prev => ({ ...prev, image_url: '/images/placeholder-property.jpg' }))
  }

  const [dvfLoading, setDvfLoading] = useState(false);
  const [dvfNote, setDvfNote] = useState('');
  const [dvfPrecision, setDvfPrecision] = useState<'commune' | 'adresse' | ''>('');
  const [dvfPrixM2, setDvfPrixM2] = useState<number | null>(null);

  const [dvfVentes, setDvfVentes] = useState<any[]>([]);

  // --- UTILISER L'API INTERNE POUR FETCH DVF VENTES ---
  async function fetchDVFVentes({ city, postal_code }) {
    try {
      // Géocodage pour obtenir le code INSEE de la commune
      const geoRes = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(city + ' ' + postal_code)}&limit=1`);
      const geoData = await geoRes.json();
      if (!geoData.features?.[0]) return [];
      const { citycode } = geoData.features[0].properties;
      // Appel API interne Next.js (proxy DVF)
      const apiUrl = `/api/dvf?citycode=${citycode}`;
      console.log('API interne DVF URL:', apiUrl);
      const dvfRes = await fetch(apiUrl);
      const dvfData = await dvfRes.json();
      console.log('DVF Response:', dvfData);
      if (!dvfData.data?.length) return [];
      return dvfData.data;
    } catch (e) {
      console.error('Erreur DVF:', e);
      return [];
    }
  }

  useEffect(() => {
    async function loadVentes() {
      if (formData.city && formData.postal_code) {
        const ventes = await fetchDVFVentes({ city: formData.city, postal_code: formData.postal_code });
        setDvfVentes(ventes);
      } else {
        setDvfVentes([]);
      }
    }
    loadVentes();
  }, [formData.city, formData.postal_code]);

  const refreshDVF = async () => {
    setDvfLoading(true);
    setDvfNote('');
    setDvfPrecision('');
    setDvfPrixM2(null);
    if (
      formData.city && formData.postal_code &&
      formData.area && (formData.address || true)
    ) {
      const result = await fetchDVFEstimationWithTimeout({
        address: formData.address,
        city: formData.city,
        postal_code: formData.postal_code,
        area: parseFloat(formData.area)
      });
      if ((result as any)?.error === 'timeout') {
        setDvfNote('Estimation indisponible (délai dépassé). Veuillez réessayer.');
        setDvfLoading(false);
        return;
      }
      if ((result as any)?.estimation) {
        setFormData(prev => ({ ...prev, value: result.estimation.toString() }));
        setDvfNote(
          result.precision === 'commune'
            ? `Estimation basée sur la commune (prix moyen: ${result.prixM2} €/m², DVF).`
            : `Estimation à l'adresse (prix moyen: ${result.prixM2} €/m², DVF).`
        );
        setDvfPrecision(result.precision);
        setDvfPrixM2(result.prixM2);
      } else {
        setDvfNote('Aucune estimation automatique trouvée pour cette adresse.');
        setDvfPrecision('');
        setDvfPrixM2(null);
      }
      setDvfLoading(false);
    }
  };

  useEffect(() => {
    if (
      formData.address && formData.city && formData.postal_code &&
      formData.area && !formData.value
    ) {
      refreshDVF();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.address, formData.city, formData.postal_code, formData.area]);

  useEffect(() => {
    const fetchProperty = async () => {
      if (!property) {
        setFormData({
          name: '',
          address: '',
          city: '',
          postal_code: '',
          area: '',
          bedrooms: '',
          bathrooms: '',
          rent: '',
          value: '',
          status: 'vacant',
          image_url: '/images/placeholder-property.jpg',
          property_tax: '',
          housing_tax: '',
          insurance: '',
          management_fee_percentage: '',
          loan_interest: '',
          category: 'Bien locatif',
          purchase_date: '',
          purchase_price: '',
          property_regime_id: null,
          airbnb_listing_url: '',
          acquisition_fees: '',
        })
        return
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('id', property.id)
          .eq('user_id', session.user.id)
          .single()

        if (error) throw error

        setFormData({
          name: data.name,
          address: data.address,
          city: data.city || '',
          postal_code: data.postal_code || '',
          area: data.area?.toString() || '',
          bedrooms: data.bedrooms?.toString() || '',
          bathrooms: data.bathrooms?.toString() || '',
          rent: data.rent?.toString() || '',
          value: data.value?.toString() || '',
          status: data.status || 'vacant',
          image_url: data.image_url || '/images/placeholder-property.jpg',
          property_tax: data.property_tax?.toString() || '',
          housing_tax: data.housing_tax?.toString() || '',
          insurance: data.insurance?.toString() || '',
          management_fee_percentage: data.management_fee_percentage?.toString() || '',
          loan_interest: data.loan_interest?.toString() || '',
          category: data.category || 'Bien locatif',
          purchase_date: data.purchase_date || '',
          purchase_price: data.purchase_price?.toString() || '',
          property_regime_id: data.property_regime_id || null,
          airbnb_listing_url: data.airbnb_listing_url || '',
          acquisition_fees: data.acquisition_fees?.toString() || '',
        })
        
        if (data.image_url && data.image_url !== '/images/placeholder-property.jpg') {
          setImagePreview(data.image_url);
        }
      } catch (error) {
        console.error('Error:', error)
        toast({
          title: "Erreur",
          description: "Impossible de charger les données du bien",
          variant: "destructive"
        })
      }
    }

    if (isOpen) {
      fetchProperty()
    }
  }, [isOpen, property, supabase, toast])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{property ? 'Modifier un bien' : 'Ajouter un bien'}</DialogTitle>
          <DialogDescription>
            {property 
              ? 'Modifiez les informations de votre bien immobilier.' 
              : 'Ajoutez un nouveau bien à votre portefeuille immobilier.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="financial">Finances</TabsTrigger>
              <TabsTrigger value="acquisition">Acquisition</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 pt-4">
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className="bg-gray-50 p-3 text-sm font-medium text-gray-500 uppercase w-1/3">Nom du bien</td>
                    <td className="p-3">
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        required
                        placeholder="ex: Appartement Paris 11ème"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-gray-50 p-3 text-sm font-medium text-gray-500 uppercase w-1/3">Adresse</td>
                    <td className="p-3 relative">
                      <Input
                        id="address"
                        value={addressInput}
                        onChange={e => setAddressInput(e.target.value)}
                        required
                        autoComplete="off"
                        placeholder="ex: 123 rue de la Paix, 75000 Paris"
                      />
                      {suggestionsVisible && addressSuggestions.length > 0 && (
                        <ul className="absolute z-10 bg-white border border-gray-200 rounded w-full max-h-48 overflow-y-auto shadow-lg mt-1">
                          {addressLoading && (
                            <li className="px-2 py-1 text-gray-400">Chargement...</li>
                          )}
                          {addressSuggestions.map((feature, idx) => (
                            <li
                              key={idx}
                              className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
                              onClick={() => handleSelectAddress(feature)}
                            >
                              {feature.properties.label}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-gray-50 p-3 text-sm font-medium text-gray-500 uppercase w-1/3">Ville</td>
                    <td className="p-3">
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="ex: Paris"
                        className="border-0 shadow-none focus-visible:ring-0 p-0"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-gray-50 p-3 text-sm font-medium text-gray-500 uppercase w-1/3">Code postal</td>
                    <td className="p-3">
                      <Input
                        id="postal_code"
                        value={formData.postal_code}
                        onChange={e => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                        placeholder="ex: 75000"
                        className="border-0 shadow-none focus-visible:ring-0 p-0"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-gray-50 p-3 text-sm font-medium text-gray-500 uppercase w-1/3">Surface (m²)</td>
                    <td className="p-3">
                      <Input
                        id="area"
                        type="number"
                        min="1"
                        value={formData.area}
                        onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                        required
                        placeholder="ex: 75"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-gray-50 p-3 text-sm font-medium text-gray-500 uppercase w-1/3">Statut</td>
                    <td className="p-3">
                      <Select
                        value={formData.status}
                        onValueChange={(value: 'vacant' | 'rented') => setFormData(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un statut" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vacant">Disponible</SelectItem>
                          <SelectItem value="rented">Loué</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-gray-50 p-3 text-sm font-medium text-gray-500 uppercase w-1/3">Chambres</td>
                    <td className="p-3">
                      <Input
                        id="bedrooms"
                        type="number"
                        min="0"
                        value={formData.bedrooms}
                        onChange={(e) => setFormData(prev => ({ ...prev, bedrooms: e.target.value }))}
                        required
                        placeholder="ex: 2"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-gray-50 p-3 text-sm font-medium text-gray-500 uppercase w-1/3">Salles de bain</td>
                    <td className="p-3">
                      <Input
                        id="bathrooms"
                        type="number"
                        min="0"
                        value={formData.bathrooms}
                        onChange={(e) => setFormData(prev => ({ ...prev, bathrooms: e.target.value }))}
                        required
                        placeholder="ex: 1"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-gray-50 p-3 text-sm font-medium text-gray-500 uppercase w-1/3">PHOTO</td>
                    <td className="p-3 align-top">
                      <div className="flex flex-col items-start gap-2">
                        <div>
                          <input 
                            type="file" 
                            accept="image/*" 
                            id="property-image-upload" 
                            style={{ display: 'none' }} 
                            onChange={handleFileChange} 
                          />
                          <label htmlFor="property-image-upload">
                            <Button asChild variant="outline" size="sm">
                              <span>Téléverser</span>
                            </Button>
                          </label>
                          {selectedFile && (
                            <span className="ml-2 text-green-600 text-sm">Image sélectionnée: {selectedFile.name}</span>
                          )}
                        </div>
                        {imagePreview && (
                          <img 
                            src={imagePreview} 
                            alt="Aperçu image bien" 
                            className="rounded border mt-2" 
                            style={{ maxWidth: '220px', maxHeight: '160px', objectFit: 'contain', background: '#f8fafc' }} 
                          />
                        )}
                        {!imagePreview && (
                          <span className="text-xs text-gray-400">Aucune image sélectionnée</span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {formData.category === 'Saisonnière/Airbnb' && (
                    <tr>
                      <td className="bg-gray-50 p-3 text-sm font-medium text-gray-500 uppercase w-1/3">Lien vers l'annonce Airbnb</td>
                      <td className="p-3">
                        <Input
                          id="airbnb_listing_url"
                          type="url"
                          value={formData.airbnb_listing_url}
                          onChange={(e) => setFormData(prev => ({ ...prev, airbnb_listing_url: e.target.value }))}
                          placeholder="https://www.airbnb.fr/rooms/12345678"
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TabsContent>

            <TabsContent value="financial" className="space-y-4 pt-4">
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className="bg-gray-50 p-3 text-sm font-medium text-gray-500 uppercase w-1/3">Catégorie</td>
                    <td className="p-3">
                      <Select
                        value={formData.category}
                        onValueChange={val => setFormData(prev => ({ ...prev, category: val }))}
                        disabled={isLoading}
                      >
                        <SelectTrigger id="category">
                          <SelectValue placeholder="Catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Résidence principale">Résidence principale</SelectItem>
                          <SelectItem value="Résidence secondaire">Résidence secondaire</SelectItem>
                          <SelectItem value="Bien locatif">Bien locatif</SelectItem>
                          <SelectItem value="Saisonnière/Airbnb">Saisonnière/Airbnb</SelectItem>
                          <SelectItem value="Autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-gray-100 text-gray-600 uppercase text-xs font-medium p-3 w-1/3">
                      Loyer mensuel (€)
                    </td>
                    <td className="p-3">
                      <Input
                        id="rent"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.rent}
                        onChange={(e) => setFormData(prev => ({ ...prev, rent: e.target.value }))}
                        required={formData.category === 'Bien locatif'}
                        placeholder="ex: 1200"
                        className="border-0 shadow-none focus-visible:ring-0 p-0"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-gray-100 text-gray-600 uppercase text-xs font-medium p-3">
                      Régime fiscal
                    </td>
                    <td className="p-3">
                      <PropertyRegimeSelector
                        selectedRegimeId={formData.property_regime_id}
                        onRegimeChange={(regimeId) => setFormData(prev => ({ ...prev, property_regime_id: regimeId }))}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-gray-100 text-gray-600 uppercase text-xs font-medium p-3"></td>
                    <td className="p-3">
                      <a
                        href="/regimes"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Besoin d'aide ? Voir la liste et le détail des régimes fiscaux
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-gray-100 text-gray-600 uppercase text-xs font-medium p-3">
                      Taxe foncière annuelle (€)
                    </td>
                    <td className="p-3">
                      <Input
                        id="property_tax"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.property_tax}
                        onChange={(e) => setFormData(prev => ({ ...prev, property_tax: e.target.value }))}
                        placeholder="ex: 1200"
                        className="border-0 shadow-none focus-visible:ring-0 p-0"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-gray-100 text-gray-600 uppercase text-xs font-medium p-3">
                      Taxe d'habitation annuelle (€)
                    </td>
                    <td className="p-3">
                      <Input
                        id="housing_tax"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.housing_tax}
                        onChange={(e) => setFormData(prev => ({ ...prev, housing_tax: e.target.value }))}
                        placeholder="ex: 800"
                        className="border-0 shadow-none focus-visible:ring-0 p-0"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-gray-100 text-gray-600 uppercase text-xs font-medium p-3">
                      Assurance habitation annuelle (€)
                    </td>
                    <td className="p-3">
                      <Input
                        id="insurance"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.insurance}
                        onChange={(e) => setFormData(prev => ({ ...prev, insurance: e.target.value }))}
                        placeholder="ex: 300"
                        className="border-0 shadow-none focus-visible:ring-0 p-0"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-gray-100 text-gray-600 uppercase text-xs font-medium p-3">
                      Frais de gestion (%)
                    </td>
                    <td className="p-3">
                      <Input
                        id="management_fee_percentage"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.management_fee_percentage}
                        onChange={(e) => setFormData(prev => ({ ...prev, management_fee_percentage: e.target.value }))}
                        placeholder="ex: 7"
                        className="border-0 shadow-none focus-visible:ring-0 p-0"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-gray-100 text-gray-600 uppercase text-xs font-medium p-3">
                      Intérêts d'emprunt annuels (€)
                    </td>
                    <td className="p-3">
                      <Input
                        id="loan_interest"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.loan_interest}
                        onChange={(e) => setFormData(prev => ({ ...prev, loan_interest: e.target.value }))}
                        placeholder="ex: 3600"
                        className="border-0 shadow-none focus-visible:ring-0 p-0"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </TabsContent>

            <TabsContent value="acquisition" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="purchase_date">Date d'achat</Label>
                <Input
                  id="purchase_date"
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, purchase_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchase_price">Prix d'achat (€)</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, purchase_price: e.target.value }))}
                  placeholder="ex: 250000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acquisition_fees">Frais d'acquisition (€)</Label>
                <Input
                  id="acquisition_fees"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.acquisition_fees}
                  onChange={(e) => setFormData(prev => ({ ...prev, acquisition_fees: e.target.value }))}
                  placeholder="ex: 10000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Valeur actuelle estimée (€)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                    placeholder="ex: 280000"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={refreshDVF}
                    disabled={dvfLoading}
                    title="Rafraîchir l'estimation"
                  >
                    <svg className={`h-4 w-4 ${dvfLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582M20 20v-5h-.581M5 19A9 9 0 0019 5M19 19A9 9 0 005 5" />
                    </svg>
                  </Button>
                </div>
                {dvfLoading ? (
                  <span className="text-xs text-gray-500 ml-2">Estimation automatique en cours…</span>
                ) : dvfNote && (
                  <span className="text-xs text-gray-500 ml-2">{dvfNote}</span>
                )}
                {dvfPrecision && formData.city && (
                  <a
                    href={`https://app.dvf.etalab.gouv.fr/?code_insee=${formData.postal_code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-blue-600 hover:underline ml-2 mt-1"
                  >
                    Voir les ventes DVF autour de cette commune
                  </a>
                )}
                {dvfPrecision && formData.city && dvfVentes.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-600 mb-1 font-semibold">Ventes récentes dans la commune (données brutes DVF)&nbsp;:</div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs border border-gray-200 rounded">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-2 py-1 font-medium">Date</th>
                            <th className="px-2 py-1 font-medium">Type</th>
                            <th className="px-2 py-1 font-medium">Surface (m²)</th>
                            <th className="px-2 py-1 font-medium">Prix (€)</th>
                            <th className="px-2 py-1 font-medium">Prix/m² (€)</th>
                            <th className="px-2 py-1 font-medium">Adresse DVF</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dvfVentes.map((v, i) => (
                            <tr key={i} className="odd:bg-white even:bg-gray-50">
                              <td className="px-2 py-1 whitespace-nowrap">{v.date_mutation?.slice(0, 10) || '-'}</td>
                              <td className="px-2 py-1 whitespace-nowrap">{v.type_local || '-'}</td>
                              <td className="px-2 py-1 text-right">{v.surface_reelle_bati || '-'}</td>
                              <td className="px-2 py-1 text-right">{v.valeur_fonciere?.toLocaleString() || '-'}</td>
                              <td className="px-2 py-1 text-right">{v.valeur_fonciere && v.surface_reelle_bati ? Math.round(v.valeur_fonciere / v.surface_reelle_bati).toLocaleString() : '-'}</td>
                              <td className="px-2 py-1 whitespace-nowrap">{v.adresse_numero ? `${v.adresse_numero} ` : ''}{v.adresse_nom_voie || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-3 mt-6">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                disabled={isLoading}
                className="flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Annuler
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="flex items-center"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {property ? "Mise à jour..." : "Création..."}
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {property ? "Mettre à jour" : "Créer"}
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
