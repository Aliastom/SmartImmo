// Type definitions for jsPDF v3.0.2
// Project: https://github.com/MrRio/jsPDF
// Definitions by: Amber Schühmacher <https://github.com/amberjs>
//                 Kevin Gonnord <https://github.com/lleios>
//                 Eric Nakagawa <https://github.com/ericnakagawa>
//                 Jack Saunders <https://github.com/JackSaunders>
//                 Kamil Wojcik <https://github.com/kwojcik>
//                 Martin Peveri <https://github.com/mpeyrem">
//                 Frederic Rivain <https://github.com/frivain>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 3.6

declare module 'jspdf' {
  interface jsPDFOptions {
    orientation?: 'p' | 'portrait' | 'l' | 'landscape';
    unit?: 'pt' | 'px' | 'in' | 'mm' | 'cm' | 'ex' | 'em' | 'pc';
    format?: string | number[];
    compress?: boolean;
    precision?: number;
    filters?: string[];
    userUnit?: number;
    hotfixes?: string[];
    encryption?: any;
    putOnlyUsedFonts?: boolean;
    floatPrecision?: number | 'smart';
  }

  interface jsPDFAPI {
    events: any[];
    autoTable: (options: any) => jsPDF;
  }

  class jsPDF {
    constructor(options?: jsPDFOptions);
    constructor(
      orientation?: 'p' | 'portrait' | 'l' | 'landscape',
      unit?: 'pt' | 'px' | 'in' | 'mm' | 'cm' | 'ex' | 'em' | 'pc',
      format?: string | number[],
      compressPdf?: boolean
    );

    // Properties
    internal: {
      pageSize: {
        width: number;
        height: number;
        getWidth: () => number;
        getHeight: () => number;
      };
      scaleFactor: number;
      getFontList: () => { [key: string]: any };
      getFont: () => any;
      getFontSize: () => number;
      getLineHeight: () => number;
    };

    // Methods
    addFileToVFS: (filename: string, filecontent: string) => void;
    addFont: (postScriptName: string, id: string, fontStyle: string) => void;
    addPage: (format?: string | number[], orientation?: string) => jsPDF;
    addSvgAsImage: (svg: string, x: number, y: number, width?: number, height?: number) => jsPDF;
    autoTable: (options: any) => jsPDF;
    getFontList: () => { [key: string]: string[] };
    getFontSize: () => number;
    getLineHeight: () => number;
    getStringUnitWidth: (text: string, options?: any) => number;
    getTextWidth: (text: string) => number;
    output: (type?: string, options?: any) => any;
    save: (filename?: string, options?: any) => jsPDF;
    setFont: (fontName: string, fontStyle?: string) => jsPDF;
    setFontSize: (size: number) => jsPDF;
    setLanguage: (lang: string) => jsPDF;
    setPage: (pageNumber: number) => jsPDF;
    text: (text: string | string[], x: number, y: number, options?: any) => jsPDF;
    
    // Last autoTable
    lastAutoTable?: {
      finalY?: number;
      pageNumber?: number;
    };
  }

  export = jsPDF;
}

declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';
  
  interface AutoTableOptions {
    startY?: number;
    margin?: number | { top?: number; right?: number; bottom?: number; left?: number; };
    pageBreak?: 'auto' | 'avoid' | 'always';
    rowPageBreak?: 'auto' | 'avoid';
    tableWidth?: 'wrap' | 'auto' | number;
    showHead?: boolean | 'firstPage' | 'everyPage';
    tableLineWidth?: number;
    tableLineColor?: number | number[];
    styles?: any;
    headerStyles?: any;
    bodyStyles?: any;
    footStyles?: any;
    alternateRowStyles?: any;
    columnStyles?: { [key: string]: any };
    theme?: 'striped' | 'grid' | 'plain' | 'css';
    didParseCell?: (data: any) => void;
    willDrawCell?: (data: any) => void;
    didDrawCell?: (data: any) => void;
    didDrawPage?: (data: any) => void;
  }

  interface jsPDFWithAutoTable extends jsPDF {
    autoTable: (options: AutoTableOptions) => jsPDFWithAutoTable;
    lastAutoTable?: {
      finalY: number;
    };
  }

  export function applyPlugin(jsPDF: any): void;
  
  const _default: (jsPDF: any) => void;
  export default _default;
}
