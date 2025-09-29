import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Déclarer l'extension autoTable pour TypeScript
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// Définir les types
type LeaseData = {
  id: string;
  rent: number;
  charges_provision?: number;
  security_deposit: number;
  lease_start: string;
  lease_end?: string;
  signature_place: string;
  property: {
    name: string;
    address: string;
    property_type?: string;
    furnishing?: 'meublé' | 'vide' | 'meublé non dédié';
    area?: number;
    floor?: number;
  };
  tenant: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    birth_date?: string;
    birth_place?: string;
  };
};

type LandlordInfo = {
  fullName: string;
  address: string;
  phone?: string;
  email?: string;
  siret?: string;
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const generateLeasePDF = async (
  lease: LeaseData, 
  outputType: 'download' | 'buffer' = 'download', 
  landlordInfo?: LandlordInfo
): Promise<ArrayBuffer | null> => {
  try {
    console.log('Démarrage de la génération du PDF de bail...');
    
    // Créer une nouvelle instance de jsPDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Appliquer autoTable à l'instance doc
    // @ts-ignore
    doc.autoTable = autoTable;

    // Définir les couleurs
    const primaryColor = '#2c3e50';
    const secondaryColor = '#7f8c8d';
    const accentColor = '#3498db';

    // Fonction utilitaire pour formater les montants
    const formatCurrency = (amount: number): string => {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
      }).format(amount);
    };

    // Fonction pour ajouter un en-tête de section
    const addSectionHeader = (title: string, y: number): number => {
      doc.setFontSize(14);
      doc.setTextColor(primaryColor);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 20, y);
      return y + 10;
    };

    // Fonction pour ajouter un paragraphe
    const addParagraph = (text: string, y: number, opts: { 
      fontSize?: number; 
      marginBottom?: number; 
      align?: 'left' | 'center' | 'right';
    } = {}): number => {
      const { fontSize = 10, marginBottom = 5, align = 'left' } = opts;
      doc.setFontSize(fontSize);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      
      const maxWidth = 170;
      const pageWidth = doc.internal.pageSize.getWidth();
      const x = align === 'center' ? pageWidth / 2 : 20;
      
      const splitText = doc.splitTextToSize(text, maxWidth);
      doc.text(splitText, x, y, { align });
      
      return y + (splitText.length * (fontSize * 0.35)) + marginBottom;
    };

    // Position Y courante
    let y = 20;

    // En-tête du document
    doc.setFontSize(20);
    doc.setTextColor(primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('CONTRAT DE BAIL', 105, y, { align: 'center' });
    y += 20;

    // Section 1: Identification des parties
    y = addSectionHeader('1. IDENTIFICATION DES PARTIES', y);
    
    // Informations du bailleur
    const landlord = landlordInfo || {
      fullName: 'Nom du bailleur non spécifié',
      address: 'Adresse non spécifiée',
      phone: '',
      email: '',
      siret: ''
    };

    const landlordContact = [
      landlord.phone ? `Tél: ${landlord.phone}` : '',
      landlord.email ? `Email: ${landlord.email}` : '',
      landlord.siret ? `SIRET: ${landlord.siret}` : ''
    ].filter(Boolean).join(' - ');
    
    y = addParagraph(
      `<b>LE BAILLEUR (ci-après dénommé "le Bailleur") :</b>\n` +
      `${landlord.fullName}\n` +
      `${landlord.address}${landlordContact ? '\n' + landlordContact : ''}`, 
      y
    );

    // Informations du locataire
    const tenantName = `${lease.tenant.first_name || ''} ${lease.tenant.last_name || ''}`.trim() || 'Nom du locataire';
    const birthDate = lease.tenant.birth_date ? formatDate(lease.tenant.birth_date) : 'Date de naissance non spécifiée';
    const birthPlace = lease.tenant.birth_place || 'Lieu de naissance non spécifié';
    
    const tenantContact = [
      lease.tenant.phone ? `Tél: ${lease.tenant.phone}` : '',
      lease.tenant.email ? `Email: ${lease.tenant.email}` : ''
    ].filter(Boolean).join(' - ');
    
    y = addParagraph(
      `<b>LE LOCATAIRE (ci-après dénommé "le Locataire") :</b>\n` +
      `${tenantName}\n` +
      `Né(e) le ${birthDate} à ${birthPlace}` +
      `${tenantContact ? '\n' + tenantContact : ''}`, 
      y
    );

    // Section 2: Désignation du bien loué
    y = addSectionHeader('2. DÉSIGNATION DU BIEN LOUÉ', y + 10);
    
    const propertyType = lease.property.property_type || 'Type de bien non spécifié';
    const furnishing = lease.property.furnishing || 'Non spécifié';
    const area = lease.property.area ? `${lease.property.area} m²` : 'Surface non spécifiée';
    const floor = lease.property.floor !== undefined ? `Étage: ${lease.property.floor}` : '';
    
    y = addParagraph(
      `Le présent contrat a pour objet la location d'un bien immobilier à usage d'habitation principale, situé :\n` +
      `${lease.property.address || 'Adresse non spécifiée'}\n` +
      `Type: ${propertyType} - ${furnishing}\n` +
      `Surface: ${area}${floor ? ' - ' + floor : ''}`, 
      y
    );

    // Section 3: Durée du bail
    y = addSectionHeader('3. DURÉE DU BAIL', y + 10);
    
    const startDate = formatDate(lease.lease_start);
    const endDate = lease.lease_end ? formatDate(lease.lease_end) : 'Durée indéterminée';
    
    y = addParagraph(
      `Le présent bail est conclu pour une durée de 3 ans à compter du ${startDate} ` +
      `et prendra fin le ${endDate}.\n\n` +
      `Il est soumis au régime de la loi du 6 juillet 1989 et sera renouvelé par tacite reconduction.`,
      y
    );

    // Section 4: Loyer et charges
    y = addSectionHeader('4. LOYER ET CHARGES', y + 10);
    
    // Préparer les données du tableau
    const rentAmount = lease.rent || 0;
    const chargesAmount = lease.charges_provision || 0;
    const depositAmount = lease.security_deposit || 0;
    
    const tableData = [
      ['Loyer mensuel (hors charges)', formatCurrency(rentAmount)],
      ['Charges mensuelles', formatCurrency(chargesAmount)],
      ['Montant total mensuel', formatCurrency(rentAmount + chargesAmount)],
      ['Dépôt de garantie', formatCurrency(depositAmount)]
    ];

    // Ajouter le tableau
    doc.autoTable({
      startY: y,
      head: [['DÉSIGNATION', 'MONTANT']],
      body: tableData,
      margin: { left: 20, right: 20 },
      headStyles: {
        fillColor: primaryColor,
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 10,
        cellPadding: 5
      },
      columnStyles: {
        0: { cellWidth: 120, fontStyle: 'bold' },
        1: { cellWidth: 50, halign: 'right' }
      },
      didDrawPage: (data: any) => {
        // Pied de page sur chaque page
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(
          `Page ${data.pageNumber}`,
          pageSize.width / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
    });

    // Mettre à jour la position Y après le tableau
    y = (doc as any).lastAutoTable.finalY + 10;

    // Section 5: État des lieux
    y = addSectionHeader('5. ÉTAT DES LIEUX', y);
    y = addParagraph(
      "Un état des lieux contradictoire sera établi à l'entrée dans les lieux et à la sortie du locataire, " +
      "conformément aux dispositions de l'article 3-1 de la loi du 6 juillet 1989.",
      y
    );

    // Section 6: Assurance
    y = addSectionHeader('6. ASSURANCE', y + 10);
    y = addParagraph(
      "Le locataire est tenu de souscrire une assurance garantissant les risques locatifs " +
      "(incendie, explosion, dégâts des eaux, etc.) pour le compte du bailleur et d'en justifier " +
      "lors de la signature du présent contrat, puis à chaque échéance annuelle.",
      y
    );

    // Section 7: Clause résolutoire
    y = addSectionHeader('7. CLAUSE RÉSOLUTOIRE', y + 10);
    y = addParagraph(
      "En cas de défaut de paiement du loyer ou des charges, ou de non-respect des obligations " +
      "prévues au présent contrat, le bail pourra être résilié de plein droit après mise en " +
      "demeure restée infructueuse dans les conditions prévues par la loi.",
      y
    );

    // Section 8: Loi applicable et juridiction compétente
    y = addSectionHeader('8. LOI APPLICABLE ET JURIDICTION COMPÉTENTE', y + 10);
    y = addParagraph(
      "Le présent contrat est soumis au droit français. En cas de litige, les tribunaux du lieu " +
      "de situation de l'immeuble seront seuls compétents.",
      y
    );

    // Signatures
    y = Math.max(y, doc.internal.pageSize.height - 60);
    
    // Date et lieu
    const signatureDate = new Date().toLocaleDateString('fr-FR');
    const signaturePlace = lease.signature_place || 'Lieu non spécifié';
    
    y = addParagraph(
      `Fait à ${signaturePlace}, le ${signatureDate}`,
      y + 10,
      { align: 'center' }
    );
    
    // Lignes de signature
    const signatureY = y + 20;
    const lineLength = 60;
    const leftX = 50;
    const rightX = 140;
    
    // Signature bailleur
    doc.text('Le Bailleur', leftX, signatureY);
    doc.line(leftX, signatureY + 2, leftX + lineLength, signatureY + 2);
    
    // Signature locataire
    doc.text('Le Locataire', rightX, signatureY);
    doc.line(rightX, signatureY + 2, rightX + lineLength, signatureY + 2);
    
    // Pied de page final
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      'Document généré électroniquement - ' + new Date().toLocaleString('fr-FR'),
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );

    // Sauvegarder ou retourner le PDF
    if (outputType === 'download') {
      const fileName = `bail-${tenantName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      return null;
    } else {
      return doc.output('arraybuffer');
    }
    
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    throw new Error('Une erreur est survenue lors de la génération du PDF. Veuillez réessayer.');
  }
};
