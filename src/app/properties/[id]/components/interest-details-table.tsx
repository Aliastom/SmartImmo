import React from 'react';
import DataTable, { ExpanderComponentProps } from 'react-data-table-component';

interface LoanInterestDetail {
  loanId: string;
  loanName: string;
  loanType: string;
  interest: number;
  amount: number;
}

interface YearlyInterestRow {
  year: number;
  totalInterest: number;
  details: LoanInterestDetail[];
}

interface InterestDetailsTableProps {
  data: YearlyInterestRow[];
}

const ExpandedComponent: React.FC<ExpanderComponentProps<YearlyInterestRow>> = ({ data }) => (
  <div style={{ padding: '16px 32px' }}>
    <table className="min-w-full text-sm border border-gray-200">
      <thead>
        <tr className="bg-gray-50">
          <th className="px-3 py-2 text-left">Nom du prêt</th>
          <th className="px-3 py-2 text-left">Type</th>
          <th className="px-3 py-2 text-right">Montant emprunté</th>
          <th className="px-3 py-2 text-right">Intérêts sur l'année</th>
        </tr>
      </thead>
      <tbody>
        {data.details.map((detail) => (
          <tr key={detail.loanId}>
            <td className="px-3 py-1">{detail.loanName}</td>
            <td className="px-3 py-1">{detail.loanType}</td>
            <td className="px-3 py-1 text-right">{detail.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>
            <td className="px-3 py-1 text-right">{detail.interest.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const InterestDetailsTable: React.FC<InterestDetailsTableProps> = ({ data }) => {
  const columns = [
    {
      name: 'Année',
      selector: (row: YearlyInterestRow) => row.year,
      sortable: true,
      width: '100px',
    },
    {
      name: 'Intérêts totaux',
      selector: (row: YearlyInterestRow) => row.totalInterest,
      format: (row: YearlyInterestRow) => row.totalInterest.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }),
    },
  ];

  return (
    <DataTable
      title="Détail des intérêts par année et par prêt"
      columns={columns}
      data={data}
      expandableRows
      expandableRowsComponent={ExpandedComponent}
      highlightOnHover
      striped
      dense
      defaultSortFieldId={1}
      pagination
      noHeader
      customStyles={{
        rows: { style: { minHeight: '48px' } },
        headCells: { style: { fontWeight: 600, fontSize: '1rem' } },
      }}
    />
  );
};
