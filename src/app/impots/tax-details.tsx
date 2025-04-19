'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FinancialData } from "./types"
import { formatCurrency } from "@/lib/utils"

const SOCIAL_TAX_RATE = 0.172 // 17.2% de prélèvements sociaux

interface TaxDetailsProps {
  financialData: FinancialData
  currentTaxData: any
  projectedTaxData: any
  regimeDetails?: Array<{
    id: string
    regime: string
    revenus: number
    charges: number
    abattement: number
    netImposable: number
  }>
}

export function TaxDetails({ financialData, currentTaxData, projectedTaxData, regimeDetails }: TaxDetailsProps) {
  // Calcul des totaux des charges foncières
  const currentTotalCharges = 
    (financialData.currentPropertyTax || 0) +
    (financialData.currentMaintenance || 0) +
    (financialData.currentInsurance || 0) +
    (financialData.currentLoanInterest || 0) +
    (financialData.currentManagementFees || 0)

  const projectedTotalCharges = 
    (financialData.projectedPropertyTax || 0) +
    (financialData.projectedMaintenance || 0) +
    (financialData.projectedInsurance || 0) +
    (financialData.projectedLoanInterest || 0) +
    (financialData.projectedManagementFees || 0)

  // Calcul des revenus fonciers nets
  const currentRentalNet = (financialData.currentRentalIncome || 0) - currentTotalCharges
  const projectedRentalNet = (financialData.projectedRentalIncome || 0) - projectedTotalCharges

  // Calcul des prélèvements sociaux sur les revenus fonciers
  const currentSocialTax = currentRentalNet * SOCIAL_TAX_RATE
  const projectedSocialTax = projectedRentalNet * SOCIAL_TAX_RATE

  const rows = [
    {
      label: 'Revenus salariés',
      current: financialData.currentSalary || 0,
      projected: financialData.projectedSalary || 0,
      difference: (financialData.projectedSalary || 0) - (financialData.currentSalary || 0)
    },
    {
      label: 'Revenus fonciers bruts',
      current: financialData.currentRentalIncome || 0,
      projected: financialData.projectedRentalIncome || 0,
      difference: (financialData.projectedRentalIncome || 0) - (financialData.currentRentalIncome || 0),
      isSubSection: true
    },
    {
      label: 'Charges foncières déductibles',
      current: currentTotalCharges,
      projected: projectedTotalCharges,
      difference: projectedTotalCharges - currentTotalCharges,
      isSubSection: true,
      isNegative: true
    },
    {
      label: '- Taxe foncière',
      current: financialData.currentPropertyTax || 0,
      projected: financialData.projectedPropertyTax || 0,
      difference: (financialData.projectedPropertyTax || 0) - (financialData.currentPropertyTax || 0),
      isDetail: true,
      isNegative: true
    },
    {
      label: '- Travaux d&apos;entretien',
      current: financialData.currentMaintenance || 0,
      projected: financialData.projectedMaintenance || 0,
      difference: (financialData.projectedMaintenance || 0) - (financialData.currentMaintenance || 0),
      isDetail: true,
      isNegative: true
    },
    {
      label: '- Assurance',
      current: financialData.currentInsurance || 0,
      projected: financialData.projectedInsurance || 0,
      difference: (financialData.projectedInsurance || 0) - (financialData.currentInsurance || 0),
      isDetail: true,
      isNegative: true
    },
    {
      label: '- Intérêts d&apos;emprunt',
      current: financialData.currentLoanInterest || 0,
      projected: financialData.projectedLoanInterest || 0,
      difference: (financialData.projectedLoanInterest || 0) - (financialData.currentLoanInterest || 0),
      isDetail: true,
      isNegative: true
    },
    {
      label: '- Frais de gestion',
      current: financialData.currentManagementFees || 0,
      projected: financialData.projectedManagementFees || 0,
      difference: (financialData.projectedManagementFees || 0) - (financialData.currentManagementFees || 0),
      isDetail: true,
      isNegative: true
    },
    {
      label: 'Revenus fonciers nets',
      current: currentRentalNet,
      projected: projectedRentalNet,
      difference: projectedRentalNet - currentRentalNet,
      isSubSection: true,
      isBold: true
    },
    {
      label: 'Prélèvements sociaux (17.2%)',
      current: currentSocialTax,
      projected: projectedSocialTax,
      difference: projectedSocialTax - currentSocialTax,
      isSubSection: true,
      isNegative: true
    },
    {
      label: 'Revenus fonciers nets imposables',
      current: currentRentalNet - currentSocialTax,
      projected: projectedRentalNet - projectedSocialTax,
      difference: (projectedRentalNet - projectedSocialTax) - (currentRentalNet - currentSocialTax),
      isSubSection: true,
      isBold: true
    },
    {
      label: 'Épargne PER',
      current: financialData.currentPer || 0,
      projected: financialData.projectedPer || 0,
      difference: (financialData.projectedPer || 0) - (financialData.currentPer || 0),
      isNegative: true
    }
  ]

  // Affichage détail par régime fiscal (si fourni)
  if (regimeDetails && regimeDetails.length > 0) {
    return (
      <div className="space-y-8">
        {regimeDetails.map((reg, idx) => (
          <div key={reg.id}>
            <h3 className="font-semibold text-lg mb-2 text-indigo-700">{reg.regime}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Revenus locatifs bruts</TableCell>
                  <TableCell className="text-right">{formatCurrency(reg.revenus)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Charges déductibles</TableCell>
                  <TableCell className="text-right">{formatCurrency(reg.charges)}</TableCell>
                </TableRow>
                {reg.abattement > 0 && (
                  <TableRow>
                    <TableCell>Abattement forfaitaire</TableCell>
                    <TableCell className="text-right">{formatCurrency(reg.abattement)}</TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell className="font-semibold">Revenu net imposable</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(reg.netImposable)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ))}
        <Alert className="mt-4">
          <AlertDescription>
            Détail par régime fiscal. Les règles d'abattement ou de déduction sont appliquées selon chaque régime.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>
          Les montants affichés sont des estimations basées sur vos revenus et charges déclarés.
          Le calcul prend en compte les prélèvements sociaux de 17.2% sur les revenus fonciers.
        </AlertDescription>
      </Alert>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Description</TableHead>
            <TableHead className="text-right">Montant actuel</TableHead>
            <TableHead className="text-right">Projection</TableHead>
            <TableHead className="text-right">Différence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={index} className={row.isDetail ? 'text-sm text-gray-600' : ''}>
              <TableCell className={`
                ${row.isSubSection ? 'pl-6' : ''} 
                ${row.isDetail ? 'pl-10' : ''} 
                ${row.isBold ? 'font-semibold' : ''}
              `}>
                {row.label}
              </TableCell>
              <TableCell className={`text-right ${row.isBold ? 'font-semibold' : ''}`}>
                {formatCurrency(row.isNegative ? -row.current : row.current)}
              </TableCell>
              <TableCell className={`text-right ${row.isBold ? 'font-semibold' : ''}`}>
                {formatCurrency(row.isNegative ? -row.projected : row.projected)}
              </TableCell>
              <TableCell className={`text-right ${row.isBold ? 'font-semibold' : ''}`}>
                <span className={row.difference > 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatCurrency(row.isNegative ? -row.difference : row.difference)}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
