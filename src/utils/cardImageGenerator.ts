import { toCanvas, toPng, toJpeg } from 'html-to-image';
import JSZip from 'jszip';

export type ImageFormat = 'png' | 'jpeg';

/**
 * Pre-loads all <img> tags inside an element before capture
 */
async function ensureImagesLoaded(element: HTMLElement): Promise<void> {
  try {
    const imgs = Array.from(element.querySelectorAll('img'));
    const promises = imgs.map((img) => {
      if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        setTimeout(resolve, 2000);
      });
    });
    await Promise.all(promises);
  } catch (e) {
    console.warn("Ensure images loaded warning:", e);
  }
}

/**
 * Captures a card DOM element and converts it to HD Canvas with pixel-perfect fidelity
 */
export async function captureCardCanvas(elementId: string): Promise<HTMLCanvasElement> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Élément introuvable pour la capture: ${elementId}`);
  }

  await ensureImagesLoaded(element);

  // Use browser's native engine via SVG foreignObject with optimized DPI and quality
  const canvas = await toCanvas(element, {
    pixelRatio: 2, // High resolution optimized for print and compact file size
    quality: 0.88,
    cacheBust: false,
    backgroundColor: '#ffffff',
    width: 360,
    height: 230,
    style: {
      transform: 'none',
      transformOrigin: 'top left',
      margin: '0',
      width: '360px',
      height: '230px',
    },
  });

  return canvas;
}

/**
 * Generates an HD DataURL for a single card image in PNG or JPEG format
 */
export async function generateSingleCardImageDataUrl(elementId: string, format: ImageFormat = 'png', quality: number = 0.88): Promise<string> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Élément introuvable pour la capture: ${elementId}`);
  }

  await ensureImagesLoaded(element);

  const options = {
    pixelRatio: 3,
    quality: quality,
    cacheBust: false,
    backgroundColor: '#ffffff',
    width: 360,
    height: 230,
    style: {
      transform: 'none',
      transformOrigin: 'top left',
      margin: '0',
      width: '360px',
      height: '230px',
    },
  };

  if (format === 'jpeg') {
    return await toJpeg(element, options);
  } else {
    return await toPng(element, options);
  }
}

/**
 * Download a single card image (PNG or JPEG)
 */
export async function downloadSingleCardImage(elementId: string, filename: string, format: ImageFormat = 'png', quality: number = 0.98): Promise<void> {
  const dataUrl = await generateSingleCardImageDataUrl(elementId, format, quality);
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename.endsWith(`.${format === 'jpeg' ? 'jpg' : 'png'}`) ? filename : `${filename}.${format === 'jpeg' ? 'jpg' : 'png'}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates a ZIP archive containing all card images in PNG or JPEG format
 */
export async function generateBatchCardsZip(
  cardItems: { elementId: string; filename: string }[],
  zipFilename: string,
  format: ImageFormat = 'png',
  onProgress?: (percent: number) => void
): Promise<void> {
  if (cardItems.length === 0) {
    throw new Error("Aucune carte à générer dans le lot.");
  }

  const zip = new JSZip();
  const ext = format === 'jpeg' ? 'jpg' : 'png';

  for (let i = 0; i < cardItems.length; i++) {
    const item = cardItems[i];
    try {
      const dataUrl = await generateSingleCardImageDataUrl(item.elementId, format, 0.98);
      const base64Data = dataUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
      
      let cleanFilename = item.filename;
      if (!cleanFilename.toLowerCase().endsWith(`.${ext}`)) {
        cleanFilename = `${cleanFilename}.${ext}`;
      }

      zip.file(cleanFilename, base64Data, { base64: true });
    } catch (err) {
      console.error(`Erreur lors de la capture de ${item.elementId}:`, err);
    }

    if (onProgress) {
      const percent = Math.round(((i + 1) / cardItems.length) * 100);
      onProgress(percent);
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
    if (onProgress) {
      onProgress(Math.min(99, Math.round(metadata.percent)));
    }
  });

  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = zipFilename.endsWith('.zip') ? zipFilename : `${zipFilename}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

