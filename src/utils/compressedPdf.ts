import { jsPDF as BaseJsPDF, jsPDFOptions } from 'jspdf';

/**
 * Enhanced jsPDF class with built-in compression
 * - Enforces stream compression (Flate / Deflate) for all PDF outputs
 * - Automatically compresses embedded images (logos, stamps, QR codes, signatures)
 */
export class jsPDF extends BaseJsPDF {
  constructor(options?: jsPDFOptions);
  constructor(
    orientation?: 'p' | 'portrait' | 'l' | 'landscape',
    unit?: 'pt' | 'px' | 'in' | 'mm' | 'cm' | 'ex' | 'em' | 'pc',
    format?: string | number[],
    compress?: boolean
  );
  constructor(...args: any[]) {
    if (args.length === 0) {
      super({ compress: true });
    } else if (typeof args[0] === 'object' && args[0] !== null) {
      super({ ...args[0], compress: true });
    } else {
      const [orientation = 'p', unit = 'mm', format = 'a4'] = args;
      super({ orientation, unit, format, compress: true });
    }
  }

  addImage(...args: any[]) {
    try {
      const imageData = args[0];
      
      // If positional arguments with format string at index 1: (imageData, format, x, y, width, height, alias, compression, rotation)
      if (typeof args[1] === 'string') {
        if (!args[7] || args[7] === 'NONE' || args[7] === 'FAST') {
          args[7] = 'SLOW';
        }
        if (typeof imageData === 'string' && imageData.length > 100 && !args[6]) {
          let hash = 0;
          for (let i = 0; i < Math.min(imageData.length, 500); i++) {
            hash = ((hash << 5) - hash) + imageData.charCodeAt(i);
            hash |= 0;
          }
          args[6] = `img_${Math.abs(hash).toString(36)}`;
        }
      }

      return (super.addImage as any)(...args);
    } catch (e) {
      console.warn("jsPDF addImage safe fallback:", e);
      return this;
    }
  }
}

export type { jsPDFOptions };
export default jsPDF;
