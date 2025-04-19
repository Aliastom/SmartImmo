import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatCurrency } from "@/lib/utils"

interface ProjectionDetailsProps {
  projectionDetails: Array<{
    id: string
    regime: string
    revenusRestants: number
    chargesRestantes: number
    abattement: number
    netImposable: number
    detail: {
      label: string
      montant: number
    }[]
  }>
}

export function ProjectionDetails({ projectionDetails = [] }: ProjectionDetailsProps) {
  console.log("ProjectionDetails received:", projectionDetails);
  if (!Array.isArray(projectionDetails) || projectionDetails.length === 0) return (
    <Alert className="mt-4">
      <AlertDescription>
        Aucun détail de projection disponible pour vos régimes fiscaux. Vérifiez vos propriétés et transactions.
      </AlertDescription>
    </Alert>
  );

  return (
    <div className="space-y-8">
      {projectionDetails.map((reg, idx) => (
        <div key={reg.id}>
          <h3 className="font-semibold text-lg mb-2 text-indigo-700">{reg.regime} – Reste à percevoir/payer</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reg.detail.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{row.label}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.montant)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-semibold">Total revenus restants</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(reg.revenusRestants)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Total charges restantes</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(reg.chargesRestantes)}</TableCell>
              </TableRow>
              {reg.abattement > 0 && (
                <TableRow>
                  <TableCell>Abattement forfaitaire</TableCell>
                  <TableCell className="text-right">{formatCurrency(reg.abattement)}</TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell className="font-semibold">Revenu net imposable projeté</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(reg.netImposable)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ))}
      <Alert className="mt-4">
        <AlertDescription>
          Détail de ce qui reste à percevoir ou à payer d'ici la fin de l'année, par régime fiscal. Les règles d'abattement ou de déduction sont appliquées selon chaque régime.
        </AlertDescription>
      </Alert>
    </div>
  )
}
