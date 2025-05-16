'use client'

import { PropertyRegime, propertyRegimeLabels } from "@/types/property-regimes"
import { Card, CardContent } from "@/components/ui/card"
import { AnimatedCard } from "@/components/ui/animated"
import { Badge } from "@/components/ui/badge"

interface PropertyRegimeDetailsProps {
  regime: PropertyRegime
}

export function PropertyRegimeDetails({ regime }: PropertyRegimeDetailsProps) {
  return (
    <AnimatedCard className="overflow-hidden mb-6">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <tbody>
              <tr>
                <td className="bg-gray-100 text-gray-600 uppercase text-xs font-medium p-3 w-1/3">
                  {propertyRegimeLabels.name}
                </td>
                <td className="p-3">
                  <span className="font-semibold">{regime.name}</span>
                </td>
              </tr>
              <tr>
                <td className="bg-gray-100 text-gray-600 uppercase text-xs font-medium p-3">
                  {propertyRegimeLabels.location_type}
                </td>
                <td className="p-3">{regime.location_type || '-'}</td>
              </tr>
              <tr>
                <td className="bg-gray-100 text-gray-600 uppercase text-xs font-medium p-3">
                  {propertyRegimeLabels.rental_type}
                </td>
                <td className="p-3">{regime.rental_type || '-'}</td>
              </tr>
              <tr>
                <td className="bg-gray-100 text-gray-600 uppercase text-xs font-medium p-3">
                  {propertyRegimeLabels.revenue_threshold}
                </td>
                <td className="p-3">{regime.revenue_threshold || '-'}</td>
              </tr>
              <tr>
                <td className="bg-gray-100 text-gray-600 uppercase text-xs font-medium p-3">
                  {propertyRegimeLabels.flat_deduction}
                </td>
                <td className="p-3">{regime.flat_deduction || 'Non'}</td>
              </tr>
              <tr>
                <td className="bg-gray-100 text-gray-600 uppercase text-xs font-medium p-3">
                  {propertyRegimeLabels.real_expenses_deduction}
                </td>
                <td className="p-3">
                  {regime.real_expenses_deduction ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Oui
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      Non
                    </Badge>
                  )}
                </td>
              </tr>
              <tr>
                <td className="bg-gray-100 text-gray-600 uppercase text-xs font-medium p-3">
                  {propertyRegimeLabels.property_amortization}
                </td>
                <td className="p-3">
                  {regime.property_amortization ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Oui
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      Non
                    </Badge>
                  )}
                </td>
              </tr>
              <tr>
                <td className="bg-gray-100 text-gray-600 uppercase text-xs font-medium p-3">
                  {propertyRegimeLabels.capital_gain_duration}
                </td>
                <td className="p-3">{regime.capital_gain_duration || '-'}</td>
              </tr>
              <tr>
                <td className="bg-gray-100 text-gray-600 uppercase text-xs font-medium p-3">
                  {propertyRegimeLabels.accounting_type}
                </td>
                <td className="p-3">{regime.accounting_type || '-'}</td>
              </tr>
              <tr>
                <td className="bg-gray-100 text-gray-600 uppercase text-xs font-medium p-3">
                  {propertyRegimeLabels.advantages}
                </td>
                <td className="p-3 whitespace-pre-line">{regime.advantages || '-'}</td>
              </tr>
              <tr>
                <td className="bg-gray-100 text-gray-600 uppercase text-xs font-medium p-3">
                  {propertyRegimeLabels.disadvantages}
                </td>
                <td className="p-3 whitespace-pre-line">{regime.disadvantages || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </AnimatedCard>
  )
}
