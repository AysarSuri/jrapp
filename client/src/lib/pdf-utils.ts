import { toCanvas } from "html-to-image";
import { jsPDF } from "jspdf";

const FONT_FAMILY = "'Noto Naskh Arabic','Tajawal','Noto Sans Arabic','Noto Kufi Arabic','Segoe UI',sans-serif";

const A4_WIDTH_PX = 794;

async function ensureFontsLoaded(): Promise<void> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  const testChars = "پچڤگڵڕێۆژ فاتورة مبيعات فرۆشتن لیستی حسابی دۆلار";
  const fontFaces = [
    '400 16px "Noto Naskh Arabic"',
    '700 16px "Noto Naskh Arabic"',
    '400 16px "Tajawal"',
    '700 16px "Tajawal"',
  ];
  try {
    await Promise.all(fontFaces.map(f => document.fonts.load(f, testChars).catch(() => {})));
    await document.fonts.ready;
  } catch {}
  await new Promise(resolve => setTimeout(resolve, 150));
}

async function imageToDataUri(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(c.toDataURL("image/png"));
          return;
        }
      } catch {}
      resolve(src);
    };
    img.onerror = () => resolve(src);
    setTimeout(() => resolve(src), 3000);
    img.src = src;
  });
}

async function convertAllImages(container: HTMLElement): Promise<void> {
  const imgs = container.querySelectorAll("img");
  const promises = Array.from(imgs).map(async (img) => {
    if (img.src && !img.src.startsWith("data:")) {
      img.src = await imageToDataUri(img.src);
    }
  });
  await Promise.all(promises);
}

function generatePdfFromCanvas(canvas: HTMLCanvasElement, orientation: "p" | "l"): Blob {
  const imgWidth = orientation === "p" ? 210 : 297;
  const pageHeight = orientation === "p" ? 297 : 210;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const pdf = new jsPDF(orientation, "mm", "a4");
  const imgData = canvas.toDataURL("image/png");

  if (imgHeight <= pageHeight) {
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
  } else {
    let yOffset = 0;
    let page = 0;
    while (yOffset < imgHeight) {
      if (page > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, -yOffset, imgWidth, imgHeight);
      yOffset += pageHeight;
      page++;
    }
  }
  return pdf.output("blob") as unknown as Blob;
}

function collectFontCssRules(): string {
  const fontRules: string[] = [];
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (!rules) continue;
        for (const rule of Array.from(rules)) {
          if (rule instanceof CSSFontFaceRule) {
            fontRules.push(rule.cssText);
          }
        }
      } catch {}
    }
  } catch {}
  return fontRules.join("\n");
}

export async function captureElementAsPdf(
  element: HTMLElement,
  orientation: "p" | "l" = "p"
): Promise<Blob | null> {
  await ensureFontsLoaded();

  const dir = window.getComputedStyle(element).direction || "ltr";
  const fontFamily = element.style.fontFamily || FONT_FAMILY;
  const padding = element.style.padding || "0";
  const htmlContent = element.innerHTML;

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:fixed;left:0;top:0;z-index:99999;opacity:0;pointer-events:none;overflow:visible;";

  const container = document.createElement("div");
  container.style.cssText = `position:relative;width:${A4_WIDTH_PX}px;min-width:${A4_WIDTH_PX}px;max-width:${A4_WIDTH_PX}px;background:white;font-family:${fontFamily};direction:${dir};padding:${padding};overflow:visible;box-sizing:border-box;color:#000;`;
  container.innerHTML = htmlContent;

  const fontCss = collectFontCssRules();
  if (fontCss) {
    const styleEl = document.createElement("style");
    styleEl.textContent = fontCss;
    container.prepend(styleEl);
  }

  wrapper.appendChild(container);
  document.body.appendChild(wrapper);

  await convertAllImages(container);

  await new Promise(r => setTimeout(r, 400));

  try {
    const canvas = await toCanvas(container, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      width: A4_WIDTH_PX,
      cacheBust: true,
      includeQueryParams: true,
    });

    return generatePdfFromCanvas(canvas, orientation);
  } catch (err) {
    console.error("html-to-image failed, trying html2canvas:", err);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: A4_WIDTH_PX,
        windowWidth: A4_WIDTH_PX + 100,
        logging: false,
      });
      return generatePdfFromCanvas(canvas, orientation);
    } catch (err2) {
      console.error("html2canvas also failed:", err2);
      return null;
    }
  } finally {
    document.body.removeChild(wrapper);
  }
}

export async function captureHtmlAsPdf(
  htmlContent: string,
  isRtl: boolean = false,
  orientation: "p" | "l" = "p"
): Promise<Blob | null> {
  await ensureFontsLoaded();

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:fixed;left:0;top:0;z-index:99999;opacity:0;pointer-events:none;overflow:visible;";

  const tempDiv = document.createElement("div");
  tempDiv.style.cssText = `position:relative;width:${A4_WIDTH_PX}px;background:white;padding:20px 25px;box-sizing:border-box;font-size:10pt;font-family:${FONT_FAMILY};direction:${isRtl ? "rtl" : "ltr"};overflow:visible;color:#000;`;
  tempDiv.innerHTML = htmlContent;

  const fontCss = collectFontCssRules();
  if (fontCss) {
    const styleEl = document.createElement("style");
    styleEl.textContent = fontCss;
    tempDiv.prepend(styleEl);
  }

  wrapper.appendChild(tempDiv);
  document.body.appendChild(wrapper);

  await convertAllImages(tempDiv);

  await new Promise(resolve => setTimeout(resolve, 400));

  try {
    const canvas = await toCanvas(tempDiv, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      width: A4_WIDTH_PX,
      cacheBust: true,
      includeQueryParams: true,
    });

    return generatePdfFromCanvas(canvas, orientation);
  } catch (err) {
    console.error("html-to-image failed, trying html2canvas:", err);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: A4_WIDTH_PX,
        windowWidth: A4_WIDTH_PX + 100,
        logging: false,
      });
      return generatePdfFromCanvas(canvas, orientation);
    } catch (err2) {
      console.error("html2canvas also failed:", err2);
      return null;
    }
  } finally {
    document.body.removeChild(wrapper);
  }
}

export { FONT_FAMILY };
