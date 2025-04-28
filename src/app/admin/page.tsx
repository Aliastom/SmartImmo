"use client";

import React, { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import CategoryTypeModal from './CategoryTypeModal';
import DeleteConfirmModal from './DeleteConfirmModal';

interface Category {
  id: string;
  name: string;
  scope: string;
  active: boolean;
  visible: boolean;
}

interface Type {
  id: string;
  name: string;
  category_id: string;
  category?: Category;
  scope: string;
  active: boolean;
  deductible: boolean;
  visible: boolean;
}

export default function AdminPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'category' | 'type'>('category');
  const [modalInitialData, setModalInitialData] = useState<any>({});
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'category' | 'type'; item: any } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('');

  useEffect(() => {
    async function fetchUser() {
      setAuthLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/');
        return;
      }
      // Récupérer le profil utilisateur (table users)
      const { data: users, error } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', user.id)
        .maybeSingle();
      if (!users || users.role !== 'admin') {
        router.replace('/');
        return;
      }
      setUser(users);
      setAuthLoading(false);
    }
    fetchUser();
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    // On ne récupère pas que les visibles ici, car l'admin doit pouvoir gérer tout
    const { data: catData } = await supabase.from('categories').select('*');
    setCategories(catData || []);
    const { data: typeData } = await supabase.from('types').select('*');
    setTypes(typeData || []);
    setLoading(false);
  }

  // Si chargement ou pas autorisé, masquer la page
  if (authLoading) {
    return <div className="text-center py-10 text-gray-400">Chargement...</div>;
  }

  // Modals
  const filteredTypes = selectedCategoryFilter
    ? types.filter((type) => type.category_id === selectedCategoryFilter)
    : types;

  // Ajout
  function openAddCategoryModal() {
    setModalMode('category');
    setModalInitialData({ name: '', scope: 'both', active: true, visible: true });
    setModalOpen(true);
  }
  function openAddTypeModal() {
    setModalMode('type');
    setModalInitialData({
      name: '',
      category_id: selectedCategoryFilter || '',
      scope: 'both',
      active: true,
      deductible: false,
      visible: true
    });
    setModalOpen(true);
  }

  // Edition
  function openEditCategoryModal(cat: Category) {
    setModalMode('category');
    setModalInitialData(cat);
    setModalOpen(true);
  }
  function openEditTypeModal(type: Type) {
    setModalMode('type');
    setModalInitialData(type);
    setModalOpen(true);
  }

  // Suppression
  function openDeleteCategory(cat: Category) {
    setDeleteTarget({ type: 'category', item: cat });
    setDeleteModalOpen(true);
  }
  function openDeleteType(type: Type) {
    setDeleteTarget({ type: 'type', item: type });
    setDeleteModalOpen(true);
  }

  // Sauvegarde
  async function handleSaveCategoryType(form: any) {
    setLoading(true);
    if (modalMode === 'category') {
      if (form.id) {
        await supabase.from('categories').update({ name: form.name, visible: form.visible }).eq('id', form.id);
      } else {
        await supabase.from('categories').insert({ name: form.name, visible: form.visible });
      }
    } else {
      if (form.id) {
        await supabase.from('types').update({ name: form.name, category_id: form.category_id, visible: form.visible }).eq('id', form.id);
      } else {
        await supabase.from('types').insert({ name: form.name, category_id: form.category_id, visible: form.visible });
      }
    }
    setModalOpen(false);
    await fetchData();
    setLoading(false);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    if (deleteTarget.type === 'category') {
      // Vérifier s'il y a des types associés à cette catégorie
      const typesToDelete = types.filter(t => t.category_id === deleteTarget.item.id);
      if (typesToDelete.length > 0) {
        // On ne supprime pas la catégorie si des types existent
        setDeleteLoading(false);
        setDeleteModalOpen(false);
        alert("Impossible de supprimer la catégorie : des types y sont encore associés.");
        return;
      }
      await supabase.from('categories').delete().eq('id', deleteTarget.item.id);
    } else {
      // Vérifier s'il y a des transactions associées à ce type
      // (On suppose qu'il existe une table 'transactions' avec un champ 'type_id')
      const { data: transactions, error } = await supabase.from('transactions').select('id').eq('type_id', deleteTarget.item.id);
      if (transactions && transactions.length > 0) {
        setDeleteLoading(false);
        setDeleteModalOpen(false);
        alert("Impossible de supprimer ce type : des transactions y sont encore associées.");
        return;
      }
      await supabase.from('types').delete().eq('id', deleteTarget.item.id);
    }
    setDeleteLoading(false);
    setDeleteModalOpen(false);
    setDeleteTarget(null);
    fetchData();
  }

  async function toggleCategoryVisibility(catId: string, current: boolean) {
    setLoading(true);
    await supabase.from('categories').update({ visible: !current }).eq('id', catId);
    await fetchData();
    setLoading(false);
  }

  async function toggleTypeVisibility(typeId: string, current: boolean) {
    setLoading(true);
    await supabase.from('types').update({ visible: !current }).eq('id', typeId);
    await fetchData();
    setLoading(false);
  }

  return (
    <div className="w-full max-w-7xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-10 text-gray-800 flex items-center gap-4">
        <span>Administration</span>
        <span className="inline-block animate-spin">
          {/* Icône engrenage SVG plus grand et plus "classique" */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 48 48" className="w-14 h-14 text-indigo-500">
            <path d="M40.7 27c.1-.6.1-1.3.1-2s0-1.4-.1-2l4.1-3.2c.4-.3.5-.9.2-1.4l-3.9-6.8c-.2-.4-.8-.6-1.3-.4l-4.8 1.9c-1-.8-2.1-1.5-3.2-2l-.7-5c-.1-.5-.5-.9-1-.9h-7.8c-.5 0-.9.4-1 .9l-.7 5c-1.1.5-2.2 1.2-3.2 2l-4.8-1.9c-.5-.2-1.1 0-1.3.4l-3.9 6.8c-.3.5-.2 1.1.2 1.4l4.1 3.2c-.1.6-.1 1.3-.1 2s0 1.4.1 2l-4.1 3.2c-.4.3-.5.9-.2 1.4l3.9 6.8c.2.4.8.6 1.3.4l4.8-1.9c1 .8 2.1 1.5 3.2 2l.7 5c.1.5.5.9 1 .9h7.8c.5 0 .9-.4 1-.9l.7-5c1.1-.5 2.2-1.2 3.2-2l4.8 1.9c.5.2 1.1 0 1.3-.4l3.9-6.8c.3-.5.2-1.1-.2-1.4l-4.1-3.2zM24 31c-3.9 0-7-3.1-7-7s3.1-7 7-7 7 3.1 7 7-3.1 7-7 7z"/>
          </svg>
        </span>
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Catégories */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-700">Catégories</h2>
            <button className="bg-indigo-600 hover:bg-indigo-700 transition text-white px-5 py-2 rounded-lg font-medium shadow" onClick={openAddCategoryModal}>Ajouter</button>
          </div>
          <div className="mb-6">
            <select
              className="border px-3 py-2 rounded-lg w-full bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={selectedCategoryFilter}
              onChange={e => setSelectedCategoryFilter(e.target.value)}
            >
              <option value="">Toutes les catégories</option>
              {categories.map(cat => (
                <option value={cat.id} key={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <ul className="divide-y">
            {categories
              .filter(cat => !selectedCategoryFilter || cat.id === selectedCategoryFilter)
              .map(cat => (
                <li key={cat.id} className="py-4 flex justify-between items-center group transition hover:bg-gray-50 rounded-lg px-2">
                  <span className="flex items-center gap-3">
                    <span className="font-medium text-gray-800">{cat.name}</span>
                    <span className="text-xs text-gray-400">[{cat.scope}]</span>
                    <button
                      className={`ml-1 p-1 rounded-full transition ${cat.visible ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100'}`}
                      title={cat.visible ? 'Rendre invisible' : 'Rendre visible'}
                      onClick={() => toggleCategoryVisibility(cat.id, cat.visible)}
                      disabled={loading}
                    >
                      {cat.visible ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.956 9.956 0 012.293-3.95m3.25-2.7A9.956 9.956 0 0112 5c4.478 0 8.268 2.943 9.542 7a9.956 9.956 0 01-4.293 5.95M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 6L6 6" /></svg>
                      )}
                    </button>
                    {cat.visible
                      ? <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Visible</span>
                      : <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Non visible</span>
                    }
                  </span>
                  <div className="flex gap-2">
                    <button className="text-xs text-indigo-600 hover:text-indigo-800 transition font-medium opacity-0 group-hover:opacity-100" onClick={() => openEditCategoryModal(cat)}>éditer</button>
                    <button className="text-xs text-red-600 hover:text-red-800 transition font-medium opacity-0 group-hover:opacity-100" onClick={() => openDeleteCategory(cat)}>supprimer</button>
                  </div>
                </li>
              ))}
          </ul>
        </div>
        {/* Types */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-700">Types</h2>
            <button className="bg-indigo-600 hover:bg-indigo-700 transition text-white px-5 py-2 rounded-lg font-medium shadow" onClick={openAddTypeModal}>Ajouter</button>
          </div>
          <ul className="divide-y">
            {filteredTypes.map(type => (
              <li key={type.id} className="py-4 flex justify-between items-center group transition hover:bg-gray-50 rounded-lg px-2">
                <span className="flex items-center gap-3 flex-wrap">
                  <span className="font-medium text-gray-800">{type.name}</span>
                  {type.category && (
                    <span className="text-xs text-gray-500">({type.category.name})</span>
                  )}
                  <span className="text-xs text-gray-400">[{type.scope}]</span>
                  {type.deductible && (
                    <span className="ml-2 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-semibold border border-green-200">Déductible</span>
                  )}
                  <button
                    className={`ml-1 p-1 rounded-full transition ${type.visible ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100'}`}
                    title={type.visible ? 'Rendre invisible' : 'Rendre visible'}
                    onClick={() => toggleTypeVisibility(type.id, type.visible)}
                    disabled={loading}
                  >
                    {type.visible ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.956 9.956 0 012.293-3.95m3.25-2.7A9.956 9.956 0 0112 5c4.478 0 8.268 2.943 9.542 7a9.956 9.956 0 01-4.293 5.95M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 6L6 6" /></svg>
                    )}
                  </button>
                  {type.visible
                    ? <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Visible</span>
                    : <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Non visible</span>
                  }
                </span>
                <div className="flex gap-2">
                  <button className="text-xs text-indigo-600 hover:text-indigo-800 transition font-medium opacity-0 group-hover:opacity-100" onClick={() => openEditTypeModal(type)}>éditer</button>
                  <button className="text-xs text-red-600 hover:text-red-800 transition font-medium opacity-0 group-hover:opacity-100" onClick={() => openDeleteType(type)}>supprimer</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {loading && <div className="mt-6 text-center text-gray-400">Chargement...</div>}
      <CategoryTypeModal
        open={modalOpen}
        mode={modalMode}
        categories={categories}
        initialData={modalInitialData}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveCategoryType}
      />
      <DeleteConfirmModal
        open={deleteModalOpen}
        title={deleteTarget?.type === 'category' ? 'Supprimer la catégorie' : 'Supprimer le type'}
        message={
          deleteTarget?.type === 'category'
            ? 'Voulez-vous vraiment supprimer cette catégorie ? (Impossible si des types y sont associés)'
            : 'Voulez-vous vraiment supprimer ce type ? (Impossible si des transactions y sont associées)'
        }
        onCancel={() => { setDeleteModalOpen(false); setDeleteLoading(false); }}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
