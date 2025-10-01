'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Calculator, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface TransactionWithGestion {
  id: string;
  amount: number;
  description: string;
  date: string;
  type: string;
  property_name: string;
  gestion_percentage?: number;
  frais_gestion?: number;
}

interface FiscalData {
  loyersPercus: number;
  chargesDeductibles: number;
  transactions: TransactionWithGestion[];
}

interface FiscalDetailsModalProps {
  year?: number;
  trigger?: React.ReactNode;
  fiscalData?: FiscalData | null;
  isLoading?: boolean;
  error?: string | null;
}

export default function FiscalDetailsModal({ year, trigger, fiscalData: externalFiscalData, isLoading: externalIsLoading, error: externalError }: FiscalDetailsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalFiscalData, setInternalFiscalData] = useState<FiscalData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Utiliser les données externes si disponibles, sinon les données internes
  const fiscalData = externalFiscalData ?? internalFiscalData;
  const loading = externalIsLoading ?? isLoading;
  const displayError = externalError ?? error;

  const loadFiscalData = async () => {
    // Si on a déjà des données externes, on n'a pas besoin de les charger
    if (externalFiscalData) return;

    // Pour l'instant, pas de chargement dynamique
    // Les données sont passées en props depuis le composant parent
    return;
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && !fiscalData && !externalFiscalData) {
      loadFiscalData();
    }
  };

  const defaultTrigger = (
    <Button
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
      onClick={() => handleOpenChange(true)}
    >
      <Eye className="w-4 h-4" />
      Détail calculs
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent
        className="w-[95vw] h-[95vh] max-w-none sm:max-w-none max-h-none overflow-hidden flex flex-col"
        style={{
          width: '95vw',
          height: '95vh',
          maxWidth: 'none',
          maxHeight: 'none'
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Détail des calculs fiscaux {year || new Date().getFullYear()}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Chargement des données...</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {fiscalData && (
              <>
                {/* Résumé avec indicateurs visuels */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold text-green-700">Loyers perçus</h3>
                    </div>
                    <p className="text-3xl font-bold text-green-600 mb-1">
                      {formatCurrency(fiscalData.loyersPercus)}
                    </p>
                    <p className="text-sm text-green-600">
                      {fiscalData.transactions.filter(t => t.type === 'Loyer').length} loyers • {new Set(fiscalData.transactions.filter(t => t.type === 'Loyer').map(t => t.property_name)).size} propriétés
                    </p>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-blue-700">Charges déductibles</h3>
                    </div>
                    <p className="text-3xl font-bold text-blue-600 mb-1">
                      {formatCurrency(fiscalData.chargesDeductibles)}
                    </p>
                    <p className="text-sm text-blue-600">
                      {fiscalData.transactions.filter(t => t.type === 'Charge déductible').length} charges • Économie fiscale potentielle
                    </p>
                  </div>
                </div>

                {/* Tableau des transactions */}
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span>📋</span>
                    Transactions prises en compte ({fiscalData.transactions.length})
                  </h3>

                  {fiscalData.transactions.length > 0 ? (
                    <div className="border rounded-lg bg-white">
                      <div className="overflow-x-auto">
                        <Table className="min-w-[1000px]">
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead className="w-[100px] min-w-[100px]">Date</TableHead>
                              <TableHead className="w-[120px] min-w-[120px]">Type</TableHead>
                              <TableHead className="w-[200px] min-w-[200px]">Propriété</TableHead>
                              <TableHead className="w-[300px] min-w-[300px]">Description</TableHead>
                              <TableHead className="w-[120px] min-w-[120px] text-right">Montant</TableHead>
                              <TableHead className="w-[100px] min-w-[100px] text-right">% Gestion</TableHead>
                              <TableHead className="w-[120px] min-w-[120px] text-right">Frais gestion</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {fiscalData.transactions.map((transaction, index) => (
                              <TableRow key={transaction.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <TableCell className="font-medium">
                                  {new Date(transaction.date).toLocaleDateString('fr-FR')}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={transaction.type === 'Loyer' ? 'default' : 'secondary'}
                                    className={transaction.type === 'Loyer' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
                                  >
                                    {transaction.type === 'Loyer' ? '💰 Loyer' : '🔧 Charge'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-medium text-gray-700">
                                  {transaction.property_name}
                                </TableCell>
                                <TableCell className="text-gray-600">
                                  {transaction.description || 'Sans description'}
                                </TableCell>
                                <TableCell className={`text-right font-semibold ${
                                  transaction.type === 'Loyer' ? 'text-green-600' : 'text-blue-600'
                                }`}>
                                  {formatCurrency(transaction.amount)}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-purple-600">
                                  {transaction.type === 'Loyer' && transaction.gestion_percentage && transaction.gestion_percentage > 0
                                    ? `${transaction.gestion_percentage}%`
                                    : '-'
                                  }
                                </TableCell>
                                <TableCell className="text-right font-semibold text-orange-600">
                                  {transaction.type === 'Loyer' && transaction.frais_gestion && transaction.frais_gestion > 0
                                    ? formatCurrency(transaction.frais_gestion)
                                    : '-'
                                  }
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <div className="text-4xl mb-2">📊</div>
                      <p className="text-lg font-semibold mb-1">Aucune transaction trouvée</p>
                      <p className="text-sm">
                        Aucune transaction fiscale n'a été trouvée pour cette année.
                      </p>
                    </div>
                  )}
                </div>

                {/* Informations sur les frais de gestion */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-semibold text-orange-700 mb-1">📊 Frais de gestion</h4>
                      <p className="text-sm text-orange-600">
                        Pourcentage moyen pondéré calculé selon les loyers de chaque propriété.
                      </p>
                      <div className="mt-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-orange-600">Pourcentage moyen :</span>
                          <span className="font-semibold text-orange-700">
                            {(() => {
                              const loyerTransactions = fiscalData.transactions.filter(t => t.type === 'Loyer' && t.gestion_percentage);
                              if (loyerTransactions.length === 0) return '0%';

                              let totalLoyersPondere = 0;
                              let totalGestionPondere = 0;

                              // Grouper par propriété
                              const loyersParPropriete = new Map();
                              loyerTransactions.forEach(t => {
                                const current = loyersParPropriete.get(t.property_name) || 0;
                                loyersParPropriete.set(t.property_name, current + t.amount);
                              });

                              // Calculer moyenne pondérée
                              loyersParPropriete.forEach((loyerTotal, propertyName) => {
                                const propTransactions = loyerTransactions.filter(t => t.property_name === propertyName);
                                if (propTransactions.length > 0 && propTransactions[0] && propTransactions[0].gestion_percentage) {
                                  totalLoyersPondere += loyerTotal;
                                  totalGestionPondere += loyerTotal * (propTransactions[0].gestion_percentage / 100);
                                }
                              });

                              const moyenne = totalLoyersPondere > 0 ? (totalGestionPondere / totalLoyersPondere) * 100 : 0;
                              return `${moyenne.toFixed(2)}%`;
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-orange-600">Total frais de gestion :</span>
                          <span className="font-semibold text-orange-700">
                            {formatCurrency(fiscalData.transactions
                              .filter(t => t.type === 'Loyer')
                              .reduce((sum, t) => sum + (t.frais_gestion || 0), 0)
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
