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

type Mode = "category" | "type";

type Props = {
  open: boolean;
  mode: Mode;
  categories?: Category[];
  initialData?: Partial<Category | Type>;
  onClose: () => void;
  onSave: (data: any) => void;
};

export default function CategoryTypeModal({ open, mode, categories = [], initialData = {}, onClose, onSave }: Props) {
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    setForm({ ...initialData, visible: initialData.visible !== undefined ? initialData.visible : true });
  }, [initialData, open]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type, checked } = e.target;
    setForm((prev: any) => ({
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
          {mode === "category" ? (form.id ? "Éditer la catégorie" : "Ajouter une catégorie") : (form.id ? "Éditer le type" : "Ajouter un type")}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nom</label>
            <input
              name="name"
              type="text"
              className="border rounded px-2 py-1 w-full"
              value={form.name || ""}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Scope</label>
            <select
              name="scope"
              className="border rounded px-2 py-1 w-full"
              value={form.scope || "both"}
              onChange={handleChange}
            >
              <option value="both">both</option>
              <option value="transaction">transaction</option>
              <option value="document">document</option>
            </select>
          </div>
          {mode === "category" ? null : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Catégorie</label>
                <select
                  name="category_id"
                  className="border rounded px-2 py-1 w-full"
                  value={form.category_id || ""}
                  onChange={handleChange}
                  required
                >
                  <option value="">Sélectionner...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="deductible"
                  checked={!!form.deductible}
                  onChange={handleChange}
                  id="deductible"
                />
                <label htmlFor="deductible" className="text-sm">Déductible</label>
              </div>
            </>
          )}
          <div>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                name="visible"
                checked={form.visible}
                onChange={handleChange}
                className="mr-2"
              />
              Visible dans l'application
            </label>
          </div>
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
