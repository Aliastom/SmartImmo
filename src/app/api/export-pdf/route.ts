import { NextRequest, NextResponse } from 'next/server';
import type { TaxSimulationInput, TaxCalculationResult } from '@/types/tax-simulation';

export async function POST(request: NextRequest) {
  try {
    const { inputData, results }: { inputData: TaxSimulationInput; results: TaxCalculationResult } = await request.json();

    // Créer un contenu HTML pour le PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Dossier Fiscal - Simulation Impôt</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { background: linear-gradient(135deg, #1e40af, #1d4ed8); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
            .section h3 { color: #1e40af; margin-top: 0; }
            .row { display: flex; justify-content: space-between; margin: 8px 0; }
            .total { font-weight: bold; color: #059669; }
            .subtitle { font-size: 14px; color: #666; margin-bottom: 10px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .highlight { background: #f0f9ff; padding: 10px; border-radius: 6px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SIMULATION IMPÔT FR</h1>
            <p>Dossier Fiscal Complet - ${new Date().toLocaleDateString('fr-FR')}</p>
          </div>

          <div class="grid">
            <div class="section">
              <h3>💼 Données Salariales</h3>
              <div class="row">
                <span>Salaire brut annuel:</span>
                <span>${inputData.salaire_brut_annuel.toLocaleString('fr-FR')} €</span>
              </div>
              <div class="row">
                <span>Parts de quotient familial:</span>
                <span>${inputData.parts_quotient_familial}</span>
              </div>
              <div class="row">
                <span>Situation familiale:</span>
                <span>${inputData.situation_familiale === 'celibataire' ? 'Célibataire' : 'Couple'}</span>
              </div>
              ${inputData.versement_PER_deductible ? `
                <div class="row">
                  <span>Versement PER déductible:</span>
                  <span>${inputData.versement_PER_deductible.toLocaleString('fr-FR')} €</span>
                </div>
              ` : ''}
            </div>

            <div class="section">
              <h3>🏠 Données Immobilières</h3>
              <div class="row">
                <span>Loyers perçus:</span>
                <span>${(inputData.loyers_percus_total || 0).toLocaleString('fr-FR')} €</span>
              </div>
              <div class="row">
                <span>Charges foncières:</span>
                <span>${(inputData.charges_foncieres_total || 0).toLocaleString('fr-FR')} €</span>
              </div>
              ${inputData.travaux_deja_effectues ? `
                <div class="row">
                  <span>Travaux déductibles:</span>
                  <span>${inputData.travaux_deja_effectues.toLocaleString('fr-FR')} €</span>
                </div>
              ` : ''}
              <div class="row">
                <span>Régime foncier:</span>
                <span>${inputData.regime_foncier === 'reel' ? 'Réel' : 'Micro-foncier'}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>📊 Résultats de la Simulation</h3>
            <div class="grid">
              <div>
                <h4>Revenus imposables</h4>
                <div class="row">
                  <span>Salaire imposable:</span>
                  <span>${results.salaire_imposable.toLocaleString('fr-FR')} €</span>
                </div>
                <div class="row">
                  <span>Revenus fonciers nets:</span>
                  <span>${results.revenu_foncier_net.toLocaleString('fr-FR')} €</span>
                </div>
                <div class="row total">
                  <span>Total assiette imposable:</span>
                  <span>${(results.salaire_imposable + Math.max(results.revenu_foncier_net, 0)).toLocaleString('fr-FR')} €</span>
                </div>
              </div>

              <div>
                <h4>Calcul de l&apos;impôt</h4>
                <div class="row">
                  <span>Impôt sur le revenu:</span>
                  <span>${results.IR_avec_foncier.toLocaleString('fr-FR')} €</span>
                </div>
                <div class="row">
                  <span>Prélèvements sociaux:</span>
                  <span>${results.PS_foncier.toLocaleString('fr-FR')} €</span>
                </div>
                <div class="row total">
                  <span>Total dû:</span>
                  <span>${results.total_avec_foncier.toLocaleString('fr-FR')} €</span>
                </div>
                <div class="row">
                  <span>Taux effectif:</span>
                  <span>${((results.total_avec_foncier / (results.salaire_imposable + Math.max(results.revenu_foncier_net, 0))) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>💰 Bénéfice Immobilier</h3>
            <div class="highlight">
              <div class="row">
                <span>Bénéfice net immobilier:</span>
                <span class="total">${results.benefice_net.toLocaleString('fr-FR')} €</span>
              </div>
              <div class="row">
                <span>Cash-flow brut:</span>
                <span>${results.benefice_brut.toLocaleString('fr-FR')} €</span>
              </div>
              <div class="row">
                <span>Cash-flow net:</span>
                <span>${results.benefice_net.toLocaleString('fr-FR')} €</span>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>📋 Informations fiscales</h3>
            <div class="subtitle">Paramètres utilisés pour cette simulation</div>
            <div class="row">
              <span>Année des paramètres:</span>
              <span>${inputData.annee_parametres || 2025}</span>
            </div>
            ${results.decote_avec_foncier > 0 ? `
              <div class="row">
                <span>Décote appliquée:</span>
                <span>-${results.decote_avec_foncier.toLocaleString('fr-FR')} €</span>
              </div>
            ` : ''}
          </div>

          <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
            <p>Document généré automatiquement le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
            <p>Simulation fiscale à usage informatif uniquement</p>
          </div>
        </body>
      </html>
    `;

    // Retourner le contenu HTML (pour l'instant, on retourne du texte brut)
    // Dans un vrai projet, on utiliserait une librairie comme Puppeteer ou jsPDF
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': 'attachment; filename="simulation-fiscale.html"'
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'export PDF:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
