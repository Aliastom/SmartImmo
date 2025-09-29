'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { useToast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Définir des types plus précis pour les props
type Property = { id: string; name: string };
type Tenant = { id: string; first_name: string; last_name: string };
type Lease = any

interface LeaseModalProps {
  isOpen: boolean
  onClose: () => void
  onLeaseAdded: () => void
  leaseToEdit?: Lease | null
}

export function LeaseModal({ isOpen, onClose, onLeaseAdded, leaseToEdit }: LeaseModalProps) {
  const [properties, setProperties] = useState<Property[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedProperty, setSelectedProperty] = useState('')
  const [selectedTenant, setSelectedTenant] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [rent, setRent] = useState('')
  const [chargesProvision, setChargesProvision] = useState('')
  const [securityDeposit, setSecurityDeposit] = useState('')
  const [signaturePlace, setSignaturePlace] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const supabase = createClientComponentClient<Database>()
  const { toast } = useToast()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Charger les propriétés
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('id, name')
        .eq('user_id', session.user.id);
      if (propertiesError) console.error('Error fetching properties:', propertiesError);
      else setProperties(propertiesData || []);

      // Charger les locataires
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, first_name, last_name')
        .eq('user_id', session.user.id);
      if (tenantsError) console.error('Error fetching tenants:', tenantsError);
      else setTenants(tenantsData || []);
    };

    if (isOpen) {
      fetchData();
      if (leaseToEdit) {
        setSelectedProperty(leaseToEdit.property_id || '');
        setSelectedTenant(leaseToEdit.tenant_id || '');
        setStartDate(leaseToEdit.lease_start || '');
        setEndDate(leaseToEdit.lease_end || '');
        setRent(leaseToEdit.rent?.toString() || '');
        setChargesProvision(leaseToEdit.charges_provision?.toString() || '');
        setSecurityDeposit(leaseToEdit.security_deposit?.toString() || '');
        setSignaturePlace(leaseToEdit.signature_place || '');
      } else {
        // Reset fields for new lease
        setSelectedProperty('');
        setSelectedTenant('');
        setStartDate('');
        setEndDate('');
        setRent('');
        setChargesProvision('');
        setSecurityDeposit('');
        setSignaturePlace('');
      }
    }
  }, [isOpen, leaseToEdit, supabase]);

  const handleSubmit = async () => {
    if (!selectedProperty || !selectedTenant || !startDate || !rent) {
      toast({ title: 'Champs requis', description: 'Veuillez remplir tous les champs obligatoires.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: 'Non authentifié', description: 'Veuillez vous reconnecter.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    const leaseData = {
      user_id: session.user.id,
      property_id: selectedProperty,
      tenant_id: selectedTenant,
      lease_start: startDate,
      lease_end: endDate || null,
      rent: parseFloat(rent),
      charges_provision: parseFloat(chargesProvision) || null,
      security_deposit: parseFloat(securityDeposit) || null,
      signature_place: signaturePlace || null,
    };

    let error;
    if (leaseToEdit) {
      const { error: updateError } = await supabase.from('leases').update(leaseData).eq('id', leaseToEdit.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('leases').insert(leaseData);
      error = insertError;
    }

    if (error) {
      console.error('Error saving lease:', error);
      toast({ title: 'Erreur', description: `Impossible de ${leaseToEdit ? 'modifier' : 'créer'} le bail.`, variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: `Le bail a été ${leaseToEdit ? 'modifié' : 'créé'} avec succès.` });
      onLeaseAdded();
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{leaseToEdit ? 'Modifier le bail' : 'Ajouter un nouveau bail'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Sélecteur de propriété */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="property" className="text-right">Bien</Label>
            <Select onValueChange={setSelectedProperty} value={selectedProperty}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Sélectionner un bien" />
              </SelectTrigger>
              <SelectContent>
                {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Sélecteur de locataire */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tenant" className="text-right">Locataire</Label>
            <Select onValueChange={setSelectedTenant} value={selectedTenant}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Sélectionner un locataire" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map(t => <SelectItem key={t.id} value={t.id}>{`${t.first_name} ${t.last_name}`}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Date de début */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="start-date" className="text-right">Début du bail</Label>
            <Input id="start-date" type="date" className="col-span-3" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          {/* Date de fin */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="end-date" className="text-right">Fin du bail</Label>
            <Input id="end-date" type="date" className="col-span-3" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          {/* Loyer */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rent" className="text-right">Loyer (€)</Label>
            <Input id="rent" type="number" className="col-span-3" value={rent} onChange={e => setRent(e.target.value)} />
          </div>
          {/* Provision sur charges */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="charges" className="text-right">Charges (€)</Label>
            <Input id="charges" type="number" className="col-span-3" value={chargesProvision} onChange={e => setChargesProvision(e.target.value)} placeholder="Provision mensuelle" />
          </div>
          {/* Dépôt de garantie */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="deposit" className="text-right">Dépôt de garantie (€)</Label>
            <Input id="deposit" type="number" className="col-span-3" value={securityDeposit} onChange={e => setSecurityDeposit(e.target.value)} />
          </div>
          {/* Lieu de signature */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="place" className="text-right">Fait à</Label>
            <Input id="place" className="col-span-3" value={signaturePlace} onChange={e => setSignaturePlace(e.target.value)} placeholder="Lieu de signature du bail" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (leaseToEdit ? 'Modification...' : 'Enregistrement...') : (leaseToEdit ? 'Modifier' : 'Enregistrer')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
