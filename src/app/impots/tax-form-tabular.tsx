import React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface TaxFormTabularProps {
  data: any
  onChange: (field: string, value: number | string) => void
  mode: "actuel" | "projection"
  autoValues?: { [key: string]: number }
  details?: { [key: string]: string }
  onResetField?: (field: string) => void
}

export function TaxFormTabular({ data, onChange, mode, autoValues = {}, details = {}, onResetField }: TaxFormTabularProps) {
  // Helper pour afficher la valeur auto-calculée si elle existe
  const getAutoValue = (field: string) => {
    if (autoValues[field] !== undefined) {
      return (
        <div className="flex items-center mt-1">
          <span className="text-xs text-gray-400">
            (Pré-rempli: {autoValues[field]} €
            {details[field] ? ` — ${details[field]}` : ''})
          </span>
          {onResetField && (
            <button
              type="button"
              className="ml-2 text-xs text-blue-500 hover:underline"
              onClick={() => onResetField(field)}
            >
              Réinitialiser
            </button>
          )}
        </div>
      )
    }
    return null
  }

  const fields = [
    {
      label: "Salaire net imposable",
      current: "currentSalary",
      projected: "projectedSalary"
    },
    {
      label: "Revenus fonciers bruts",
      current: "currentRentalIncome",
      projected: "projectedRentalIncome"
    },
    {
      label: "Taxe foncière",
      current: "currentPropertyTax",
      projected: "projectedPropertyTax"
    },
    {
      label: "Frais d'entretien",
      current: "currentMaintenance",
      projected: "projectedMaintenance"
    },
    {
      label: "Assurance habitation",
      current: "currentInsurance",
      projected: "projectedInsurance"
    },
    {
      label: "Intérêts d'emprunt",
      current: "currentLoanInterest",
      projected: "projectedLoanInterest"
    },
    {
      label: "Frais de gestion",
      current: "currentManagementFees",
      projected: "projectedManagementFees"
    },
    {
      label: "Versements PER",
      current: "currentPer",
      projected: "projectedPer"
    }
  ]

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-y-2">
        <thead>
          <tr>
            <th className="bg-gray-100 text-xs uppercase text-left px-4 py-2 rounded-l-lg">Catégorie</th>
            {mode === "actuel" && (
              <th className="bg-gray-100 text-xs uppercase text-left px-4 py-2">Déjà perçu/payé</th>
            )}
            {mode === "projection" && (
              <th className="bg-gray-100 text-xs uppercase text-left px-4 py-2">Total estimé à fin d'année</th>
            )}
          </tr>
        </thead>
        <tbody>
          {fields.map((f) => (
            <tr key={f.label}>
              <td className="bg-gray-50 text-xs text-gray-500 px-4 py-2 whitespace-nowrap font-semibold">{f.label}</td>
              {mode === "actuel" && (
                <td className="px-4 py-2">
                  <Input
                    type="number"
                    value={data[f.current] ?? ""}
                    onChange={e => onChange(f.current, e.target.valueAsNumber || 0)}
                    className="border-none bg-transparent p-0 focus:ring-0 focus:outline-none text-sm"
                  />
                </td>
              )}
              {mode === "projection" && (
                <td className="px-4 py-2">
                  <Input
                    type="number"
                    value={data[f.projected] ?? ""}
                    onChange={e => onChange(f.projected, e.target.valueAsNumber || 0)}
                    className="border-none bg-transparent p-0 focus:ring-0 focus:outline-none text-sm"
                  />
                  {getAutoValue(f.projected)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
