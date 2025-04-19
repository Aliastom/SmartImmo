import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const citycode = searchParams.get('citycode');
  if (!citycode) {
    return NextResponse.json({ error: 'citycode is required' }, { status: 400 });
  }
  const url = `https://api.data.gouv.fr/api/1/datasets/demandes-de-valeurs-foncieres-dvf/lines/?q=code_commune:${citycode}&sort=-date_mutation&size=10`;
  try {
    const dvfRes = await fetch(url);
    if (!dvfRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch DVF', status: dvfRes.status }, { status: dvfRes.status });
    }
    const data = await dvfRes.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: 'DVF fetch failed', details: e?.message || e }, { status: 500 });
  }
}
