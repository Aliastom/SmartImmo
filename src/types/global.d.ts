// Extend the Window interface to include jsPDF
declare global {
  interface Window {
    jsPDF: any;
  }
}

export {}; // This file needs to be a module
