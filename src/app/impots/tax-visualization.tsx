'use client'

import { useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { FinancialData, TaxData } from './types'
import { formatCurrency } from '@/lib/utils'
import { Chart, ChartConfiguration, ChartData } from 'chart.js/auto'

interface TaxVisualizationProps {
  currentData: TaxData
  projectedData: TaxData
  financialData: FinancialData
}

type ChartInstance = Chart<'bar' | 'doughnut', number[], string>
type ChartConfig = ChartConfiguration<'bar' | 'doughnut', number[], string>

export function TaxVisualization({ currentData, projectedData, financialData }: TaxVisualizationProps) {
  const chartsInstanceRef = useRef<ChartInstance[]>([])
  const chartsContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Nettoyage des graphiques existants
    chartsInstanceRef.current.forEach(chart => chart.destroy())
    chartsInstanceRef.current = []

    if (!chartsContainerRef.current) return

    // Données pour le graphique de répartition des revenus
    const incomeData: ChartData<'doughnut', number[], string> = {
      labels: ['Salaire net', 'Revenus fonciers nets', 'Versements PER'],
      datasets: [{
        data: [
          financialData.projectedSalary,
          financialData.projectedRentalIncome - financialData.projectedCharges,
          -financialData.projectedPer
        ],
        backgroundColor: [
          'rgba(99, 102, 241, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ]
      }]
    }

    // Configuration du graphique de répartition des revenus
    const incomeConfig: ChartConfig = {
      type: 'doughnut',
      data: incomeData,
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: 'Répartition des revenus'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number
                return `${context.label}: ${formatCurrency(value)}`
              }
            }
          }
        }
      }
    }

    // Données pour le graphique d'évolution de l'impôt
    const taxData: ChartData<'bar', number[], string> = {
      labels: ['Actuel', 'Projeté'],
      datasets: [{
        label: 'Impôt',
        data: [currentData.tax, projectedData.tax],
        backgroundColor: [
          'rgba(99, 102, 241, 0.8)',
          'rgba(34, 197, 94, 0.8)'
        ]
      }]
    }

    // Configuration du graphique d'évolution de l'impôt
    const taxConfig: ChartConfig = {
      type: 'bar',
      data: taxData,
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Évolution de l\'impôt'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number
                return `Impôt: ${formatCurrency(value)}`
              }
            }
          }
        }
      }
    }

    // Création des graphiques
    const incomeChart = new Chart(
      document.createElement('canvas'),
      incomeConfig
    )

    const taxChart = new Chart(
      document.createElement('canvas'),
      taxConfig
    )

    // Ajout des graphiques au DOM
    const incomeContainer = document.createElement('div')
    incomeContainer.className = 'w-full md:w-1/2 flex justify-center items-center max-w-[400px]'
    incomeChart.canvas.style.maxWidth = '350px'
    incomeChart.canvas.style.maxHeight = '350px'
    incomeContainer.appendChild(incomeChart.canvas)

    const taxContainer = document.createElement('div')
    taxContainer.className = 'w-full md:w-1/2 flex justify-center items-center max-w-[400px]'
    taxChart.canvas.style.maxWidth = '350px'
    taxChart.canvas.style.maxHeight = '350px'
    taxContainer.appendChild(taxChart.canvas)

    chartsContainerRef.current.innerHTML = ''
    chartsContainerRef.current.appendChild(incomeContainer)
    chartsContainerRef.current.appendChild(taxContainer)

    // Sauvegarde des instances pour le nettoyage
    chartsInstanceRef.current = [incomeChart, taxChart]

    return () => {
      const charts = [...chartsInstanceRef.current]
      charts.forEach(chart => chart.destroy())
    }
  }, [currentData, projectedData, financialData])

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Visualisation</h3>
      <div ref={chartsContainerRef} className="flex flex-col md:flex-row flex-wrap gap-4 w-full justify-center items-start" />
    </Card>
  )
}
