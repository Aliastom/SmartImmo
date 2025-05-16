import React, { useRef, useState } from "react";
import Papa from "papaparse";

interface SimpleCsvModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (parsedRows: any[]) => void;
  existingTransactions: any[];
}

function getDiffType(csvRow: any, existing: any) {
  if (!existing) return { type: "ajout", diff: null };
  // Liste blanche des champs à comparer
  const fieldsToCompare = [
    "amount",
    "accounting_month",
    "guest_name"
  ];
  const diff: Record<string, { csv: any; existant: any }> = {};
  fieldsToCompare.forEach((key) => {
    if (csvRow[key] !== existing[key]) {
      diff[key] = { csv: csvRow[key], existant: existing[key] };
    }
  });
  if (Object.keys(diff).length === 0) return { type: "inchangé", diff: null };
  return { type: "modifié", diff };
}

// Mapping CSV Airbnb -> Transaction prêt à l'insert
export function mapCsvRowToTransaction(row: any, options: { userId: string, propertyId: string, typeId: string, categoryId: string }): any {
  // Format MM/YYYY à partir de la date de début
  let accountingMonth = "";
  // Recherche la colonne même si espace ou case différente
  let dateDebutRaw = row["Date de début"] || row["Date de début "] || row["date de début"] || row["date de début "] || "";
  let dateFinRaw = row["Date de fin"] || row["Date de fin "] || row["date de fin"] || row["date de fin "] || "";
  const dateDebut = typeof dateDebutRaw === "string" ? dateDebutRaw.trim() : "";
  const dateFin = typeof dateFinRaw === "string" ? dateFinRaw.trim() : "";
  if (dateDebut) {
    const parts = dateDebut.split("/");
    if (parts.length === 3 && parts[1] && parts[2]) {
      // Format YYYY-MM pour la base
      accountingMonth = `${parts[2]}-${parts[1]}`;
    }
  }
  // Conversion en format YYYY-MM-DD si possible
  function toIsoDate(str: string): string {
    if (!str) return "";
    const parts = str.split("/");
    if (parts.length === 3) {
      // Format attendu: DD/MM/YYYY
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return str;
  }
  return {
    user_id: options.userId,
    property_id: options.propertyId,
    type: options.typeId, // ex: af6a63ad-...
    category: options.categoryId, // ex: 4c0c22b4-...
    amount: parseFloat((row["Revenus"] ?? "0").replace(/\s|€/g, '').replace(',', '.')),
    date: new Date().toISOString().slice(0, 10), // aujourd'hui (YYYY-MM-DD)
    accounting_month: accountingMonth,
    description: "", // à remplir si besoin
    transaction_type: "income",
    platform: "Airbnb",
    reservation_ref: row["Code de confirmation"] ?? "",
    guest_name: row["Nom du voyageur"] ?? "",
    notes: "", // à remplir si besoin
    start_date: toIsoDate(dateDebut),
    end_date: toIsoDate(dateFin),
  };
}

export function SimpleCsvModal({ open, onClose, onImport, existingTransactions }: SimpleCsvModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [importReady, setImportReady] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string>("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ",",
      complete: (results: any) => {
        // Ajoute reservation_ref pour uniformiser la comparaison
        const rows = results.data.map((row: any) => ({
          ...row,
          reservation_ref: row["Code de confirmation"] || row["Code de confirmation/réservation"] || row["Référence"] || ""
        }));
        setCsvRows(rows);
        setImportReady(rows.length > 0);
        // Calcul preview
        const previewRows = rows.map((row: any) => {
          // Compare avec les transactions existantes sur reservation_ref
          const existing = existingTransactions.find((t: any) => t.reservation_ref === row.reservation_ref);
          const { type, diff } = getDiffType(row, existing);
          return { ...row, action: type, diff };
        });
        setPreview(previewRows);
      },
      encoding: "utf-8",
    });
  }

  function handleImport() {
    // Ne prend que les ajouts et modifiés
    const toImport = preview.filter((row) => row.action === "ajout" || row.action === "modifié");
    onImport(toImport);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl">
        <div className="p-6 border-b font-bold text-lg flex justify-between items-center">
          Importer un CSV Airbnb
          <span
            className="cursor-pointer text-2xl leading-none"
            onClick={onClose}
            role="button"
            tabIndex={0}
          >
            ×
          </span>
        </div>
        <div className="p-6">
          <div className="mb-4 flex flex-col items-center">
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="mb-2"
            />
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              Choisir un fichier CSV
            </button>
            {fileName && <div className="text-xs mt-2">Choisir un fichier <b>{fileName}</b></div>}
          </div>
          {importReady && (
            <div className="mb-4 bg-gray-50 p-2 rounded border text-xs max-h-72 overflow-auto">
              <table className="min-w-full text-xs border">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">Référence</th>
                    <th className="border px-2 py-1">Voyageur</th>
                    <th className="border px-2 py-1">Date début</th>
                    <th className="border px-2 py-1">Date fin</th>
                    <th className="border px-2 py-1">Montant</th>
                    <th className="border px-2 py-1">Action</th>
                    <th className="border px-2 py-1">Différences</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, idx) => (
                    <tr key={idx} className={
                      row.action === "ajout" ? "bg-green-50" :
                      row.action === "modifié" ? "bg-orange-50" :
                      row.action === "inchangé" ? "bg-gray-100" : ""
                    }>
                      <td className="border px-2 py-1">{row.reservation_ref}</td>
                      <td className="border px-2 py-1">{row["Nom du voyageur"]}</td>
                      <td className="border px-2 py-1">{row["Date de début"] || row.start_date}</td>
                      <td className="border px-2 py-1">{row["Date de fin"] || row.end_date}</td>
                      <td className="border px-2 py-1">{row["Revenus"] ?? row["Revenu"] ?? row["Montant"] ?? row["Total"] ?? row["Prix"] ?? ""}</td>
                      <td className="border px-2 py-1 font-bold">
                        {row.action === "ajout" && <span className="text-green-700">Ajout</span>}
                        {row.action === "modifié" && <span className="text-orange-700">Modifié</span>}
                        {row.action === "inchangé" && <span className="text-gray-600">Inchangé</span>}
                      </td>
                      <td className="border px-2 py-1">
                        {row.diff && (
                          <ul className="list-disc ml-2">
                            {Object.entries(row.diff).map(([field, values]: any) => (
                              <li key={field}>
                                <span className="font-semibold">{field}:</span> CSV: <span className="text-orange-700">{values.csv?.toString()}</span> / Existant: <span className="text-blue-700">{values.existant?.toString()}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-xs text-gray-500 mt-2">Aperçu des modifications : <span className="text-green-700">Ajout</span>, <span className="text-orange-700">Modifié</span>, <span className="text-gray-600">Inchangé</span>. <br/>Seuls les ajouts et modifications seront importés.</div>
            </div>
          )}
        </div>
        <div className="flex gap-2 justify-end p-4 border-t bg-white rounded-b-lg">
          <div
            className="px-4 py-2 rounded cursor-pointer hover:bg-gray-100 border border-gray-200 text-gray-700"
            onClick={onClose}
            tabIndex={0}
            role="button"
          >
            Annuler
          </div>
          <div
            className={`px-4 py-2 rounded cursor-pointer text-white ${importReady ? 'bg-black hover:bg-gray-800' : 'bg-gray-400 cursor-not-allowed'}`}
            onClick={importReady ? handleImport : undefined}
            tabIndex={0}
            role="button"
            aria-disabled={!importReady}
          >
            Valider l'import
          </div>
        </div>
      </div>
    </div>
  );
}
