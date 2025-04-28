import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import DeclarationFiscale from './DeclarationFiscale';
import EtatActuel from './EtatActuel';
import ProjectionFinAnnee from './ProjectionFinAnnee';
import Conseil from './Conseil';

export default function ImpotsTabs() {
  return (
    <Tabs defaultValue="declaration" className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="declaration">Déclaration fiscale</TabsTrigger>
        <TabsTrigger value="etat-actuel">État actuel</TabsTrigger>
        <TabsTrigger value="projection">Projection fin d'année</TabsTrigger>
        <TabsTrigger value="conseil">Conseil</TabsTrigger>
      </TabsList>
      <TabsContent value="declaration">
        <DeclarationFiscale />
      </TabsContent>
      <TabsContent value="etat-actuel">
        <EtatActuel />
      </TabsContent>
      <TabsContent value="projection">
        <ProjectionFinAnnee />
      </TabsContent>
      <TabsContent value="conseil">
        <Conseil />
      </TabsContent>
    </Tabs>
  );
}
