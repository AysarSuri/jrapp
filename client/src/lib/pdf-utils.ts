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

async function convertAllImages(container: HTMLElement): Promise<void> {
  const imgs = container.querySelectorAll("img");
  const promises = Array.from(imgs).map(async (img) => {
    if (img.src && !img.src.startsWith("data:")) {
      const dataUri = await imageToDataUri(img.src);
      if (dataUri.startsWith("data:")) {
        img.src = dataUri;
      }
    }
  });
  await Promise.all(promises);
}

async function waitForImages(container: HTMLElement, timeout = 5000): Promise<void> {
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

function svgToPngDataUri(svg: SVGElement): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const svgClone = svg.cloneNode(true) as SVGElement;
      if (!svgClone.getAttribute("xmlns")) {
        svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      }
      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svgClone);
      const svgDataUri = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);

      const w = parseInt(svg.getAttribute("width") || "16") || 16;
      const h = parseInt(svg.getAttribute("height") || "16") || 16;
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

async function convertSvgsToImages(container: HTMLElement): Promise<void> {
  const svgs = Array.from(container.querySelectorAll("svg"));
  const promises = svgs.map(async (svg) => {
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
      svg.parentNode?.replaceChild(img, svg);
    } else {
      svg.remove();
    }
  });
  await Promise.all(promises);
}

function wrapTextNodes(container: HTMLElement): void {
  const allElements = container.querySelectorAll("*");
  allElements.forEach(el => {
    if (!(el instanceof HTMLElement)) return;
    const display = el.style.display;
    if (display !== "flex" && display !== "inline-flex") return;

    const childNodes = Array.from(el.childNodes);
    childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent && node.textContent.trim()) {
        const span = document.createElement("span");
        span.textContent = node.textContent;
        el.replaceChild(span, node);
      }
    });
  });
}

function replaceFlexWithCompatible(container: HTMLElement): void {
  wrapTextNodes(container);
  const elements = Array.from(container.querySelectorAll("*")).reverse();
  elements.forEach(el => {
    if (!(el instanceof HTMLElement)) return;
    const display = el.style.display;
    if (display !== "flex" && display !== "inline-flex") return;

    const flexDir = el.style.flexDirection;
    const gap = el.style.gap;
    const jc = el.style.justifyContent;
    const ai = el.style.alignItems;
    const flexWrap = el.style.flexWrap;

    const gapPx = gap ? parseInt(gap) || 0 : 0;

    const children = Array.from(el.children).filter(c => c instanceof HTMLElement) as HTMLElement[];

    if (flexDir === "column") {
      el.style.display = "block";
      el.style.flexWrap = "";
      el.style.flexDirection = "";
      el.style.gap = "";
      el.style.alignItems = "";
      el.style.justifyContent = "";
      if (gapPx > 0) {
        children.forEach((child, idx) => {
          if (idx > 0) child.style.marginTop = gapPx + "px";
        });
      }
      return;
    }

    const hasWidthPercent = children.some(c => c.style.width && c.style.width.includes("%"));
    const hasFlexOne = children.some(c => c.style.flex === "1" || c.style.flex?.startsWith("1 "));
    const hasFlexShrink = children.some(c => c.style.flexShrink === "0");
    const hasMarginAutoChild = children.some(c => c.style.marginLeft === "auto" || c.style.marginRight === "auto");

    if (display === "inline-flex") {
      el.style.display = "inline-block";
      el.style.gap = "";
      el.style.flexWrap = "";
      el.style.justifyContent = "";
      el.style.alignItems = "";
      el.style.whiteSpace = "nowrap";
      children.forEach((child, idx) => {
        child.style.display = "inline-block";
        child.style.verticalAlign = ai === "center" ? "middle" : "top";
        if (gapPx > 0 && idx > 0) {
          child.style.marginLeft = gapPx + "px";
        }
      });
      return;
    }

    if (hasMarginAutoChild) {
      el.style.display = "table";
      el.style.width = "100%";
      el.style.tableLayout = "auto";
      el.style.borderCollapse = "separate";
      el.style.borderSpacing = gapPx > 0 ? `${gapPx}px 0` : "0";
      el.style.flexWrap = "";
      el.style.gap = "";
      el.style.justifyContent = "";
      el.style.alignItems = "";

      const row = document.createElement("div");
      row.style.display = "table-row";

      children.forEach((child) => {
        child.style.display = "table-cell";
        child.style.verticalAlign = ai === "center" ? "middle" : "top";
        child.style.whiteSpace = "nowrap";
        if (child.style.marginLeft === "auto") {
          child.style.marginLeft = "";
          child.style.textAlign = "left";
          child.style.width = "99%";
          child.style.paddingLeft = gapPx > 0 ? gapPx + "px" : "";
        } else if (child.style.marginRight === "auto") {
          child.style.marginRight = "";
          child.style.width = "99%";
        }
      });
      return;
    }

    if (jc === "space-between") {
      el.style.display = "table";
      el.style.width = "100%";
      el.style.tableLayout = "auto";
      el.style.borderCollapse = "separate";
      el.style.borderSpacing = gapPx > 0 ? `${gapPx}px 0` : "0";
      el.style.flexWrap = "";
      el.style.gap = "";
      el.style.justifyContent = "";
      el.style.alignItems = "";

      children.forEach((child, idx) => {
        child.style.display = "table-cell";
        child.style.verticalAlign = ai === "center" ? "middle" : "top";
        child.style.whiteSpace = "nowrap";
        if (idx === children.length - 1) {
          child.style.textAlign = "left";
        }
      });
      return;
    }

    if (jc === "center" && !hasFlexOne && !hasWidthPercent) {
      el.style.display = "block";
      el.style.textAlign = "center";
      el.style.gap = "";
      el.style.flexWrap = "";
      el.style.justifyContent = "";
      el.style.alignItems = "";
      children.forEach((child, idx) => {
        child.style.display = "inline-block";
        child.style.verticalAlign = ai === "center" ? "middle" : "top";
        if (gapPx > 0 && idx > 0) {
          child.style.marginLeft = gapPx + "px";
        }
      });
      return;
    }

    if (flexWrap === "wrap" || hasWidthPercent) {
      el.style.display = "block";
      el.style.flexWrap = "";
      el.style.gap = "";
      el.style.justifyContent = "";
      el.style.alignItems = "";
      el.style.overflow = "hidden";
      children.forEach((child) => {
        const existingWidth = child.style.width;
        if (existingWidth && existingWidth.includes("%")) {
          child.style.display = "inline-block";
          child.style.verticalAlign = "top";
          child.style.boxSizing = "border-box";
          child.style.cssFloat = "left";
        } else {
          child.style.display = "block";
          child.style.width = "100%";
          child.style.boxSizing = "border-box";
          child.style.clear = "both";
        }
      });
      const clearDiv = document.createElement("div");
      clearDiv.style.clear = "both";
      el.appendChild(clearDiv);
      return;
    }

    if (hasFlexOne) {
      el.style.display = "table";
      el.style.width = "100%";
      el.style.tableLayout = "fixed";
      el.style.borderCollapse = "separate";
      el.style.borderSpacing = gapPx > 0 ? `${gapPx}px 0` : "0";
      el.style.flexWrap = "";
      el.style.gap = "";
      el.style.justifyContent = "";
      el.style.alignItems = "";

      children.forEach((child) => {
        child.style.display = "table-cell";
        child.style.verticalAlign = ai === "center" ? "middle" : (ai === "flex-end" ? "bottom" : "top");
        child.style.boxSizing = "border-box";
        if (child.style.flex === "1" || child.style.flex?.startsWith("1 ")) {
          child.style.flex = "";
        }
        if (child.style.minWidth === "0" || child.style.minWidth === "0px") {
          child.style.minWidth = "";
        }
        if (child.style.flexShrink) {
          child.style.flexShrink = "";
        }
      });
      return;
    }

    if (hasFlexShrink) {
      el.style.display = "table";
      el.style.width = "100%";
      el.style.tableLayout = "auto";
      el.style.borderCollapse = "separate";
      el.style.borderSpacing = gapPx > 0 ? `${gapPx}px 0` : "0";
      el.style.flexWrap = "";
      el.style.gap = "";
      el.style.justifyContent = "";
      el.style.alignItems = "";

      children.forEach((child) => {
        child.style.display = "table-cell";
        child.style.verticalAlign = ai === "center" ? "middle" : "top";
        child.style.boxSizing = "border-box";
        if (child.style.flexShrink === "0") {
          child.style.whiteSpace = "nowrap";
          child.style.width = "1%";
        }
        child.style.flexShrink = "";
      });
      return;
    }

    el.style.display = "block";
    el.style.overflow = "hidden";
    el.style.flexWrap = "";
    el.style.gap = "";
    el.style.justifyContent = "";
    el.style.alignItems = "";
    children.forEach((child, idx) => {
      child.style.display = "inline-block";
      child.style.verticalAlign = ai === "center" ? "middle" : "top";
      if (gapPx > 0 && idx > 0) {
        child.style.marginLeft = gapPx + "px";
      }
    });
  });
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
  wrapper.style.cssText = "position:absolute;left:-9999px;top:0;z-index:-1;overflow:visible;";

  const container = document.createElement("div");
  container.style.cssText = `position:relative;width:${A4_WIDTH_PX}px;min-width:${A4_WIDTH_PX}px;max-width:${A4_WIDTH_PX}px;background:white;font-family:${fontFamily};direction:${dir};padding:${padding};overflow:visible;box-sizing:border-box;color:#000;`;
  container.innerHTML = htmlContent;

  wrapper.appendChild(container);
  document.body.appendChild(wrapper);

  await convertAllImages(container);
  await convertSvgsToImages(container);
  await waitForImages(container);

  replaceFlexWithCompatible(container);

  await new Promise(r => setTimeout(r, 500));

  try {
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
  } catch (err) {
    console.error("PDF capture error:", err);
    return null;
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
  wrapper.style.cssText = "position:absolute;left:-9999px;top:0;z-index:-1;overflow:visible;";

  const tempDiv = document.createElement("div");
  tempDiv.style.cssText = `position:relative;width:${A4_WIDTH_PX}px;background:white;padding:20px 25px;box-sizing:border-box;font-size:10pt;font-family:${FONT_FAMILY};direction:${isRtl ? "rtl" : "ltr"};overflow:visible;color:#000;`;
  tempDiv.innerHTML = htmlContent;

  wrapper.appendChild(tempDiv);
  document.body.appendChild(wrapper);

  await convertAllImages(tempDiv);
  await convertSvgsToImages(tempDiv);
  await waitForImages(tempDiv);

  replaceFlexWithCompatible(tempDiv);

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
    });

    return generatePdfFromCanvas(canvas, orientation);
  } finally {
    document.body.removeChild(wrapper);
  }
}

export { FONT_FAMILY };
