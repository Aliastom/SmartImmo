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

export const generateLeasePDF = (lease: LeaseData, outputType: 'download' | 'buffer' = 'download', landlordInfo?: LandlordInfo) => {
  try {
    console.log('Début de generateLeasePDF avec les données:', {
      leaseId: lease.id,
      hasLandlord: !!landlordInfo,
      outputType
    });
    
    // Créer une nouvelle instance de jsPDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    // Appliquer autoTable à l'instance doc
    // @ts-ignore
    doc.autoTable = autoTable;

    // Gérer les informations du bailleur avec des valeurs par défaut
    const landlord = {
      fullName: landlordInfo?.fullName || 'Nom du bailleur non spécifié',
      address: landlordInfo?.address || 'Adresse non spécifiée',
      phone: landlordInfo?.phone || '',
      email: landlordInfo?.email || '',
      siret: landlordInfo?.siret || ''
    };

    // Définir les couleurs et polices
    const primaryColor = '#2c3e50';
    const secondaryColor = '#7f8c8d';
    const accentColor = '#3498db';

    // Fonction pour ajouter un en-tête de section
    const addSectionHeader = (title: string, y: number) => {
      doc.setFontSize(14);
      doc.setTextColor(primaryColor);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 20, y);
      return y + 10; // Retourne la nouvelle position Y
    };

    // Fonction pour ajouter un paragraphe
    const addParagraph = (text: string, y: number) => {
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0); // Noir
      doc.setFont('helvetica', 'normal');
      const splitText = doc.splitTextToSize(text, 170);
      doc.text(splitText, 20, y);
      return y + splitText.length * 5 + 5; // Ajuster l'espacement
    };

    // Ajouter le contenu du PDF
    let y = 20; // Position Y initiale

    // En-tête
    doc.setFontSize(20);
    doc.setTextColor(primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('CONTRAT DE BAIL', 105, 20, { align: 'center' });
    y = 30;

    // Section 1: Identification des parties
    y = addSectionHeader('1. IDENTIFICATION DES PARTIES', y);
    
    // Informations du bailleur
    const landlordName = landlord.fullName;
    const landlordAddress = landlord.address;
    const landlordContact = [
      landlord.phone ? `Tél: ${landlord.phone}` : '',
      landlord.email ? `Email: ${landlord.email}` : '',
      landlord.siret ? `SIRET: ${landlord.siret}` : ''
    ].filter(Boolean).join(' - ');
    
    y = addParagraph(`<b>LE BAILLEUR (ci-après dénommé "le Bailleur") :</b>\n${landlordName}\n${landlordAddress}${landlordContact ? '\n' + landlordContact : ''}`, y);

    // Informations du locataire
    const tenantName = lease.tenant ? `${lease.tenant.first_name || ''} ${lease.tenant.last_name || ''}`.trim() || 'Nom du locataire' : 'Nom du locataire';
    const birthDate = lease.tenant?.birth_date ? new Date(lease.tenant.birth_date).toLocaleDateString('fr-FR') : '[Date de naissance]';
    const birthPlace = lease.tenant?.birth_place || '[Lieu de naissance]';
    const tenantContact = [
      lease.tenant?.phone ? `Tél: ${lease.tenant.phone}` : '',
      lease.tenant?.email ? `Email: ${lease.tenant.email}` : ''
    ].filter(Boolean).join(' - ');
    
    y = addParagraph(`<b>LE LOCATAIRE (ci-après dénommé "le Locataire") :</b>\n${tenantName}\nNé(e) le ${birthDate} à ${birthPlace}${tenantContact ? '\n' + tenantContact : ''}`, y);

    // Section 2: Désignation du bien loué
    y = addSectionHeader('2. DÉSIGNATION DU BIEN LOUÉ', y + 10);
    
    const propertyType = lease.property?.property_type || '[Type de bien]';
    const propertyDetails = [
      `Surface: ${lease.property?.area ? `${lease.property.area} m²` : 'Non spécifiée'}`,
      `Étage: ${lease.property?.floor !== undefined ? lease.property.floor : 'Non spécifié'}`,
      `Type de location: ${lease.property?.furnishing || 'Non spécifié'}`
    ].filter(Boolean).join(' - ');
    
    y = addParagraph(`Le présent contrat a pour objet la location d'un bien immobilier à usage d'habitation principale, situé :\n${lease.property?.address || 'Adresse non spécifiée'}\n${propertyDetails}`, y);

    // Section 3: Durée du bail
    y = addSectionHeader('3. DURÉE DU BAIL', y + 10);
    
    const startDate = lease.lease_start ? new Date(lease.lease_start).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : '[Date de début non spécifiée]';
    
    const endDate = lease.lease_end 
      ? new Date(lease.lease_end).toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'Durée indéterminée';
    
    y = addParagraph(`Le présent bail est conclu pour une durée de 3 ans à compter du ${startDate} et prendra fin le ${endDate}.\n\nIl est soumis au régime de la loi du 6 juillet 1989 et sera renouvelé par tacite reconduction.`, y);

    // Section 4: Loyer et charges
    y = addSectionHeader('4. LOYER ET CHARGES', y + 10);
    
    // S'assurer que les montants sont des nombres valides
    const rentAmount = typeof lease.rent === 'number' ? lease.rent : 0;
    const chargesAmount = typeof lease.charges_provision === 'number' ? lease.charges_provision : 0;
    const depositAmount = typeof lease.security_deposit === 'number' ? lease.security_deposit : 0;
    
    console.log('Montants du bail:', { rent: rentAmount, charges: chargesAmount, deposit: depositAmount });

    // Fonction pour formater les montants
    const formatCurrency = (value: number) => {
      if (value === null || value === undefined) return '0,00 €';
      return `${Number(value).toFixed(2).replace('.', ',')} €`;
    };

    const tableData = [
      ['Loyer mensuel (hors charges)', formatCurrency(rentAmount)],
      ['Charges mensuelles', formatCurrency(chargesAmount)],
      ['Montant total mensuel', formatCurrency(rentAmount + chargesAmount)],
      ['Dépôt de garantie', formatCurrency(depositAmount)]
    ];
    
    console.log('Montants formatés:', tableData);

    // Positionner le tableau
    doc.autoTable({
      startY: y,
      head: [['DÉSIGNATION', 'MONTANT']],
      body: tableData,
      margin: { left: 20, right: 20 },
      headStyles: {
        fillColor: primaryColor,
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 120, fontStyle: 'bold' },
        1: { cellWidth: 50, halign: 'right' }
      },
      didDrawPage: (data: any) => {
        // Ajouter le pied de page sur chaque page
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Généré le ${new Date().toLocaleDateString('fr-FR')} - Page ${data.pageNumber}`,
          pageSize.width / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
    });

    // Ajuster la position Y après le tableau
    y = (doc as any).lastAutoTable.finalY + 10;

    // Section 5: État des lieux
    y = addSectionHeader('5. ÉTAT DES LIEUX', y);
    y = addParagraph("Un état des lieux contradictoire sera établi à l'entrée dans les lieux et à la sortie du locataire, conformément aux dispositions de l'article 3-1 de la loi du 6 juillet 1989.", y);

    // Section 6: Assurance
    y = addSectionHeader('6. ASSURANCE', y + 10);
    y = addParagraph("Le locataire est tenu de souscrire une assurance garantissant les risques locatifs (incendie, explosion, dégâts des eaux, etc.) pour le compte du bailleur et d'en justifier lors de la signature du présent contrat, puis à chaque échéance annuelle.", y);

    // Section 7: Clause résolutoire
    y = addSectionHeader('7. CLAUSE RÉSOLUTOIRE', y + 10);
    y = addParagraph("En cas de défaut de paiement du loyer ou des charges, ou de non-respect des obligations prévues au présent contrat, le bail pourra être résilié de plein droit après mise en demeure restée infructueuse dans les conditions prévues par la loi.", y);

    // Section 8: Loi applicable et juridiction compétente
    y = addSectionHeader('8. LOI APPLICABLE ET JURIDICTION COMPÉTENTE', y + 10);
    y = addParagraph("Le présent contrat est soumis au droit français. En cas de litige, les tribunaux du lieu de situation de l'immeuble seront seuls compétents.", y);

    // Signature
    y = Math.max(y, doc.internal.pageSize.height - 60);
    const signatureY = y + 20;
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    // Signature bailleur
    doc.text('Fait à ' + (lease.signature_place || '[Lieu]') + ', le ' + new Date().toLocaleDateString('fr-FR'), 20, y + 10);
    
    // Lignes de signature
    doc.text('Le Bailleur', 60, signatureY + 20);
    doc.line(40, signatureY + 22, 90, signatureY + 22);
    
    // Signature locataire
    doc.text('Le Locataire', 130, signatureY + 20);
    doc.line(120, signatureY + 22, 170, signatureY + 22);
    
    // Ajouter le pied de page sur la dernière page
    const pageSize = doc.internal.pageSize;
    const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
    
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
      pageSize.width / 2,
      pageHeight - 10,
      { align: 'center' }
    );

    // Sauvegarder ou retourner le PDF
    if (outputType === 'download') {
      const fileName = `bail-${tenantName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
      console.log('Tentative de sauvegarde du PDF:', fileName);
      doc.save(fileName);
      return null;
    } else {
      console.log('Retour du buffer PDF');
      return doc.output('arraybuffer');
    }
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    throw new Error('Une erreur est survenue lors de la génération du PDF. Veuillez réessayer.');
  }
    const { fontSize = 10, marginBottom = 5 } = opts;
    doc.setFontSize(fontSize);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    
    const splitText = doc.splitTextToSize(text, 170);
    doc.text(splitText, 20, y);
    
    return y + splitText.length * (fontSize * 0.35) + marginBottom;
  };

  // Ajouter l'en-tête
  doc.setFontSize(20);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRAT DE LOCATION', 105, 30, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor);
  doc.setFont('helvetica', 'italic');
  doc.text('Loi n°89-462 du 6 juillet 1989 - Article 1er', 105, 37, { align: 'center' });

  // Ligne de séparation sous le titre
  doc.setDrawColor(accentColor);
  doc.setLineWidth(0.5);
  doc.line(50, 42, 160, 42);

  // Position Y courante
  let y = 50;

  // Section 1: Désignation des parties
  y = addSectionHeader('1. DÉSIGNATION DES PARTIES', y);
  
  // Informations du bailleur
  const landlordName = landlord?.fullName || '[Nom du bailleur]';
  const landlordAddress = landlord?.address || '[Adresse du bailleur]';
  const landlordContact = [
    landlord?.phone ? `Tél: ${landlord.phone}` : '',
    landlord?.email ? `Email: ${landlord.email}` : '',
    landlord?.siret ? `SIRET: ${landlord.siret}` : ''
  ].filter(Boolean).join(' - ');
  
  y = addParagraph(`<b>LE BAILLEUR (ci-après dénommé "le Bailleur") :</b>\n${landlordName}\n${landlordAddress}${landlordContact ? '\n' + landlordContact : ''}`, y);

  // Récupération des informations de base avec valeurs par défaut
  const tenantName = lease.tenant ? `${lease.tenant.first_name || ''} ${lease.tenant.last_name || ''}`.trim() || 'Nom du locataire' : 'Nom du locataire';
  const propertyAddress = lease.property?.address || 'Adresse du bien non spécifiée';
  
  // Informations du locataire
  const birthDate = lease.tenant?.birth_date ? new Date(lease.tenant.birth_date).toLocaleDateString('fr-FR') : '[Date de naissance]';
  const birthPlace = lease.tenant?.birth_place || '[Lieu de naissance]';
  const tenantContact = [
    lease.tenant?.phone ? `Tél: ${lease.tenant.phone}` : '',
    lease.tenant?.email ? `Email: ${lease.tenant.email}` : ''
  ].filter(Boolean).join(' - ');
  
  y = addParagraph(`<b>LE LOCATAIRE (ci-après dénommé "le Locataire") :</b>\n${tenantName}\nNé(e) le ${birthDate} à ${birthPlace}${tenantContact ? '\n' + tenantContact : ''}`, y);

  // Section 2: Désignation du bien loué
  y = addSectionHeader('2. DÉSIGNATION DU BIEN LOUÉ', y + 5);
  
  const propertyType = lease.property?.property_type || '[Type de bien]';
  const propertyDetails = [
    `Surface: ${lease.property?.area ? `${lease.property.area} m²` : 'Non spécifiée'}`,
    `Étage: ${lease.property?.floor !== undefined ? lease.property.floor : 'Non spécifié'}`,
    `Type de location: ${lease.property?.furnishing || 'Non spécifié'}`
  ].filter(Boolean).join(' - ');
  
  y = addParagraph(`Le présent contrat a pour objet la location d'un bien immobilier à usage d'habitation principale, situé :\n${propertyAddress}\n${propertyDetails}`, y);

  // Section 3: Durée du bail
  y = addSectionHeader('3. DURÉE DU BAIL', y + 5);
  
  const startDate = new Date(lease.lease_start).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const endDate = lease.lease_end 
    ? new Date(lease.lease_end).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Durée indéterminée';
  
  y = addParagraph(`Le présent bail est conclu pour une durée de 3 ans à compter du ${startDate} et prendra fin le ${endDate}.\n\nIl est soumis au régime de la loi du 6 juillet 1989 et sera renouvelé par tacite reconduction.`, y);

  // Section 4: Loyer et charges
  y = addSectionHeader('4. LOYER ET CHARGES', y + 5);
  
  // S'assurer que les montants sont des nombres valides
  const rentAmount = typeof lease.rent === 'number' ? lease.rent : 0;
  const chargesAmount = typeof lease.charges_provision === 'number' ? lease.charges_provision : 0;
  const depositAmount = typeof lease.security_deposit === 'number' ? lease.security_deposit : 0;
  
  console.log('Montants du bail:', { rent: rentAmount, charges: chargesAmount, deposit: depositAmount });

  // Tableau des montants avec vérification des valeurs
  const formatCurrency = (value: number) => {
    if (value === null || value === undefined) return '0,00 €';
    return `${Number(value).toFixed(2).replace('.', ',')} €`;
  };

  const tableData = [
    ['Loyer mensuel (hors charges)', formatCurrency(rentAmount)],
    ['Charges mensuelles', formatCurrency(chargesAmount)],
    ['Montant total mensuel', formatCurrency(rentAmount + chargesAmount)],
    ['Dépôt de garantie', formatCurrency(depositAmount)]
  ];
  
  console.log('Montants formatés:', tableData);

  // Positionner le tableau
  doc.autoTable({
    startY: y,
    head: [['DÉSIGNATION', 'MONTANT']],
    body: tableData,
    margin: { left: 20, right: 20 },
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 10,
      cellPadding: 4
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    theme: 'grid',
    styles: {
      lineColor: [220, 220, 220],
      lineWidth: 0.3
    }
  });
  
  // Mettre à jour la position Y après le tableau
  y = (doc as any).lastAutoTable.finalY + 10;
  
  // Section 5: État des lieux et entretien
  y = addSectionHeader('5. ÉTAT DES LIEUX ET ENTRETIEN', y);
  
  y = addParagraph(`Un état des lieux contradictoire sera établi à l'entrée et à la sortie du locataire selon les modalités légales en vigueur.\n\nLe locataire est tenu d'entretenir les lieux et de les rendre en bon état à la fin du bail, à l'exception de l'usure normale.`, y);

  // Section 6: Assurance
  y = addSectionHeader('6. ASSURANCE', y + 5);
  
  y = addParagraph(`Le locataire est tenu de souscrire une assurance multirisque habitation couvrant les risques locatifs, et d'en justifier annuellement.`, y);

  // Section 7: Signature
  y = addSectionHeader('7. SIGNATURES', y + 5);
  
  const signatureY = Math.max(y, 250); // S'assurer qu'on est vers la fin de la page
  
  // Signature bailleur
  doc.setFontSize(10);
  doc.text('Fait à ' + (lease.signature_place || '[Lieu]'), 40, signatureY);
  doc.text('Le ' + new Date().toLocaleDateString('fr-FR'), 40, signatureY + 5);
  doc.text('Le Bailleur', 40, signatureY + 20);
  doc.line(40, signatureY + 22, 90, signatureY + 22);
  
  // Signature locataire
  doc.text('Le Locataire', 130, signatureY + 20);
  doc.line(120, signatureY + 22, 170, signatureY + 22);
  
  // Ajout du pied de page sur la page actuelle
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  
  // Récupération de la taille de la page de manière sécurisée
  const pageSize = {
    width: doc.internal.pageSize.getWidth(),
    height: doc.internal.pageSize.getHeight()
  };
  
  // Ajout de la date de génération en bas de page
  doc.text(
    `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
    pageSize.width / 2,
    pageSize.height - 10,
    { align: 'center' }
  );
  
  console.log('Pied de page ajouté avec succès');

  // Sauvegarder ou retourner le PDF
  if (outputType === 'download') {
    const fileName = `bail-${tenantName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
    console.log('Tentative de sauvegarde du PDF:', fileName);
    doc.save(fileName);
    return null;
  } else {
    console.log('Retour du buffer PDF');
    return doc.output('arraybuffer');
  }
};
