"use client";
import React, { useState, useEffect } from "react";

interface Category {
  id?: string;
  name: string;
  scope: string;
  active: boolean;
  visible?: boolean;
}

interface Type {
  id?: string;
  name: string;
  category_id: string;
  scope: string;
  active: boolean;
  deductible: boolean;
  visible?: boolean;
}

interface TaxParameter {
  id?: string;
  year: number;
  decote_seuil_celibataire: number;
  decote_seuil_couple: number;
  decote_forfait_celibataire: number;
  decote_forfait_couple: number;
  decote_taux: number;
  active: boolean;
}

type Mode = "category" | "type" | "taxParameter";

type Props = {
  open: boolean;
  mode: Mode;
  categories?: Category[];
  initialData?: Partial<Category | Type | TaxParameter>;
  onClose: () => void;
  onSave: (data: any) => void;
};

type FormState = {
  id?: string;
  name?: string;
  scope?: string;
  visible?: boolean;
  category_id?: string;
  deductible?: boolean;
  year?: number;
  decote_seuil_celibataire?: number;
  decote_seuil_couple?: number;
  decote_forfait_celibataire?: number;
  decote_forfait_couple?: number;
  decote_taux?: number;
  active?: boolean;
};

export default function CategoryTypeModal({ open, mode, categories = [], initialData = {}, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>({
    // Valeurs par défaut pour éviter les inputs uncontrolled
    name: '',
    scope: 'both',
    visible: true,
    category_id: '',
    deductible: false,
    year: new Date().getFullYear() + 1,
    decote_seuil_celibataire: 1964,
    decote_seuil_couple: 3248,
    decote_forfait_celibataire: 889,
    decote_forfait_couple: 1470,
    decote_taux: 0.4525,
    active: true
  });

  useEffect(() => {
    if (mode === "taxParameter") {
      const taxData = initialData as Partial<TaxParameter>;
      setForm((prev: FormState) => ({
        ...prev,
        year: taxData.year ?? prev.year,
        decote_seuil_celibataire: taxData.decote_seuil_celibataire ?? prev.decote_seuil_celibataire,
        decote_seuil_couple: taxData.decote_seuil_couple ?? prev.decote_seuil_couple,
        decote_forfait_celibataire: taxData.decote_forfait_celibataire ?? prev.decote_forfait_celibataire,
        decote_forfait_couple: taxData.decote_forfait_couple ?? prev.decote_forfait_couple,
        decote_taux: taxData.decote_taux ?? prev.decote_taux,
        active: taxData.active ?? prev.active,
        id: taxData.id ?? prev.id
      }));
    } else {
      setForm((prev: FormState) => ({
        ...prev,
        ...initialData,
        visible: (initialData as any).visible ?? prev.visible,
        name: (initialData as any).name ?? prev.name,
        scope: (initialData as any).scope ?? prev.scope,
        category_id: (initialData as any).category_id ?? prev.category_id,
        deductible: (initialData as any).deductible ?? prev.deductible
      }));
    }
  }, [initialData, open, mode]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev: FormState) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
          onClick={onClose}
        >
          ✕
        </button>
        <h2 className="text-lg font-bold mb-4">
          {mode === "category" ? (form.id ? "Éditer la catégorie" : "Ajouter une catégorie") :
           mode === "type" ? (form.id ? "Éditer le type" : "Ajouter un type") :
           (form.id ? "Éditer les paramètres fiscaux" : "Ajouter des paramètres fiscaux")}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "category" ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Nom</label>
                <input
                  name="name"
                  type="text"
                  className="border rounded px-2 py-1 w-full"
                  value={form.name ?? ''}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Scope</label>
                <select
                  name="scope"
                  className="border rounded px-2 py-1 w-full"
                  value={form.scope ?? 'both'}
                  onChange={handleChange}
                >
                  <option value="both">both</option>
                  <option value="transaction">transaction</option>
                  <option value="document">document</option>
                </select>
              </div>
              <div>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="visible"
                    checked={form.visible ?? false}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  Visible dans l'application
                </label>
              </div>
            </>
          ) : mode === "type" ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Nom</label>
                <input
                  name="name"
                  type="text"
                  className="border rounded px-2 py-1 w-full"
                  value={form.name ?? ''}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Catégorie</label>
                <select
                  name="category_id"
                  className="border rounded px-2 py-1 w-full"
                  value={form.category_id ?? ''}
                  onChange={handleChange}
                  required
                >
                  <option value="">Sélectionner...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Scope</label>
                <select
                  name="scope"
                  className="border rounded px-2 py-1 w-full"
                  value={form.scope ?? 'both'}
                  onChange={handleChange}
                >
                  <option value="both">both</option>
                  <option value="transaction">transaction</option>
                  <option value="document">document</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="deductible"
                  checked={form.deductible ?? false}
                  onChange={handleChange}
                  id="deductible"
                />
                <label htmlFor="deductible" className="text-sm">Déductible</label>
              </div>
              <div>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="visible"
                    checked={form.visible ?? false}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  Visible dans l'application
                </label>
              </div>
            </>
          ) : (
            // Mode paramètres fiscaux
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Année</label>
                <input
                  name="year"
                  type="number"
                  className="border rounded px-2 py-1 w-full"
                  value={form.year ?? ''}
                  onChange={handleChange}
                  required
                  min="2020"
                  max="2030"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Seuil décote célibataire (€)</label>
                  <input
                    name="decote_seuil_celibataire"
                    type="number"
                    step="0.01"
                    className="border rounded px-2 py-1 w-full"
                    value={form.decote_seuil_celibataire ?? ''}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Seuil décote couple (€)</label>
                  <input
                    name="decote_seuil_couple"
                    type="number"
                    step="0.01"
                    className="border rounded px-2 py-1 w-full"
                    value={form.decote_seuil_couple ?? ''}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Forfait décote célibataire (€)</label>
                  <input
                    name="decote_forfait_celibataire"
                    type="number"
                    step="0.01"
                    className="border rounded px-2 py-1 w-full"
                    value={form.decote_forfait_celibataire ?? ''}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Forfait décote couple (€)</label>
                  <input
                    name="decote_forfait_couple"
                    type="number"
                    step="0.01"
                    className="border rounded px-2 py-1 w-full"
                    value={form.decote_forfait_couple ?? ''}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Taux décote (%)</label>
                <input
                  name="decote_taux"
                  type="number"
                  step="0.01"
                  className="border rounded px-2 py-1 w-full"
                  value={form.decote_taux ? (form.decote_taux * 100).toFixed(2) : ''}
                  onChange={(e) => {
                    const percentage = parseFloat(e.target.value) || 0;
                    handleChange({
                      target: { name: 'decote_taux', value: percentage / 100 }
                    } as any);
                  }}
                  required
                  min="0"
                  max="100"
                />
                <p className="text-xs text-gray-500 mt-1">Ex: 45.25 pour 45,25%</p>
              </div>
              <div>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="active"
                    checked={form.active ?? false}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  Paramètres actifs
                </label>
              </div>
            </>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              className="px-4 py-1 rounded bg-gray-200 hover:bg-gray-300"
              onClick={onClose}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {form.id ? "Enregistrer" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
