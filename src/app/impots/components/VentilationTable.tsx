import { useVentilationImpots } from '../hooks/useVentilationImpots';

export default function VentilationTable() {
  const { biens, ventilation, setVentilation, autoVentiler, saveVentilation } = useVentilationImpots();

  return (
    <div>
      <h3 className="font-semibold mb-2">Ventilation de l'impôt foncier par bien</h3>
      <table className="min-w-full border text-xs">
        <thead>
          <tr>
            <th>Bien</th>
            <th>Loyer annuel</th>
            <th>Impôt affecté (€)</th>
            <th>% du total</th>
          </tr>
        </thead>
        <tbody>
          {biens.map(bien => (
            <tr key={bien.id}>
              <td>{bien.nom}</td>
              <td>{bien.loyerAnnuel.toLocaleString()} €</td>
              <td>
                <input
                  type="number"
                  value={ventilation[bien.id] || 0}
                  min={0}
                  onChange={e => setVentilation(bien.id, Number(e.target.value))}
                  className="border rounded px-1 w-20"
                />
              </td>
              <td>
                {ventilation.total > 0
                  ? ((ventilation[bien.id] || 0) / ventilation.total * 100).toFixed(1) + ' %'
                  : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-2 mt-2">
        <button className="btn btn-secondary" onClick={autoVentiler}>Répartir automatiquement</button>
        <button className="btn btn-primary" onClick={saveVentilation}>Sauvegarder</button>
      </div>
    </div>
  );
}
