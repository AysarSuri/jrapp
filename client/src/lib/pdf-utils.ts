import html2canvas from "html2canvas";
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

function copyComputedStyles(source: HTMLElement, target: HTMLElement) {
  const computed = window.getComputedStyle(source);
  for (let i = 0; i < computed.length; i++) {
    const prop = computed[i];
    try {
      (target.style as any)[prop] = computed.getPropertyValue(prop);
    } catch {}
  }
}

async function waitForImages(container: HTMLElement, timeout = 3000): Promise<void> {
  const imgs = container.querySelectorAll("img");
  if (imgs.length === 0) return;

  const promises = Array.from(imgs).map(img => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, timeout);
      img.onload = () => { clearTimeout(timer); resolve(); };
      img.onerror = () => { clearTimeout(timer); resolve(); };
    });
  });
  await Promise.all(promises);
}

export async function captureElementAsPdf(
  element: HTMLElement,
  orientation: "p" | "l" = "p"
): Promise<Blob | null> {
  await ensureFontsLoaded();

  const clone = element.cloneNode(true) as HTMLElement;

  clone.style.cssText = `position:fixed;left:-10000px;top:0;width:${A4_WIDTH_PX}px;min-width:${A4_WIDTH_PX}px;max-width:${A4_WIDTH_PX}px;background:white;z-index:-9999;overflow:visible;font-family:${FONT_FAMILY};`;

  const dir = window.getComputedStyle(element).direction;
  if (dir) clone.style.direction = dir;

  const origPadding = element.style.padding;
  if (origPadding) clone.style.padding = origPadding;

  const origFontFamily = element.style.fontFamily;
  if (origFontFamily) clone.style.fontFamily = origFontFamily;

  document.body.appendChild(clone);

  await waitForImages(clone);
  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: A4_WIDTH_PX,
      windowWidth: A4_WIDTH_PX,
    });

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

    return pdf.output("blob");
  } finally {
    document.body.removeChild(clone);
  }
}

export async function captureHtmlAsPdf(
  htmlContent: string,
  isRtl: boolean = false,
  orientation: "p" | "l" = "p"
): Promise<Blob | null> {
  await ensureFontsLoaded();

  const tempDiv = document.createElement("div");
  tempDiv.style.cssText = `position:fixed;left:-10000px;top:0;width:${A4_WIDTH_PX}px;background:white;padding:20px 25px;box-sizing:border-box;font-size:10pt;font-family:${FONT_FAMILY};direction:${isRtl ? "rtl" : "ltr"};overflow:visible;z-index:-9999;`;
  tempDiv.innerHTML = htmlContent;
  document.body.appendChild(tempDiv);

  await waitForImages(tempDiv);
  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: A4_WIDTH_PX,
      windowWidth: A4_WIDTH_PX,
    });

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

    return pdf.output("blob");
  } finally {
    document.body.removeChild(tempDiv);
  }
}

export { FONT_FAMILY };
