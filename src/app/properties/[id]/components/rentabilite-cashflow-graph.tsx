import React from 'react';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Bar } from 'recharts';

interface CashflowGraphProps {
  data: Array<{
    year: number | string;
    cashflowCumule: number;
    cashflow: number;
    resultatNet: number;
    impot: number;
  }>;
}

const RentabiliteCashflowGraph: React.FC<CashflowGraphProps> = ({ data }) => {
  return (
    <div style={{ width: '100%', height: 360 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis />
          <Tooltip formatter={(value: number, name: string) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} />
          <Legend />
          <ReferenceLine y={0} stroke="#888" strokeDasharray="4 2" label={{ value: 'Seuil de rentabilité', position: 'insideTopLeft', fill: '#888' }} />
          <Bar dataKey="cashflow" fill="#4ade80" name="Cashflow annuel" barSize={24} />
          <Line type="monotone" dataKey="cashflowCumule" stroke="#8884d8" strokeWidth={2} dot={false} name="Cashflow cumulé" />
          <Line type="monotone" dataKey="resultatNet" stroke="#f59e42" strokeWidth={1} dot={false} name="Résultat net" hide />
          <Line type="monotone" dataKey="impot" stroke="#ef4444" strokeWidth={1} dot={false} name="Impôt" hide />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RentabiliteCashflowGraph;
