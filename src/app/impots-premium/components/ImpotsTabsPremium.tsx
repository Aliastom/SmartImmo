"use client";
import React, { useState } from 'react';
import '../../../styles/animations.css'

// Ajout de l'animation sparkle
const Sparkle = () => (
  <span
    className="inline-block animate-sparkle"
    role="img"
    aria-label="sparkles"
    style={{ fontSize: '1.6em', verticalAlign: '-0.1em' }}
  >
    ✨
  </span>
);

function EtatActuel() {
  const biens = [
    { id: '1', nom: '10A', loyer: 3000, charges: 900, impot: 800, net: 6.2, netNet: 3.7 },
    { id: '2', nom: '22B', loyer: 3000, charges: 900, impot: 800, net: 6.2, netNet: 3.7 },
  ];
  return (
    <section>
      <h2 className="text-xl font-bold mb-4">État actuel par bien</h2>
      <table className="min-w-full border text-xs bg-white rounded-xl shadow-lg">
        <thead className="sticky top-0 z-10 bg-blue-50/80 backdrop-blur border-b">
          <tr>
            <th className="p-2 text-left font-bold">Bien</th>
            <th className="p-2 text-left">Loyer</th>
            <th className="p-2 text-left">Charges</th>
            <th className="p-2 text-left">Impôt</th>
            <th className="p-2 text-left">Net</th>
            <th className="p-2 text-left">Net-net</th>
          </tr>
        </thead>
        <tbody>
          {biens.map(bien => (
            <tr key={bien.id} className="transition-all duration-300 hover:bg-blue-50/60 hover:shadow-md cursor-pointer">
              <td className="p-2 font-medium">{bien.nom}</td>
              <td className="p-2">{bien.loyer.toLocaleString()} €</td>
              <td className="p-2">{bien.charges.toLocaleString()} €</td>
              <td className="p-2">{bien.impot.toLocaleString()} €</td>
              <td className="p-2">{bien.net.toFixed(2)} %</td>
              <td className="p-2">{bien.netNet.toFixed(2)} %</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ProjectionFinAnnee() {
  const biens = [
    { id: '1', nom: '10A', loyer: 3100, charges: 950, impot: 820, net: 6.4, netNet: 3.9 },
    { id: '2', nom: '22B', loyer: 3100, charges: 950, impot: 820, net: 6.4, netNet: 3.9 },
  ];
  return (
    <section>
      <h2 className="text-xl font-bold mb-4">Projection fin d'année par bien</h2>
      <table className="min-w-full border text-xs bg-white rounded-xl shadow-lg">
        <thead className="sticky top-0 z-10 bg-purple-50/80 backdrop-blur border-b">
          <tr>
            <th className="p-2 text-left font-bold">Bien</th>
            <th className="p-2 text-left">Loyer projeté</th>
            <th className="p-2 text-left">Charges projetées</th>
            <th className="p-2 text-left">Impôt projeté</th>
            <th className="p-2 text-left">Net projeté</th>
            <th className="p-2 text-left">Net-net projeté</th>
          </tr>
        </thead>
        <tbody>
          {biens.map(bien => (
            <tr key={bien.id} className="transition-all duration-300 hover:bg-purple-50/60 hover:shadow-md cursor-pointer">
              <td className="p-2 font-medium">{bien.nom}</td>
              <td className="p-2">{bien.loyer.toLocaleString()} €</td>
              <td className="p-2">{bien.charges.toLocaleString()} €</td>
              <td className="p-2">{bien.impot.toLocaleString()} €</td>
              <td className="p-2">{bien.net.toFixed(2)} %</td>
              <td className="p-2">{bien.netNet.toFixed(2)} %</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Conseil() {
  return (
    <section>
      <h2 className="text-xl font-bold mb-4">Conseil fiscal personnalisé</h2>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 shadow-md rounded-xl">
          <b>Astuce :</b> Pensez à optimiser la ventilation de votre impôt foncier pour maximiser le rendement net-net de vos biens.
        </div>
        <div className="bg-green-50 border-l-4 border-green-400 p-4 shadow-md rounded-xl">
          <b>Conseil :</b> Vérifiez si vos charges sont bien toutes déclarées et déductibles pour chaque bien.
        </div>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 shadow-md rounded-xl">
          <b>Projection :</b> Simulez l'impact d'un changement de régime fiscal sur vos biens pour anticiper l'année suivante.
        </div>
      </div>
    </section>
  );
}

import DeclarationFiscalePremium from './DeclarationFiscalePremium';

const tabs = [
  { label: 'Déclaration fiscale', component: <DeclarationFiscalePremium /> },
  { label: 'État actuel', component: <EtatActuel /> },
  { label: 'Projection fin d\'année', component: <ProjectionFinAnnee /> },
  { label: 'Conseil', component: <Conseil /> },
];

export default function ImpotsTabsPremium() {
  const [selected, setSelected] = useState(0);
  return (
    <div className="bg-white/90 rounded-2xl shadow-2xl p-4 md:p-8 border border-purple-200 w-full mt-0">
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-3 text-purple-700 drop-shadow">
        <Sparkle /> Module Impôts Premium
      </h1>
      <p className="text-gray-500 mb-8">
        Suivi, projection et optimisation de votre fiscalité immobilière, version design & animations.
      </p>
      <div className="w-full">
        <div className="mb-8 flex gap-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded p-1 sticky top-0 z-10 shadow-md">
          {tabs.map((tab, idx) => (
            <button
              key={tab.label}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-all duration-300 ${selected === idx ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:bg-white/80'}`}
              onClick={() => setSelected(idx)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="grid gap-8">
          {tabs[selected].component}
        </div>
      </div>
    </div>
  );
}
