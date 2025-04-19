import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { motion } from 'framer-motion'

interface TaxFormData {
  currentSalary: number
  projectedSalary: number
  currentRentalIncome: number
  projectedRentalIncome: number
  currentPropertyTax: number
  projectedPropertyTax: number
  currentMaintenance: number
  projectedMaintenance: number
  currentInsurance: number
  projectedInsurance: number
  currentLoanInterest: number
  projectedLoanInterest: number
  currentManagementFees: number
  projectedManagementFees: number
  currentPer: number
  projectedPer: number
  children: number
  situation: 'single' | 'couple' | 'family'
}

interface TaxFormProps {
  data: TaxFormData
  onChange: (field: string, value: number | string) => void
  mode?: 'actuel' | 'projection'
}

export function TaxForm({ data, onChange, mode = 'actuel' }: TaxFormProps) {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  // SVG Icons
  const moneyIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
    </svg>
  );

  const homeIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
    </svg>
  );

  const chargesIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm4.707 3.707a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L8.414 9H10a3 3 0 013 3v1a1 1 0 102 0v-1a5 5 0 00-5-5H8.414l1.293-1.293z" clipRule="evenodd" />
    </svg>
  );

  const savingsIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
      <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
    </svg>
  );

  const infoIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
    </svg>
  );

  const showCurrent = mode === 'actuel';
  const showProjected = mode === 'projection';

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="p-6 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
        <motion.h3 
          className="text-lg font-medium text-gray-900 mb-8"
          variants={itemVariants}
        >
          Saisie des données financières
        </motion.h3>

        <div className="space-y-8">
          {/* Revenus salariés */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center mb-4">
              <div className="mr-3">{moneyIcon}</div>
              <h4 className="text-sm font-medium text-gray-900">Revenus salariés</h4>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {showCurrent && (
                <div>
                  <Label htmlFor="currentSalary" className="text-sm text-gray-500 mb-1 block">
                    Salaire net imposable déjà perçu en 2025 (€)
                  </Label>
                  <Input
                    id="currentSalary"
                    type="number"
                    value={data.currentSalary}
                    onChange={(e) => onChange('currentSalary', e.target.valueAsNumber || 0)}
                    className="h-10"
                  />
                </div>
              )}
              {showProjected && (
                <div>
                  <Label htmlFor="projectedSalary" className="text-sm text-gray-500 mb-1 block">
                    Total du salaire net imposable à percevoir (€)
                  </Label>
                  <Input
                    id="projectedSalary"
                    type="number"
                    value={data.projectedSalary}
                    onChange={(e) => onChange('projectedSalary', e.target.valueAsNumber || 0)}
                    className="h-10"
                  />
                </div>
              )}
            </div>
          </motion.div>

          {/* Revenus fonciers */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center mb-4">
              <div className="mr-3">{homeIcon}</div>
              <h4 className="text-sm font-medium text-gray-900">Revenus fonciers</h4>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {showCurrent && (
                <div>
                  <Label htmlFor="currentRentalIncome" className="text-sm text-gray-500 mb-1 block">
                    Revenus fonciers bruts déjà perçus en 2025 (€)
                  </Label>
                  <Input
                    id="currentRentalIncome"
                    type="number"
                    value={data.currentRentalIncome}
                    onChange={(e) => onChange('currentRentalIncome', e.target.valueAsNumber || 0)}
                    className="h-10"
                  />
                </div>
              )}
              {showProjected && (
                <div>
                  <Label htmlFor="projectedRentalIncome" className="text-sm text-gray-500 mb-1 block">
                    Total des revenus fonciers bruts à percevoir (€)
                  </Label>
                  <Input
                    id="projectedRentalIncome"
                    type="number"
                    value={data.projectedRentalIncome}
                    onChange={(e) => onChange('projectedRentalIncome', e.target.valueAsNumber || 0)}
                    className="h-10"
                  />
                </div>
              )}
            </div>
          </motion.div>

          {/* Charges foncières */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center mb-4">
              <div className="mr-3">{chargesIcon}</div>
              <h4 className="text-sm font-medium text-gray-900">Charges foncières</h4>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {showCurrent && (
                <div>
                  <Label htmlFor="currentPropertyTax" className="text-sm text-gray-500 mb-1 block">
                    Taxe foncière déjà payée (€)
                  </Label>
                  <Input
                    id="currentPropertyTax"
                    type="number"
                    value={data.currentPropertyTax}
                    onChange={(e) => onChange('currentPropertyTax', e.target.valueAsNumber || 0)}
                    className="h-10"
                  />
                </div>
              )}
              {showProjected && (
                <div>
                  <Label htmlFor="projectedPropertyTax" className="text-sm text-gray-500 mb-1 block">
                    Total taxe foncière à payer (€)
                  </Label>
                  <Input
                    id="projectedPropertyTax"
                    type="number"
                    value={data.projectedPropertyTax}
                    onChange={(e) => onChange('projectedPropertyTax', e.target.valueAsNumber || 0)}
                    className="h-10"
                  />
                </div>
              )}
              {showCurrent && (
                <div>
                  <Label htmlFor="currentMaintenance" className="text-sm text-gray-500 mb-1 block">
                    Frais d'entretien déjà payés (€)
                  </Label>
                  <Input
                    id="currentMaintenance"
                    type="number"
                    value={data.currentMaintenance}
                    onChange={(e) => onChange('currentMaintenance', e.target.valueAsNumber || 0)}
                    className="h-10"
                  />
                </div>
              )}
              {showProjected && (
                <div>
                  <Label htmlFor="projectedMaintenance" className="text-sm text-gray-500 mb-1 block">
                    Total frais d'entretien à payer (€)
                  </Label>
                  <Input
                    id="projectedMaintenance"
                    type="number"
                    value={data.projectedMaintenance}
                    onChange={(e) => onChange('projectedMaintenance', e.target.valueAsNumber || 0)}
                    className="h-10"
                  />
                </div>
              )}
              {showCurrent && (
                <div>
                  <Label htmlFor="currentInsurance" className="text-sm text-gray-500 mb-1 block">
                    Assurance habitation déjà payée (€)
                  </Label>
                  <Input
                    id="currentInsurance"
                    type="number"
                    value={data.currentInsurance}
                    onChange={(e) => onChange('currentInsurance', e.target.valueAsNumber || 0)}
                    className="h-10"
                  />
                </div>
              )}
              {showProjected && (
                <div>
                  <Label htmlFor="projectedInsurance" className="text-sm text-gray-500 mb-1 block">
                    Total assurance habitation à payer (€)
                  </Label>
                  <Input
                    id="projectedInsurance"
                    type="number"
                    value={data.projectedInsurance}
                    onChange={(e) => onChange('projectedInsurance', e.target.valueAsNumber || 0)}
                    className="h-10"
                  />
                </div>
              )}
              {showCurrent && (
                <div>
                  <Label htmlFor="currentLoanInterest" className="text-sm text-gray-500 mb-1 block">
                    Intérêts d'emprunt déjà payés (€)
                  </Label>
                  <Input
                    id="currentLoanInterest"
                    type="number"
                    value={data.currentLoanInterest}
                    onChange={(e) => onChange('currentLoanInterest', e.target.valueAsNumber || 0)}
                    className="h-10"
                  />
                </div>
              )}
              {showProjected && (
                <div>
                  <Label htmlFor="projectedLoanInterest" className="text-sm text-gray-500 mb-1 block">
                    Total intérêts d'emprunt à payer (€)
                  </Label>
                  <Input
                    id="projectedLoanInterest"
                    type="number"
                    value={data.projectedLoanInterest}
                    onChange={(e) => onChange('projectedLoanInterest', e.target.valueAsNumber || 0)}
                    className="h-10"
                  />
                </div>
              )}
              {showCurrent && (
                <div>
                  <Label htmlFor="currentManagementFees" className="text-sm text-gray-500 mb-1 block">
                    Frais de gestion déjà payés (€)
                  </Label>
                  <Input
                    id="currentManagementFees"
                    type="number"
                    value={data.currentManagementFees}
                    onChange={(e) => onChange('currentManagementFees', e.target.valueAsNumber || 0)}
                    className="h-10"
                  />
                </div>
              )}
              {showProjected && (
                <div>
                  <Label htmlFor="projectedManagementFees" className="text-sm text-gray-500 mb-1 block">
                    Total frais de gestion à payer (€)
                  </Label>
                  <Input
                    id="projectedManagementFees"
                    type="number"
                    value={data.projectedManagementFees}
                    onChange={(e) => onChange('projectedManagementFees', e.target.valueAsNumber || 0)}
                    className="h-10"
                  />
                </div>
              )}
            </div>
          </motion.div>

          {/* Plan Épargne Retraite */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center mb-4">
              <div className="mr-3">{savingsIcon}</div>
              <h4 className="text-sm font-medium text-gray-900">Plan Épargne Retraite (PER)</h4>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="currentPer" className="text-sm text-gray-500 mb-1 block">
                  Versements PER déjà effectués (€)
                </Label>
                <Input
                  id="currentPer"
                  type="number"
                  value={data.currentPer}
                  onChange={(e) => onChange('currentPer', e.target.valueAsNumber || 0)}
                  className="h-10"
                />
              </div>
              <div>
                <Label htmlFor="projectedPer" className="text-sm text-gray-500 mb-1 block">
                  Total des versements PER prévus (€)
                </Label>
                <Input
                  id="projectedPer"
                  type="number"
                  value={data.projectedPer}
                  onChange={(e) => onChange('projectedPer', e.target.valueAsNumber || 0)}
                  className="h-10"
                />
              </div>
            </div>
          </motion.div>

          {/* Situation fiscale */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center mb-4">
              <div className="mr-3">{infoIcon}</div>
              <h4 className="text-sm font-medium text-gray-900">Situation fiscale</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="situation" className="text-sm text-gray-500 mb-1 block">
                  Situation familiale
                </Label>
                <Select
                  value={data.situation}
                  onValueChange={(value) => onChange('situation', value)}
                >
                  <SelectTrigger id="situation" className="h-10">
                    <SelectValue placeholder="Sélectionnez..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Célibataire</SelectItem>
                    <SelectItem value="couple">En couple</SelectItem>
                    <SelectItem value="family">Famille</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="children" className="text-sm text-gray-500 mb-1 block">
                  Nombre d'enfants à charge
                </Label>
                <Input
                  id="children"
                  type="number"
                  min="0"
                  value={data.children}
                  onChange={(e) => onChange('children', e.target.valueAsNumber || 0)}
                  className="h-10"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </Card>

      <motion.div variants={itemVariants}>
        <Alert className="bg-blue-50 text-blue-900 border-blue-200 p-5">
          <div className="flex items-start">
            <Info className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
            <AlertDescription>
              <p className="text-sm font-medium">
                Comment est calculé votre impôt ?
              </p>
              <ul className="text-sm mt-3 list-disc list-outside space-y-2 ml-5">
                <li>Le revenu imposable est calculé en additionnant :
                  <ul className="mt-1 ml-5 list-disc list-outside space-y-1">
                    <li>Le salaire net imposable</li>
                    <li>Les revenus fonciers imposables (revenus fonciers bruts - charges foncières)</li>
                  </ul>
                </li>
                <li>Les déductions suivantes sont appliquées :
                  <ul className="mt-1 ml-5 list-disc list-outside space-y-1">
                    <li>90% des versements PER (plafonné à 10% des revenus)</li>
                  </ul>
                </li>
                <li>Le quotient familial est appliqué selon votre situation</li>
                <li>Les tranches d'imposition 2025 sont appliquées</li>
                <li>La décote est calculée si applicable</li>
              </ul>
            </AlertDescription>
          </div>
        </Alert>
      </motion.div>
    </motion.div>
  )
}
