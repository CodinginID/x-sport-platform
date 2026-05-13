declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';
  interface AutoTableOptions {
    startY?: number;
    head?: any[][];
    body?: any[][];
    styles?: any;
    headStyles?: any;
    alternateRowStyles?: any;
  }
  export default function autoTable(doc: jsPDF, options: AutoTableOptions): void;
}
