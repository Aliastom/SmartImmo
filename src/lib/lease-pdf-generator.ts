import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { createPdfInstance } from './pdf-config';

// Déclaration des types
interface Address {
  street: string;
  postalCode: string;
  city: string;
  country?: string;
}

interface Person {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  birthDate?: Date;
  birthPlace?: string;
  address: Address;
}

interface Property {
  type: string;
  address: Address;
  area: number;
  description?: string;
  floor?: number;
  rooms?: number;
}

interface FinancialTerms {
  rent: number;
  charges: number;
  deposit: number;
  paymentDueDay: number;
  indexationClause: boolean;
  chargesIncluded: string[];
}

interface LeasePeriod {
  startDate: Date;
  endDate: Date;
  noticePeriod: number; // in months
}

export interface LeaseData {
  id: string;
  title: string;
  property: Property;
  landlord: Person;
  tenant: Person;
  period: LeasePeriod;
  financialTerms: FinancialTerms;
  specialClauses?: string[];
  createdAt: Date;
}

// Configuration du document
const PAGE_MARGIN = 20;
const PRIMARY_COLOR = '#2c3e50';
const SECONDARY_COLOR = '#7f8c8d';

// Types pour les options de l'autoTable
type AutoTableOptions = {
  head?: any[][];
  body: any[][];
  startY?: number;
  margin?: { top: number; left: number; right: number; bottom: number } | number;
  headStyles?: any;
  bodyStyles?: any;
  theme?: 'striped' | 'grid' | 'plain' | 'css';
  styles?: any;
  columnStyles?: { [key: number]: any };
  didDrawPage?: (data: any) => void;
  willDrawCell?: (data: any) => void;
  didDrawCell?: (data: any) => void;
};

/**
 * Génère un PDF de bail locatif
 * @param leaseData Les données du bail à inclure dans le PDF
 * @param outputType Le type de sortie souhaité ('download' pour télécharger, 'buffer' pour obtenir un ArrayBuffer)
 * @returns Une promesse résolue avec l'ArrayBuffer du PDF ou null en cas d'erreur
 */
export async function generateLeasePDF(
  leaseData: LeaseData, 
  outputType: 'download' | 'buffer' = 'download'
): Promise<ArrayBuffer | null> {
  let doc: jsPDF;
  
  try {
    // Création du document avec la configuration personnalisée
    doc = createPdfInstance();
    
    // Vérification que l'instance est correctement créée
    if (!doc || !('text' in doc)) {
      console.error('Échec de la création du document PDF : instance invalide');
      throw new Error('Impossible de créer une instance de document PDF valide');
    }
    
    // Vérification que autoTable est disponible
    if (typeof (doc as any).autoTable !== 'function') {
      console.error('La fonction autoTable n\'est pas disponible sur l\'instance doc');
      throw new Error('Configuration PDF incomplète : fonction autoTable manquante');
    }

    // Fonctions utilitaires
    const formatDate = (date: Date) => format(date, 'dd MMMM yyyy', { locale: fr });
    const formatCurrency = (amount: number) => 
      new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

    // Fonction pour ajouter l'en-tête du document
    const addHeader = () => {
      try {
        (doc as any).setFontSize(20);
        (doc as any).setTextColor(PRIMARY_COLOR);
        (doc as any).setFont('helvetica', 'bold');
        (doc as any).text(leaseData.title, PAGE_MARGIN, 30);
        (doc as any).setLineWidth(0.5);
        
        const pageWidth = (doc as any).internal.pageSize.getWidth();
        (doc as any).line(PAGE_MARGIN, 35, pageWidth - PAGE_MARGIN, 35);
      } catch (error) {
        console.error('Erreur lors de l\'ajout de l\'en-tête:', error);
        // Continuer même en cas d'erreur sur l'en-tête
      }
    };

    // Section des parties
    const addPartiesSection = (y: number) => {
      doc.setFontSize(14);
      doc.setTextColor(PRIMARY_COLOR);
      doc.setFont('helvetica', 'bold');
      doc.text('1. IDENTIFICATION DES PARTIES', PAGE_MARGIN, y);
      
      // Bailleur
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('LE BAILLEUR :', PAGE_MARGIN, y + 10);
      doc.setFont('helvetica', 'normal');
      doc.text(`${leaseData.landlord.firstName} ${leaseData.landlord.lastName}`, PAGE_MARGIN + 30, y + 10);
      doc.text(leaseData.landlord.address.street, PAGE_MARGIN + 30, y + 15);
      doc.text(`${leaseData.landlord.address.postalCode} ${leaseData.landlord.address.city}`, PAGE_MARGIN + 30, y + 20);
      
      if (leaseData.landlord.phone) {
        doc.text(`Tél: ${leaseData.landlord.phone}`, PAGE_MARGIN + 30, y + 25);
      }
      
      // Locataire
      doc.setFont('helvetica', 'bold');
      doc.text('LE LOCATAIRE :', PAGE_MARGIN, y + 35);
      doc.setFont('helvetica', 'normal');
      doc.text(`${leaseData.tenant.firstName} ${leaseData.tenant.lastName}`, PAGE_MARGIN + 30, y + 35);
      
      if (leaseData.tenant.birthDate && leaseData.tenant.birthPlace) {
        doc.text(`Né(e) le ${formatDate(leaseData.tenant.birthDate)} à ${leaseData.tenant.birthPlace}`, 
                PAGE_MARGIN + 30, y + 40);
      }
      
      doc.text(leaseData.tenant.address.street, PAGE_MARGIN + 30, y + 45);
      doc.text(`${leaseData.tenant.address.postalCode} ${leaseData.tenant.address.city}`, PAGE_MARGIN + 30, y + 50);
      
      if (leaseData.tenant.phone) {
        doc.text(`Tél: ${leaseData.tenant.phone}`, PAGE_MARGIN + 30, y + 55);
      }
      
      return y + 65;
    };

    // Section description du bien
    const addPropertySection = (y: number) => {
      doc.setFontSize(14);
      doc.setTextColor(PRIMARY_COLOR);
      doc.setFont('helvetica', 'bold');
      doc.text(`${currentSectionNumber}. DÉSIGNATION DU BIEN LOUÉ`, PAGE_MARGIN, y);
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      
      let yPos = y + 10;
      
      doc.text(`Il est convenu et arrêté ce qui suit entre les parties ci-dessus désignées :`, PAGE_MARGIN, yPos);
      yPos += 7;
      
      doc.text(`Le présent contrat a pour objet la location d'un bien immobilier à usage d'habitation principale, ` +
              `désigné ci-après comme "le bien loué" et situé :`, PAGE_MARGIN, yPos);
      yPos += 7;
      
      doc.text(`Adresse : ${leaseData.property.address.street}`, PAGE_MARGIN + 10, yPos);
      yPos += 5;
      doc.text(`${leaseData.property.address.postalCode} ${leaseData.property.address.city}`, PAGE_MARGIN + 10, yPos);
      yPos += 7;
      
      doc.text(`Le bien est un ${leaseData.property.type.toLowerCase()} d'une surface de ${leaseData.property.area} m².`, 
              PAGE_MARGIN, yPos);
      yPos += 5;
      
      if (leaseData.property.floor !== undefined) {
        doc.text(`Étage : ${leaseData.property.floor}`, PAGE_MARGIN, yPos);
        yPos += 5;
      }
      
      if (leaseData.property.description) {
        const splitDesc = doc.splitTextToSize(leaseData.property.description, 170);
        doc.text(splitDesc, PAGE_MARGIN, yPos);
        yPos += splitDesc.length * 5 + 5;
      } else {
        yPos += 5;
      }
      
      return yPos;
    };

    // Section durée du bail
    const addDurationSection = (y: number) => {
      doc.setFontSize(14);
      doc.setTextColor(PRIMARY_COLOR);
      doc.setFont('helvetica', 'bold');
      doc.text(`${currentSectionNumber}. DURÉE DU BAIL`, PAGE_MARGIN, y);
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      
      let yPos = y + 10;
      
      const durationText = `Le présent bail est consenti pour une durée de 3 ans à compter du ` +
              `${formatDate(leaseData.period.startDate)} et prendra fin le ${formatDate(leaseData.period.endDate)}.`;
      
      const splitDuration = doc.splitTextToSize(durationText, 170);
      doc.text(splitDuration, PAGE_MARGIN, yPos);
      yPos += splitDuration.length * 5 + 5;
      
      const renewalText = `Il est conclu en application des dispositions de la loi du 6 juillet 1989 et sera renouvelé ` +
              `par tacite reconduction par périodes triennales, sauf dénonciation par l'une ou l'autre des ` +
              `parties dans les conditions prévues par la loi.`;
      
      const splitRenewal = doc.splitTextToSize(renewalText, 170);
      doc.text(splitRenewal, PAGE_MARGIN, yPos);
      yPos += splitRenewal.length * 5 + 5;
      
      doc.text(`Le préavis de départ est fixé à ${leaseData.period.noticePeriod} mois.`, PAGE_MARGIN, yPos);
      yPos += 7;
      
      return yPos;
    };

    // Section loyer et charges - Version simplifiée sans autoTable
    const addFinancialSection = (y: number) => {
      let yPos = y;
      
      try {
        // Titre de la section
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(PRIMARY_COLOR);
        doc.text(`${currentSectionNumber}. LOYER ET CHARGES`, PAGE_MARGIN, yPos);
        
        yPos += 10;
        
        // Texte descriptif
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        
        const rentText = `Le loyer est fixé à la somme de ${formatCurrency(leaseData.financialTerms.rent)} ` +
                `(${leaseData.financialTerms.rent.toLocaleString('fr-FR')} euros) par mois, charges comprises.`;
        
        doc.text(rentText, PAGE_MARGIN, yPos);
        yPos += 10;
        
        // En-tête du tableau
        doc.setFont('helvetica', 'bold');
        doc.text('DÉSIGNATION', PAGE_MARGIN, yPos);
        doc.text('MONTANT', PAGE_MARGIN + 100, yPos, { align: 'right' });
        
        yPos += 7;
        
        // Ligne de séparation
        doc.setDrawColor(200, 200, 200);
        doc.line(PAGE_MARGIN, yPos, doc.internal.pageSize.width - PAGE_MARGIN, yPos);
        
        yPos += 5;
        
        // Données du tableau
        doc.setFont('helvetica', 'normal');
        const lineHeight = 7;
        const tableData = [
          { label: 'Loyer mensuel', value: leaseData.financialTerms.rent },
          { label: 'Charges mensuelles', value: leaseData.financialTerms.charges || 0 },
          { label: 'Dépôt de garantie', value: leaseData.financialTerms.deposit, isBold: true }
        ];
        
        // Afficher les lignes du tableau
        tableData.forEach((item, index) => {
          if (item.isBold) doc.setFont('helvetica', 'bold');
          
          doc.text(item.label, PAGE_MARGIN, yPos);
          doc.text(formatCurrency(item.value), PAGE_MARGIN + 100, yPos, { align: 'right' });
          
          yPos += lineHeight;
          if (index < tableData.length - 1) {
            // Ligne de séparation entre les éléments
            doc.setDrawColor(240, 240, 240);
            doc.line(PAGE_MARGIN, yPos - 2, doc.internal.pageSize.width - PAGE_MARGIN, yPos - 2);
          }
          
          if (item.isBold) doc.setFont('helvetica', 'normal');
        });
        
        // Ligne de séparation finale
        doc.setDrawColor(200, 200, 200);
        doc.line(PAGE_MARGIN, yPos, doc.internal.pageSize.width - PAGE_MARGIN, yPos);
        
        yPos += 10;
        
        // Informations supplémentaires
        doc.text(`Le loyer est payable d'avance, le ${leaseData.financialTerms.paymentDueDay} de chaque mois.`, 
                PAGE_MARGIN, yPos);
        yPos += 7;
      
        if (leaseData.financialTerms.indexationClause) {
          doc.text(`Le loyer sera révisé chaque année selon l'indice INSEE des loyers.`, PAGE_MARGIN, yPos);
          yPos += 7;
        }
        
        // Ajouter un espace avant la section suivante
        yPos += 10;
        
        return yPos;
      } catch (error) {
        console.error('Erreur dans addFinancialSection:', error);
        // En cas d'erreur, retourner une position Y qui permet de continuer
        return y + 100;
      }
    };

    // Section état des lieux
    const addInventorySection = (y: number) => {
      doc.setFontSize(14);
      doc.setTextColor(PRIMARY_COLOR);
      doc.setFont('helvetica', 'bold');
      doc.text(`${currentSectionNumber}. ÉTAT DES LIEUX`, PAGE_MARGIN, y);
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      
      let yPos = y + 10;
      
      const inventoryText = `Un état des lieux contradictoire sera établi à l'entrée dans les lieux et à la sortie du locataire, ` +
              `conformément aux dispositions de l'article 3-1 de la loi du 6 juillet 1989.`;
      
      const splitInventory = doc.splitTextToSize(inventoryText, 170);
      doc.text(splitInventory, PAGE_MARGIN, yPos);
      yPos += splitInventory.length * 5 + 7;
      
      const expertText = `En cas de désaccord sur l'état des lieux de sortie, les parties pourront recourir à un expert ` +
              `désigné d'un commun accord ou, à défaut, par le Président du Tribunal Judiciaire.`;
      
      const splitExpert = doc.splitTextToSize(expertText, 170);
      doc.text(splitExpert, PAGE_MARGIN, yPos);
      yPos += splitExpert.length * 5 + 7;
      
      return yPos;
    };

    // Section obligations des parties
    const addObligationsSection = (y: number) => {
      doc.setFontSize(14);
      doc.setTextColor(PRIMARY_COLOR);
      doc.setFont('helvetica', 'bold');
      doc.text(`${currentSectionNumber}. OBLIGATIONS DES PARTIES`, PAGE_MARGIN, y);
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      
      let yPos = y + 10;
      
      const obligations = [
        "Le locataire s'engage à payer le loyer aux dates convenues.",
        "Le locataire doit utiliser le logement à titre de résidence principale.",
        "Travaux : le locataire ne peut effectuer de travaux sans l'accord écrit du bailleur.",
        "Assurance : le locataire doit être assuré en responsabilité civile."
      ];
      
      obligations.forEach(obligation => {
        doc.text(`• ${obligation}`, PAGE_MARGIN, yPos);
        yPos += 7;
      });
      
      return yPos;
    };

    // Section assurance
    const addInsuranceSection = (y: number) => {
      doc.setFontSize(14);
      doc.setTextColor(PRIMARY_COLOR);
      doc.setFont('helvetica', 'bold');
      doc.text(`${currentSectionNumber}. ASSURANCE`, PAGE_MARGIN, y);
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      
      let yPos = y + 10;
      
      const insuranceText = `Le locataire est tenu de souscrire une assurance garantissant les risques locatifs (incendie, explosion, ` +
              `dégâts des eaux, etc.) pour le compte du bailleur.`;
      
      const splitInsurance = doc.splitTextToSize(insuranceText, 170);
      doc.text(splitInsurance, PAGE_MARGIN, yPos);
      yPos += splitInsurance.length * 5 + 7;
      
      const attestationText = `Une attestation d'assurance devra être fournie au bailleur avant l'entrée dans les lieux, puis à chaque ` +
              `échéance annuelle.`;
      
      const splitAttestation = doc.splitTextToSize(attestationText, 170);
      doc.text(splitAttestation, PAGE_MARGIN, yPos);
      yPos += splitAttestation.length * 5 + 7;
      
      return yPos;
    };

    // Section clause résolutoire
    const addTerminationClause = (y: number) => {
      doc.setFontSize(14);
      doc.setTextColor(PRIMARY_COLOR);
      doc.setFont('helvetica', 'bold');
      doc.text(`${currentSectionNumber}. CLAUSE RÉSOLUTOIRE`, PAGE_MARGIN, y);
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      
      let yPos = y + 10;
      
      const terminationText = `En cas de défaut de paiement du loyer ou des charges, ou de non-respect des obligations prévues au ` +
              `présent contrat, le bail pourra être résilié de plein droit après mise en demeure restée infructueuse ` +
              `dans les conditions prévues par la loi.`;
      
      const splitTermination = doc.splitTextToSize(terminationText, 170);
      doc.text(splitTermination, PAGE_MARGIN, yPos);
      yPos += splitTermination.length * 5 + 10;
      
      return yPos;
    };

    // Section loi applicable et juridiction compétente
    const addJurisdictionSection = (y: number) => {
      doc.setFontSize(14);
      doc.setTextColor(PRIMARY_COLOR);
      doc.setFont('helvetica', 'bold');
      doc.text(`${currentSectionNumber}. COMPÉTENCE JURIDICTIONNELLE`, PAGE_MARGIN, y);
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      
      let yPos = y + 10;
      
      const jurisdictionText = `Le présent contrat est soumis au droit français. En cas de litige, les tribunaux du lieu de situation ` +
              `de l'immeuble seront seuls compétents.`;
      
      const splitJurisdiction = doc.splitTextToSize(jurisdictionText, 170);
      doc.text(splitJurisdiction, PAGE_MARGIN, yPos);
      yPos += splitJurisdiction.length * 5 + 10;
      
      return yPos;
    };

    // Section signatures
    const addSignatures = (y: number) => {
      const pageWidth = doc.internal.pageSize.width;
      
      // Ajouter le titre de la section
      doc.setFontSize(14);
      doc.setTextColor(PRIMARY_COLOR);
      doc.setFont('helvetica', 'bold');
      doc.text(`${currentSectionNumber}. SIGNATURES`, PAGE_MARGIN, y);
      
      // Positionner les signatures plus bas
      const signatureY = Math.max(y + 30, doc.internal.pageSize.height - 60);
      
      try {
        // Date et lieu
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Fait à ${leaseData.property.address.city}, le ${formatDate(new Date())}`, 
                pageWidth / 2, signatureY, { align: 'center' });
        
        // Lignes de signature
        const lineLength = 80;
        const leftX = 60;
        const rightX = pageWidth - 140;
        
        // Signature bailleur
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text('Le Bailleur', leftX, signatureY + 20);
        doc.line(leftX, signatureY + 22, leftX + lineLength, signatureY + 22);
        
        // Signature locataire
        doc.text('Le Locataire', rightX, signatureY + 20);
        doc.line(rightX, signatureY + 22, rightX + lineLength, signatureY + 22);
        
        return signatureY + 60;
      } catch (error) {
        console.error('Erreur lors de l\'ajout des signatures:', error);
        throw new Error('Erreur lors de l\'ajout des signatures');
      }
    };

    // ...

    // Fonction pour ajouter le pied de page
    const addFooter = () => {
      try {
        const pageCount = (doc as any).internal.getNumberOfPages();
        
        for (let i = 1; i <= pageCount; i++) {
          try {
            // Aller à la page
            (doc as any).setPage(i);
            
            // Sauvegarder l'état actuel
            const currentTextColor = (doc as any).getTextColor();
            const currentFontSize = (doc as any).getFontSize();
            const currentFont = (doc as any).getFont();
            
            // Définir le style du pied de page
            (doc as any).setTextColor(100);
            (doc as any).setFontSize(8);
            
            // Ajouter le numéro de page
            const pageSize = (doc as any).internal.pageSize;
            const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
            const footerY = pageHeight - 10;
            
            // Texte du pied de page
            const footerText = `Page ${i} sur ${pageCount} - Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm')}`;
            const footerWidth = (doc as any).getStringUnitWidth(footerText) * (doc as any).getFontSize() / (doc as any).internal.scaleFactor;
            const footerX = (pageSize.width - footerWidth) / 2;
            
            // Ajouter le texte
            (doc as any).text(footerText, footerX, footerY);
            
            // Restaurer l'état précédent
            (doc as any).setTextColor(currentTextColor);
            (doc as any).setFontSize(currentFontSize);
            (doc as any).setFont(currentFont.fontName, currentFont.fontStyle);
          } catch (pageError) {
            console.error(`Erreur lors de l'ajout du pied de page à la page ${i}:`, pageError);
            // Continuer avec la page suivante en cas d'erreur
            continue;
          }
        }
      } catch (error) {
        console.error('Erreur lors de la gestion du pied de page:', error);
        // Continuer même en cas d'erreur sur le pied de page
      }
    };
    
    // Construction du document
    let currentSectionNumber = 0;
    
    // Vérifier que l'instance doc est valide
    if (!doc || typeof doc.text !== 'function') {
      throw new Error('Instance de document PDF invalide');
    }
    
    // Ajouter l'en-tête
    if (typeof addHeader === 'function') {
      try {
        addHeader();
      } catch (e) {
        console.error('Erreur dans addHeader:', e);
      }
    }
    
    let y = 40;
    
    // Définition de toutes les sections dans l'ordre de numérotation séquentielle
    const allSections = [
      { name: 'addPartiesSection', func: addPartiesSection, number: 1 },
      { name: 'addPropertySection', func: addPropertySection, number: 2 },
      { name: 'addDurationSection', func: addDurationSection, number: 3 },
      { name: 'addFinancialSection', func: addFinancialSection, number: 4 },
      { name: 'addInventorySection', func: addInventorySection, number: 5 },
      { name: 'addObligationsSection', func: addObligationsSection, number: 6 },
      { name: 'addInsuranceSection', func: addInsuranceSection, number: 7 },
      { name: 'addTerminationClause', func: addTerminationClause, number: 8 },
      { name: 'addJurisdictionSection', func: addJurisdictionSection, number: 9 },
      { name: 'addSignatures', func: addSignatures, number: 10 }
    ];
    
    // Ajouter les sections principales avec gestion d'erreur individuelle
    allSections.forEach(section => {
      if (typeof section.func === 'function') {
        try {
          // Mettre à jour le numéro de section actuel
          currentSectionNumber = section.number;
          console.log(`Ajout de la section ${section.number}: ${section.name}`);
          // Appeler la fonction de la section avec la position Y actuelle
          const newY = section.func(y);
          // Mettre à jour Y pour la prochaine section
          y = newY;
          
          // Vérifier si on a besoin d'une nouvelle page
          if (y > doc.internal.pageSize.getHeight() - 50) {
            doc.addPage();
            y = 40; // Réinitialiser Y en haut de la nouvelle page
          }
        } catch (e) {
          console.error(`Erreur dans ${section.name}:`, e);
        }
      }
    });
    
    // Ajouter le pied de page
    addFooter();
    
    // Générer le PDF final
    if (outputType === 'buffer') {
      const pdfOutput = doc.output('arraybuffer');
      return Promise.resolve(pdfOutput);
    } else {
      doc.save(`bail-${leaseData.id}.pdf`);
      return Promise.resolve(null);
    }
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    
    // Essayer de sauvegarder un document d'erreur
    try {
      const errorDoc = new jsPDF();
      errorDoc.setFont('helvetica');
      errorDoc.setFontSize(12);
      errorDoc.text('Erreur lors de la génération du PDF', 20, 20);
      errorDoc.text('Une erreur est survenue lors de la création du document.', 20, 30);
      errorDoc.text('Veuillez contacter le support technique.', 20, 40);
      
      if (outputType === 'buffer') {
        return Promise.resolve(errorDoc.output('arraybuffer'));
      } else {
        errorDoc.save(`erreur-bail-${leaseData.id}.pdf`);
        return Promise.resolve(null);
      }
    } catch (finalError) {
      console.error('Échec critique de génération du PDF:', finalError);
      return Promise.reject('Échec critique lors de la génération du PDF. Veuillez contacter le support.');
    }
  }
}
