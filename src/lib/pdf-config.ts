import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extension du type jsPDF pour inclure autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable?: {
      finalY: number;
      pageNumber?: number;
      cursor?: { x: number; y: number };
    };
  }
}

// Fonction pour charger les polices nécessaires
const loadFonts = (doc: jsPDF) => {
  try {
    // Vérifier si la police helvetica est disponible
    const fonts = doc.getFontList();
    if (!fonts || !fonts['helvetica']) {
      // Si la police n'est pas disponible, utiliser la police standard
      // Note: Ne pas appeler addFont car Helvetica est une police standard PDF
      // qui devrait toujours être disponible
      console.log('Utilisation de la police Helvetica standard');
    }
  } catch (error) {
    console.warn('Impossible de vérifier les polices disponibles :', error);
  }
};

// Fonction pour créer une nouvelle instance de jsPDF avec la configuration appropriée
export function createPdfInstance(): jsPDF {
  try {
    // Configuration de base pour le document PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    // Charger les polices nécessaires
    loadFonts(doc);
    
    // Ajouter autoTable à l'instance
    (doc as any).autoTable = autoTable;
    
    // Utiliser une police standard de PDF qui est garantie d'être disponible
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    
    return doc;
  } catch (error) {
    console.error('Erreur lors de la création du document PDF:', error);
    throw new Error('Impossible de créer le document PDF. Veuillez réessayer.');
  }
}
