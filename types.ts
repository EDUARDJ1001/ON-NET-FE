declare module "html2pdf.js" {
  export interface Html2PdfOptions {
    margin?: number | [number, number] | [number, number, number, number];
    filename?: string;
    image?: { type?: "jpeg" | "png"; quality?: number };
    html2canvas?: { scale?: number; useCORS?: boolean };
    jsPDF?: {
      unit?: "pt" | "mm" | "cm" | "in";
      format?: string | number[];
      orientation?: "portrait" | "landscape";
    };
    pagebreak?: { mode?: Array<"css" | "legacy"> };
  }

  export interface Html2PdfChain {
    set: (opt: Html2PdfOptions) => Html2PdfChain;
    from: (el: HTMLElement | string) => Html2PdfChain;
    save: () => Promise<void>;
    // Métodos opcionales comunes en la cadena; tipados básicos por si los usas:
    toPdf?: () => Html2PdfChain;
    output?: (type?: string) => Promise<string | Blob>;
  }

  type Html2PdfFactory = () => Html2PdfChain;

  const html2pdf: Html2PdfFactory;
  export default html2pdf;
}
