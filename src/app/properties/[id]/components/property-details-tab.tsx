"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PropertyPhoto } from "./property-photo";

interface PropertyDetailsTabProps {
  property: any;
  propertyId: string;
}

export function PropertyDetailsTab({ property, propertyId }: PropertyDetailsTabProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Détails du bien</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500">ADRESSE</div>
            <div>{property?.address?.replace(`${property?.postal_code || ''} ${property?.city || ''}`, '').replace(`${property?.postal_code || ''}`, '').replace(`${property?.city || ''}`, '').replace(/\s*,\s*$/, '').trim() || "Non spécifiée"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">VILLE</div>
            <div>{property?.city || "Non spécifiée"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">CODE POSTAL</div>
            <div>{property?.postal_code || "Non spécifié"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">TYPE</div>
            <div>{property?.type || "Non spécifié"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">SURFACE</div>
            <div>{property?.area ? property.area + " m²" : "Non spécifiée"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">STATUT</div>
            <div>{property?.status ? <span className={`px-2 py-1 rounded text-xs ${property.status === 'vacant' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{property.status === 'vacant' ? 'Vacant' : 'Loué'}</span> : "Non spécifié"}</div>
          </div>
          {/* Lien Airbnb stylé si présent */}
          {property?.airbnb_listing_url && (
            <div className="col-span-2">
              <div className="text-xs text-gray-500">ANNONCE AIRBNB</div>
              <a
                href={property.airbnb_listing_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1 mt-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-medium transition"
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" className="inline-block">
                  <circle cx="9" cy="9" r="7" />
                  <path d="M6 12l3-6 3 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Voir l'annonce Airbnb
              </a>
            </div>
          )}
        </div>
        <div className="mt-6">
          <div className="font-semibold text-lg mb-2">Photos par pièce</div>
          {/* Chambres */}
          <div className="mb-4">
            <div className="font-semibold text-blue-600 flex items-center mb-1">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1"><rect x="2" y="6" width="14" height="10" rx="2"/><circle cx="9" cy="11" r="2"/></svg>
              Chambre
            </div>
            <PropertyPhoto propertyId={propertyId} propertyName="Chambre" imageUrl={property?.image_url} refreshTrigger={property?.updated_at ? new Date(property.updated_at).getTime() : undefined} />
          </div>
          {/* Salle de bain */}
          <div className="mb-4">
            <div className="font-semibold text-blue-400 flex items-center mb-1">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1"><rect x="2" y="8" width="14" height="6" rx="2"/><circle cx="6" cy="11" r="1"/></svg>
              Salle de bain
            </div>
            <PropertyPhoto propertyId={propertyId} propertyName="Salle de bain" />
          </div>
          {/* Cuisine */}
          <div className="mb-4">
            <div className="font-semibold text-yellow-500 flex items-center mb-1">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1"><rect x="2" y="7" width="14" height="8" rx="2"/><circle cx="13" cy="11" r="1"/></svg>
              Cuisine
            </div>
            <PropertyPhoto propertyId={propertyId} propertyName="Cuisine" />
          </div>
          {/* Salon */}
          <div className="mb-4">
            <div className="font-semibold text-green-600 flex items-center mb-1">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1"><rect x="2" y="6" width="14" height="10" rx="2"/><circle cx="5" cy="11" r="1"/></svg>
              Salon
            </div>
            <PropertyPhoto propertyId={propertyId} propertyName="Salon" />
          </div>
          {/* Autre */}
          <div className="mb-4">
            <div className="font-semibold text-gray-600 flex items-center mb-1">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1"><circle cx="9" cy="9" r="7"/></svg>
              Autre
            </div>
            <PropertyPhoto propertyId={propertyId} propertyName="Autre" />
          </div>
        </div>
        {/* ENCAR FINANCES */}
        <div className="mt-6">
          <div className="font-semibold text-lg mb-2">Finances</div>
          {/* Calculs */}
          {(() => {
            const loyerMensuel = Number(property?.rent) || 0;
            const loyerAnnuel = loyerMensuel * 12;
            const taxeF = Number(property?.property_tax) || 0;
            const taxeH = Number(property?.housing_tax) || 0;
            const assurance = Number(property?.insurance) || 0;
            const fraisGestionPct = Number(property?.management_fee_percentage) || 0;
            const interetsEmprunt = Number(property?.loan_interest) || 0;
            const fraisGestion = loyerAnnuel * (fraisGestionPct / 100);
            const chargesDeductibles = taxeF + taxeH + assurance + fraisGestion + interetsEmprunt;
            const resultatNet = loyerAnnuel - chargesDeductibles;
            return (
              <div className="bg-gray-50 rounded-lg p-4 border mb-4">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Revenu foncier brut</span>
                    <span className="font-semibold">{loyerAnnuel.toLocaleString()} € / an</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Charges annuelles déductibles</span>
                    <span className="font-semibold">{chargesDeductibles.toLocaleString()} € / an</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Résultat net avant impôt</span>
                    <span className="font-semibold">{resultatNet.toLocaleString()} € / an</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </CardContent>
    </Card>
  );
}
