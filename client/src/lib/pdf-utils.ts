import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const FONT_FAMILY = "'Tajawal','Segoe UI',sans-serif";

const A4_WIDTH_PX = 794;

async function ensureFontsLoaded(): Promise<void> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  const testChars = "پچڤگڵڕێۆژ فاتورة مبيعات فرۆشتن لیستی حسابی دۆلار";
  const fontFaces = [
    '400 16px "Tajawal"',
    '700 16px "Tajawal"',
    '400 16px "Tajawal"',
    '700 16px "Tajawal"',
  ];
  try {
    await Promise.all(fontFaces.map(f => document.fonts.load(f, testChars).catch(() => {})));
    await document.fonts.ready;
  } catch {}
  await new Promise(resolve => setTimeout(resolve, 150));
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

function removeOverflowConstraints(element: HTMLElement) {
  const saved: Array<{ el: HTMLElement; styles: Record<string, string> }> = [];
  let parent = element.parentElement;
  while (parent && parent !== document.body) {
    const cs = getComputedStyle(parent);
    if (cs.overflow !== "visible" || cs.overflowX !== "visible" || cs.overflowY !== "visible" || cs.clipPath !== "none") {
      saved.push({
        el: parent,
        styles: {
          overflow: parent.style.overflow,
          overflowX: parent.style.overflowX,
          overflowY: parent.style.overflowY,
          maxHeight: parent.style.maxHeight,
          clipPath: parent.style.clipPath,
        },
      });
      parent.style.overflow = "visible";
      parent.style.overflowX = "visible";
      parent.style.overflowY = "visible";
      parent.style.maxHeight = "none";
      parent.style.clipPath = "none";
    }
    parent = parent.parentElement;
  }
  return saved;
}

function restoreOverflowConstraints(saved: Array<{ el: HTMLElement; styles: Record<string, string> }>) {
  saved.forEach(({ el, styles }) => {
    Object.entries(styles).forEach(([k, v]) => {
      (el.style as any)[k] = v;
    });
  });
}

function svgToPngDataUri(svg: SVGElement): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const svgClone = svg.cloneNode(true) as SVGElement;
      if (!svgClone.getAttribute("xmlns")) {
        svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      }
      const w = parseInt(svg.getAttribute("width") || "16") || 16;
      const h = parseInt(svg.getAttribute("height") || "16") || 16;
      const svgStr = new XMLSerializer().serializeToString(svgClone);
      const svgDataUri = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
      const scale = 3;

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = w * scale;
          canvas.height = h * scale;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, w * scale, h * scale);
            resolve(canvas.toDataURL("image/png"));
            return;
          }
        } catch {}
        resolve(null);
      };
      img.onerror = () => resolve(null);
      setTimeout(() => resolve(null), 2000);
      img.src = svgDataUri;
    } catch {
      resolve(null);
    }
  });
}

async function replaceSvgsWithImages(container: HTMLElement): Promise<Array<{ img: HTMLImageElement; svg: SVGElement; parent: Node }>> {
  const svgs = Array.from(container.querySelectorAll("svg"));
  const replacements: Array<{ img: HTMLImageElement; svg: SVGElement; parent: Node }> = [];

  const promises = svgs.map(async (svg) => {
    const parent = svg.parentNode;
    if (!parent) return;

    const pngUri = await svgToPngDataUri(svg);
    if (pngUri) {
      const img = document.createElement("img");
      img.src = pngUri;
      const w = svg.getAttribute("width") || "16";
      const h = svg.getAttribute("height") || "16";
      img.style.width = w + (w.includes("px") || w.includes("%") ? "" : "px");
      img.style.height = h + (h.includes("px") || h.includes("%") ? "" : "px");
      img.style.display = "inline-block";
      img.style.verticalAlign = "middle";
      img.style.flexShrink = "0";
      parent.replaceChild(img, svg);
      replacements.push({ img, svg, parent });
    }
  });
  await Promise.all(promises);
  return replacements;
}

function restoreSvgs(replacements: Array<{ img: HTMLImageElement; svg: SVGElement; parent: Node }>) {
  replacements.forEach(({ img, svg, parent }) => {
    try {
      parent.replaceChild(svg, img);
    } catch {}
  });
}

export async function captureElementAsPdf(
  element: HTMLElement,
  orientation: "p" | "l" = "p"
): Promise<Blob | null> {
  await ensureFontsLoaded();

  const overflowSaved = removeOverflowConstraints(element);
  const svgReplacements = await replaceSvgsWithImages(element);

  await new Promise(r => setTimeout(r, 300));

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: element.scrollWidth || A4_WIDTH_PX,
      windowWidth: Math.max(element.scrollWidth || A4_WIDTH_PX, A4_WIDTH_PX) + 100,
      logging: false,
      imageTimeout: 10000,
    });

    return generatePdfFromCanvas(canvas, orientation);
  } catch (err) {
    console.error("PDF capture error:", err);
    return null;
  } finally {
    restoreSvgs(svgReplacements);
    restoreOverflowConstraints(overflowSaved);
  }
}

async function imageToDataUri(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth || 200;
        c.height = img.naturalHeight || 200;
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
    setTimeout(() => resolve(src), 5000);
    img.src = src;
  });
}

export async function captureHtmlAsPdf(
  htmlContent: string,
  isRtl: boolean = false,
  orientation: "p" | "l" = "p"
): Promise<Blob | null> {
  await ensureFontsLoaded();

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:absolute;left:-9999px;top:0;z-index:-1;overflow:visible;";

  const tempDiv = document.createElement("div");
  tempDiv.style.cssText = `position:relative;width:${A4_WIDTH_PX}px;background:white;padding:20px 25px;box-sizing:border-box;font-size:10pt;font-family:${FONT_FAMILY};direction:${isRtl ? "rtl" : "ltr"};overflow:visible;color:#000;`;
  tempDiv.innerHTML = htmlContent;

  wrapper.appendChild(tempDiv);
  document.body.appendChild(wrapper);

  const imgs = tempDiv.querySelectorAll("img");
  const imgPromises = Array.from(imgs).map(async (img) => {
    if (img.src && !img.src.startsWith("data:")) {
      const dataUri = await imageToDataUri(img.src);
      if (dataUri.startsWith("data:")) img.src = dataUri;
    }
  });
  await Promise.all(imgPromises);

  const svgReplacements = await replaceSvgsWithImages(tempDiv);

  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: A4_WIDTH_PX,
      windowWidth: A4_WIDTH_PX + 100,
      logging: false,
      imageTimeout: 10000,
    });

    return generatePdfFromCanvas(canvas, orientation);
  } finally {
    document.body.removeChild(wrapper);
  }
}

export { FONT_FAMILY };
