import { NextResponse } from 'next/server';
import type { TaxConfig } from '@/types/tax-simulation';

// Barème fiscal français 2024 (tranches et taux)
const TAX_BRACKETS_2024 = [
  { min: 0, max: 11294, rate: 0 },
  { min: 11295, max: 28797, rate: 0.11 },
  { min: 28798, max: 82341, rate: 0.30 },
  { min: 82342, max: 177106, rate: 0.41 },
  { min: 177107, max: null, rate: 0.45 }
];

const SOCIAL_SECURITY_RATE = 0.172; // 17,2%
const ABATTEMENT_RATE = 0.10; // 10%

export async function GET() {
  const config: TaxConfig = {
    tax_brackets: TAX_BRACKETS_2024,
    social_security_rate: SOCIAL_SECURITY_RATE,
    abattement_rate: ABATTEMENT_RATE
  };

  return NextResponse.json(config);
}
