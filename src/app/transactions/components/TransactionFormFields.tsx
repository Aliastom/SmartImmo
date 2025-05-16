import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ComboboxPlatform } from "@/components/ui/combobox-platform";
import { motion } from "framer-motion";
import React, { useRef, useCallback, useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface Property { id: string; name: string; category?: string; categoryName?: string; }

interface TransactionFormFieldsProps {
  formData: any;
  setFormData: (fn: (prev: any) => any) => void;
  categories: any[];
  types: any[];
  properties: Property[];
  isLoading: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  handleCategoryChange: (categoryId: string) => void;
  attachments: File[];
  attachmentsInputRef: React.RefObject<HTMLInputElement>;
  handleAttachmentsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveAttachment: (idx: number) => void;
  existingAttachments: any[];
  handleRemoveExistingAttachment: (id: string) => void;
  fetchError: string | null;
  onClose: (saved?: boolean) => void;
  transactionId?: string;
  transactionToClone?: any;
}

const typeColors: Record<string, string> = {
  income: 'bg-green-800 text-green-200',
  expense: 'bg-red-900 text-red-200',
};

const TransactionFormFields: React.FC<TransactionFormFieldsProps> = ({
  formData, setFormData, categories, types, properties, isLoading,
  handleSubmit, handleCategoryChange,
  attachments, attachmentsInputRef, handleAttachmentsChange, handleRemoveAttachment,
  existingAttachments, handleRemoveExistingAttachment, fetchError,
  onClose, transactionId, transactionToClone
}) => {
  // Drag & drop pour pièces jointes
  const dropRef = useRef<HTMLDivElement>(null);
  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dt = e.dataTransfer.files;
      const fileList = Array.from(dt);
      // Simule un event pour handleAttachmentsChange
      const input = attachmentsInputRef.current;
      if (input) {
        const dataTransfer = new DataTransfer();
        fileList.forEach(f => dataTransfer.items.add(f));
        input.files = dataTransfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }, [attachmentsInputRef, handleAttachmentsChange]);

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // Focus auto sur le premier champ
  const firstInputRef = useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (firstInputRef.current) firstInputRef.current.focus();
  }, []);

  // Détection du bien saisonnier/Airbnb
  const selectedProperty = properties.find(p => p.id === formData.property_id);
  const isSaisonnier = selectedProperty && ((selectedProperty.categoryName && selectedProperty.categoryName.toLowerCase().includes('saison')) || (selectedProperty.category && selectedProperty.category.toLowerCase().includes('saison')));

  // Animation de l'icône principale : "danse" en boucle tant que la modale est ouverte
  const [iconLoop, setIconLoop] = React.useState(true);

  // Ajout du state pour l'animation de danse
  const [dancing, setDancing] = React.useState(false);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* HEADER PRINCIPAL */}
      <div className="flex items-center gap-3 mb-10 mt-4">
        <motion.div
          animate={{ scale: [1, 1.18, 0.95, 1.1, 1], rotate: [0, 12, -10, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' }}
          className={`rounded-full p-2 shadow ${formData.transaction_type === 'income' ? 'bg-green-800 text-green-200' : formData.transaction_type === 'expense' ? 'bg-red-900 text-red-200' : 'bg-gray-100 text-gray-700'}`}
        >
          {formData.transaction_type === 'income' ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          ) : formData.transaction_type === 'expense' ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4"/></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>
          )}
        </motion.div>
        <div>
          <span className="text-xl font-bold">
            {transactionId ? 'Modifier la transaction' : transactionToClone ? 'Dupliquer la transaction' : 'Ajouter une transaction'}
          </span>
          {formData.transaction_type && (
            <Badge className={`ml-2 ${typeColors[formData.transaction_type]}`}>{formData.transaction_type === 'income' ? 'Revenu' : 'Dépense'}</Badge>
          )}
        </div>
      </div>
      {/* GROUPE TRANSACTION */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 bg-gray-50 rounded-lg p-6 mb-2">
        <div>
          <Label htmlFor="property_id" className="mb-2 block">Bien</Label>
          <Select
            value={formData.property_id || undefined}
            onValueChange={val => setFormData((prev: any) => ({ ...prev, property_id: val }))}
            disabled={isLoading || properties.length === 0}
          >
            <SelectTrigger id="property_id">
              <SelectValue placeholder="Sélectionnez un bien" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="transaction_type" className="mb-2 block">Type de transaction</Label>
          <Select
            value={formData.transaction_type || undefined}
            onValueChange={val => setFormData((prev: any) => ({ ...prev, transaction_type: val }))}
            disabled={isLoading}
          >
            <SelectTrigger id="transaction_type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="income">Revenu</SelectItem>
              <SelectItem value="expense">Dépense</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="category" className="mb-2 block">Catégorie</Label>
          <Select
            value={formData.category || 'all'}
            onValueChange={val => handleCategoryChange(val)}
            disabled={isLoading || categories.length === 0}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Sélectionnez une catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="type" className="mb-2 block">Type</Label>
          <Select
            value={formData.type || 'all'}
            onValueChange={val => setFormData((prev: any) => ({ ...prev, type: val }))}
            disabled={isLoading || types.length === 0}
          >
            <SelectTrigger id="type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {types.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* SÉPARATEUR */}
      <div className="h-4"></div>
      {/* GROUPE MONTANT & DATE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amount">Montant</Label>
          <div className="relative flex items-center">
            <Input
              id="amount"
              type="number"
              ref={firstInputRef}
              value={formData.amount}
              onChange={e => setFormData((prev: any) => ({ ...prev, amount: e.target.value }))}
              disabled={isLoading}
              min="0"
              step="0.01"
              placeholder="Montant"
              className="pr-16"
            />
            {formData.transaction_type && (
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold ${formData.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{formData.transaction_type === 'income' ? '+' : '-'} €</span>
            )}
          </div>
        </div>
        <div>
          <Label htmlFor="nb_months" className="mb-2 block">Nombre de mois couverts</Label>
          <Input
            id="nb_months"
            type="number"
            min={1}
            value={formData.nb_months || 1}
            onChange={e => setFormData((prev: any) => ({ ...prev, nb_months: Math.max(1, Number(e.target.value)) }))}
            disabled={isLoading}
            style={{ maxWidth: 120 }}
          />
          {formData.nb_months > 1 && formData.amount && (
            <div className="text-xs text-gray-500 mt-1">
              Montant par mois : {(Number(formData.amount) / formData.nb_months).toFixed(2)} €
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={e => setFormData((prev: any) => ({ ...prev, date: e.target.value }))}
            disabled={isLoading}
          />
        </div>
        <div>
          <Label htmlFor="accounting_month">Mois comptable</Label>
          <Input
            id="accounting_month"
            type="month"
            value={formData.accounting_month}
            onChange={e => setFormData((prev: any) => ({ ...prev, accounting_month: e.target.value }))}
            disabled={isLoading}
          />
        </div>
      </div>
      {/* SÉPARATEUR */}
      <div className="h-4"></div>
      {/* Champs spécifiques Airbnb/Saisonnière */}
      {isSaisonnier && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div>
            <Label htmlFor="platform">Plateforme</Label>
            <ComboboxPlatform
              value={formData.platform || ''}
              onChange={val => setFormData((prev: any) => ({ ...prev, platform: val }))}
              placeholder="ex: Airbnb, Booking, Abritel..."
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="reservation_ref">Référence réservation</Label>
            <Input
              id="reservation_ref"
              placeholder="ex: ABC12345"
              value={formData.reservation_ref || ''}
              onChange={e => setFormData((prev: any) => ({ ...prev, reservation_ref: e.target.value }))}
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="start_date">Date début (période)</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date ?? ''}
              onChange={e => {
                const v = e.target.value;
                setFormData((prev: any) => ({
                  ...prev,
                  start_date: v === '' ? null : v
                }));
              }}
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="end_date">Date fin (période)</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date ?? ''}
              onChange={e => {
                const v = e.target.value;
                setFormData((prev: any) => ({
                  ...prev,
                  end_date: v === '' ? null : v
                }));
              }}
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="guest_name">Nom du voyageur (optionnel)</Label>
            <Input
              id="guest_name"
              placeholder="Prénom Nom"
              value={formData.guest_name || ''}
              onChange={e => setFormData((prev: any) => ({ ...prev, guest_name: e.target.value }))}
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Input
              id="notes"
              placeholder="Infos complémentaires"
              value={formData.notes || ''}
              onChange={e => setFormData((prev: any) => ({ ...prev, notes: e.target.value }))}
              disabled={isLoading}
            />
          </div>
        </div>
      )}
      {/* GROUPE DESCRIPTION & ATTACHMENTS */}
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={e => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
          disabled={isLoading}
          rows={2}
          placeholder="Description"
        />
      </div>
      {/* Pièces jointes modernisées avec Drag & Drop */}
      <div>
        <Label>Pièces jointes</Label>
        <div
          ref={dropRef}
          onDrop={onDrop}
          onDragOver={onDragOver}
          className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition mb-2 bg-gray-50"
          onClick={() => attachmentsInputRef.current?.click()}
        >
          <span className="text-gray-500">Glissez-déposez vos fichiers ici ou cliquez pour sélectionner</span>
          <Input
            type="file"
            multiple
            ref={attachmentsInputRef}
            onChange={handleAttachmentsChange}
            disabled={isLoading}
            className="hidden"
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {attachments.map((file, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center space-x-2 bg-blue-50 px-2 py-1 rounded shadow-sm"
            >
              <span className="text-xs font-medium text-blue-800">{file.name}</span>
              <Button type="button" size="sm" variant="ghost" onClick={() => handleRemoveAttachment(idx)}>
                Supprimer
              </Button>
            </motion.div>
          ))}
          {existingAttachments.map((doc, idx) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center space-x-2 bg-gray-100 px-2 py-1 rounded shadow-sm"
            >
              <a
                href={doc.signedUrl || doc.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline text-blue-600"
                style={{ pointerEvents: doc.signedUrl || doc.url ? 'auto' : 'none', color: (doc.signedUrl || doc.url) ? '#2563eb' : '#aaa', cursor: (doc.signedUrl || doc.url) ? 'pointer' : 'not-allowed' }}
                onClick={e => {
                  if (!(doc.signedUrl || doc.url)) e.preventDefault();
                  e.stopPropagation();
                }}
              >{doc.name || doc.file_name || 'Pièce jointe'}</a>
              <Button type="button" size="sm" variant="ghost" onClick={() => handleRemoveExistingAttachment(doc.id)}>
                Supprimer
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
      {/* BOUTONS */}
      <div className="flex justify-end gap-2 pt-4">
        <button
          type="button"
          className={`btn-glass w-fit btn-cancel-white-blue group ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
          style={{ minWidth: 'fit-content', maxWidth: '320px', overflow: 'hidden', position: 'relative', marginBottom: '0.08em', background: '#fff', color: 'var(--si-blue)' }}
          disabled={isLoading}
          onClick={() => onClose(false)}
        >
          <span className="relative flex items-center gap-2">
            <motion.span
              className="inline-block"
              animate={undefined}
              whileHover={undefined}
              whileTap={undefined}
            >
              <svg className="w-4 h-4 group-hover:pulse-anim" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
            </motion.span>
            Annuler
          </span>
        </button>
        <button
          type="submit"
          className={`btn-glass w-fit btn-animated-yellow group ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          style={{ minWidth: 'fit-content', maxWidth: '320px', overflow: 'hidden', position: 'relative', marginBottom: '0.08em' }}
          disabled={isLoading}
        >
          <span className="btn-animated-yellow-bg" />
          <span className="relative flex items-center gap-2 group"
            onMouseEnter={() => setDancing(true)}
            onMouseLeave={() => setDancing(false)}
          >
            <motion.span
              className="inline-block"
              animate={dancing ? "dance" : "idle"}
              variants={{
                dance: { rotate: [0, 18, -14, 10, 0], scale: [1, 1.13, 0.93, 1.08, 1], transition: { duration: 1.2, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' } },
                idle: { rotate: 0, scale: 1 }
              }}
              initial="idle"
            >
              {isLoading ? (
                <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
              ) : (
                transactionId ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                )
              )}
            </motion.span>
            {transactionId ? 'Enregistrer' : 'Ajouter'}
          </span>
        </button>
      </div>
    </form>
  );
};

export default TransactionFormFields;
