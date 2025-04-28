export default function ProjectionFinAnnee() {
  // À remplacer par une vraie simulation
  const biens = [
    { id: '1', nom: '146A', loyer: 7200, charges: 2100, impot: 1250, net: 7.3, netNet: 6.0 },
    { id: '2', nom: '22B', loyer: 3100, charges: 950, impot: 820, net: 6.4, netNet: 3.9 },
  ];
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Projection fin d'année par bien</h2>
      <table className="min-w-full border text-xs">
        <thead>
          <tr>
            <th>Bien</th>
            <th>Loyer projeté</th>
            <th>Charges projetées</th>
            <th>Impôt projeté</th>
            <th>Net projeté</th>
            <th>Net-net projeté</th>
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
