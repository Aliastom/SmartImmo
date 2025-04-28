import { useState } from 'react';

export function useVentilationImpots() {
  // À remplacer par un fetch Supabase réel
  const biens = [
    { id: '1', nom: '146A', loyerAnnuel: 7000 },
    { id: '2', nom: '22B', loyerAnnuel: 3000 },
  ];
  const [ventilation, setVentilationState] = useState<{ [key: string]: number }>({
    '1': 1200,
    '2': 800,
    total: 2000,
  });

  function setVentilation(id: string, value: number) {
    const next = { ...ventilation, [id]: value };
    next.total = biens.reduce((sum, b) => sum + (next[b.id] || 0), 0);
    setVentilationState(next);
  }

  function autoVentiler() {
    const totalLoyer = biens.reduce((sum, b) => sum + b.loyerAnnuel, 0);
    const totalImpot = ventilation.total;
    const next: { [key: string]: number } = { total: totalImpot };
    biens.forEach(b => {
      next[b.id] = Math.round((b.loyerAnnuel / totalLoyer) * totalImpot);
    });
    setVentilationState(next);
  }

  function saveVentilation() {
    // Appel API Supabase pour sauvegarder la ventilation sur la déclaration fiscale courante
    alert('Ventilation sauvegardée ! (à implémenter)');
  }

  return { biens, ventilation, setVentilation, autoVentiler, saveVentilation };
}
