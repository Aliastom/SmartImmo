export default function EtatActuel() {
  // À remplacer par une vraie récupération Supabase + hook synthèse
  const biens = [
    { id: '1', nom: '146A', loyer: 7000, charges: 2000, impot: 1200, net: 7.1, netNet: 5.9 },
    { id: '2', nom: '22B', loyer: 3000, charges: 900, impot: 800, net: 6.2, netNet: 3.7 },
  ];
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">État actuel par bien</h2>
      <table className="min-w-full border text-xs">
        <thead>
          <tr>
            <th>Bien</th>
            <th>Loyer</th>
            <th>Charges</th>
            <th>Impôt</th>
            <th>Net</th>
            <th>Net-net</th>
          </tr>
        </thead>
        <tbody>
          {biens.map(bien => (
            <tr key={bien.id}>
              <td>{bien.nom}</td>
              <td>{bien.loyer.toLocaleString()} €</td>
              <td>{bien.charges.toLocaleString()} €</td>
              <td>{bien.impot.toLocaleString()} €</td>
              <td>{bien.net.toFixed(2)} %</td>
              <td>{bien.netNet.toFixed(2)} %</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
