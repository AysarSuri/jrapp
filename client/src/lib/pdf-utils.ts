import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

const FONT_FAMILY = "'Noto Naskh Arabic','Tajawal','Noto Sans Arabic','Noto Kufi Arabic','Segoe UI',sans-serif";

const GOOGLE_FONTS_CSS_URL = "https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&family=Noto+Kufi+Arabic:wght@400;500;600;700&family=Tajawal:wght@300;400;500;700;800&family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap";

let fontCssCache: string | null = null;

async function fetchFontCssWithDataUrls(): Promise<string> {
  if (fontCssCache) return fontCssCache;

  try {
    const resp = await fetch(GOOGLE_FONTS_CSS_URL);
    const cssText = await resp.text();

    const urlRegex = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g;
    let result = cssText;
    const matches = [...cssText.matchAll(urlRegex)];

    const fontPromises = matches.map(async (match) => {
      try {
        const fontResp = await fetch(match[1]);
        const blob = await fontResp.blob();
        return new Promise<{ original: string; dataUrl: string }>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({ original: match[0], dataUrl: `url(${reader.result})` });
          };
          reader.readAsDataURL(blob);
        });
      } catch {
        return null;
      }
    });

    const results = await Promise.all(fontPromises);
    for (const r of results) {
      if (r) {
        result = result.replace(r.original, r.dataUrl);
      }
    }

    fontCssCache = result;
    return result;
  } catch {
    return "";
  }
}

async function ensureFontsLoaded(): Promise<void> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  await new Promise(resolve => setTimeout(resolve, 100));
}

export async function captureElementAsPdf(
  element: HTMLElement,
  orientation: "p" | "l" = "p"
): Promise<Blob | null> {
  await ensureFontsLoaded();

  const fontCss = await fetchFontCssWithDataUrls();

  const dataUrl = await toPng(element, {
    quality: 1,
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    fontEmbedCSS: fontCss,
  });

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUrl;
  });

  const imgWidth = orientation === "p" ? 210 : 297;
  const pageHeight = orientation === "p" ? 297 : 210;
  const imgHeight = (img.height * imgWidth) / img.width;
  const pdf = new jsPDF(orientation, "mm", "a4");

  if (imgHeight <= pageHeight) {
    pdf.addImage(dataUrl, "PNG", 0, 0, imgWidth, imgHeight);
  } else {
    let yOffset = 0;
    let page = 0;
    while (yOffset < imgHeight) {
      if (page > 0) pdf.addPage();
      pdf.addImage(dataUrl, "PNG", 0, -yOffset, imgWidth, imgHeight);
      yOffset += pageHeight;
      page++;
    }
  }

  return pdf.output("blob");
}

export async function captureHtmlAsPdf(
  htmlContent: string,
  isRtl: boolean = false,
  orientation: "p" | "l" = "p"
): Promise<Blob | null> {
  await ensureFontsLoaded();

  const tempDiv = document.createElement("div");
  tempDiv.style.cssText = `position:absolute;left:-9999px;top:0;width:794px;background:white;padding:15px;font-size:10pt;font-family:${FONT_FAMILY};direction:${isRtl ? "rtl" : "ltr"}`;
  tempDiv.innerHTML = htmlContent;
  document.body.appendChild(tempDiv);

  try {
    return await captureElementAsPdf(tempDiv, orientation);
  } finally {
    document.body.removeChild(tempDiv);
  }
}

export { FONT_FAMILY };
