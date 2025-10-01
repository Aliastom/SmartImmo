"use client";

import React, { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import CategoryTypeModal from './CategoryTypeModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import { AnimatedCard, LoadingSpinner, PageTransition } from '@/components/ui/animated'
import { PageHeader } from '@/components/ui/page-header'

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

interface TaxParameter {
  id: string;
  year: number;
  decote_seuil_celibataire: number;
  decote_seuil_couple: number;
  decote_forfait_celibataire: number;
  decote_forfait_couple: number;
  decote_taux: number;
  active: boolean;
}

export default function AdminPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [taxParameters, setTaxParameters] = useState<TaxParameter[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'category' | 'type' | 'taxParameter'>('category');
  const [modalInitialData, setModalInitialData] = useState<any>({});
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'category' | 'type' | 'taxParameter'; item: any } | null>(null);
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
    const { data: taxParamsData } = await supabase.from('tax_parameters').select('*').order('year', { ascending: false });
    setTaxParameters(taxParamsData || []);
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
  // Gestion des paramètres fiscaux
  function openAddTaxParameterModal() {
    setModalMode('taxParameter');
    setModalInitialData({
      year: new Date().getFullYear() + 1,
      decote_seuil_celibataire: 1964,
      decote_seuil_couple: 3248,
      decote_forfait_celibataire: 889,
      decote_forfait_couple: 1470,
      decote_taux: 0.4525,
      active: true
    });
    setModalOpen(true);
  }

  function openEditTaxParameterModal(param: TaxParameter) {
    setModalMode('taxParameter');
    setModalInitialData(param);
    setModalOpen(true);
  }

  function openDeleteTaxParameter(param: TaxParameter) {
    setDeleteTarget({ type: 'taxParameter', item: param });
    setDeleteModalOpen(true);
  }

  async function toggleTaxParameterActive(paramId: string, current: boolean) {
    setLoading(true);
    await supabase.from('tax_parameters').update({ active: !current }).eq('id', paramId);
    await fetchData();
    setLoading(false);
  }

  // Sauvegarde
  async function handleSaveCategoryType(form: any) {
    setLoading(true);
    if (modalMode === 'category') {
      if (form.id) {
        await supabase.from('categories').update({
          name: form.name,
          visible: form.visible,
          scope: form.scope,
          active: form.active
        }).eq('id', form.id);
      } else {
        await supabase.from('categories').insert({
          name: form.name,
          visible: form.visible,
          scope: form.scope,
          active: form.active
        });
      }
    } else if (modalMode === 'type') {
      if (form.id) {
        await supabase.from('types').update({
          name: form.name,
          category_id: form.category_id,
          visible: form.visible,
          scope: form.scope,
          active: form.active,
          deductible: form.deductible
        }).eq('id', form.id);
      } else {
        await supabase.from('types').insert({
          name: form.name,
          category_id: form.category_id,
          visible: form.visible,
          scope: form.scope,
          active: form.active,
          deductible: form.deductible
        });
      }
    } else if (modalMode === 'taxParameter') {
      if (form.id) {
        await supabase.from('tax_parameters').update({
          year: form.year,
          decote_seuil_celibataire: form.decote_seuil_celibataire,
          decote_seuil_couple: form.decote_seuil_couple,
          decote_forfait_celibataire: form.decote_forfait_celibataire,
          decote_forfait_couple: form.decote_forfait_couple,
          decote_taux: form.decote_taux,
          active: form.active
        }).eq('id', form.id);
      } else {
        await supabase.from('tax_parameters').insert({
          year: form.year,
          decote_seuil_celibataire: form.decote_seuil_celibataire,
          decote_seuil_couple: form.decote_seuil_couple,
          decote_forfait_celibataire: form.decote_forfait_celibataire,
          decote_forfait_couple: form.decote_forfait_couple,
          decote_taux: form.decote_taux,
          active: form.active
        });
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
    } else if (deleteTarget.type === 'type') {
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
    } else if (deleteTarget.type === 'taxParameter') {
      await supabase.from('tax_parameters').delete().eq('id', deleteTarget.item.id);
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
    <PageTransition className="min-h-screen flex flex-col gap-10 px-0 md:px-0">
      <PageHeader
        title="Administration"
        buttonText="Ajouter une catégorie/type"
        buttonIcon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-2 btn-add-icon"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        }
        onButtonClick={openAddCategoryModal}
        className="mb-6 mt-2 px-0"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
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

      {/* Paramètres fiscaux */}
      <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-700">Paramètres fiscaux</h2>
          <button className="bg-green-600 hover:bg-green-700 transition text-white px-5 py-2 rounded-lg font-medium shadow" onClick={openAddTaxParameterModal}>Ajouter</button>
        </div>
        <div className="grid gap-4">
          {taxParameters.map(param => (
            <div key={param.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-800">Année {param.year}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-1 rounded-full ${param.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {param.active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className={`p-2 rounded-full transition ${param.active ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100'}`}
                    title={param.active ? 'Désactiver' : 'Activer'}
                    onClick={() => toggleTaxParameterActive(param.id, param.active)}
                    disabled={loading}
                  >
                    {param.active ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                  </button>
                  <button className="text-xs text-indigo-600 hover:text-indigo-800 transition font-medium" onClick={() => openEditTaxParameterModal(param)}>éditer</button>
                  <button className="text-xs text-red-600 hover:text-red-800 transition font-medium" onClick={() => openDeleteTaxParameter(param)}>supprimer</button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Seuil célibataire:</span>
                  <span className="ml-2 font-semibold text-gray-800">{param.decote_seuil_celibataire.toLocaleString()}€</span>
                </div>
                <div>
                  <span className="text-gray-600">Seuil couple:</span>
                  <span className="ml-2 font-semibold text-gray-800">{param.decote_seuil_couple.toLocaleString()}€</span>
                </div>
                <div>
                  <span className="text-gray-600">Forfait célibataire:</span>
                  <span className="ml-2 font-semibold text-gray-800">{param.decote_forfait_celibataire.toLocaleString()}€</span>
                </div>
                <div>
                  <span className="text-gray-600">Forfait couple:</span>
                  <span className="ml-2 font-semibold text-gray-800">{param.decote_forfait_couple.toLocaleString()}€</span>
                </div>
                <div>
                  <span className="text-gray-600">Taux décote:</span>
                  <span className="ml-2 font-semibold text-gray-800">{(param.decote_taux * 100).toFixed(2)}%</span>
                </div>
              </div>
            </div>
          ))}
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
        title={deleteTarget?.type === 'category' ? 'Supprimer la catégorie' : deleteTarget?.type === 'type' ? 'Supprimer le type' : 'Supprimer les paramètres fiscaux'}
        message={
          deleteTarget?.type === 'category'
            ? 'Voulez-vous vraiment supprimer cette catégorie ? (Impossible si des types y sont associés)'
            : deleteTarget?.type === 'type'
            ? 'Voulez-vous vraiment supprimer ce type ? (Impossible si des transactions y sont associées)'
            : 'Voulez-vous vraiment supprimer ces paramètres fiscaux ?'
        }
        onCancel={() => { setDeleteModalOpen(false); setDeleteLoading(false); }}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
      />
    </PageTransition>
  );
}
