/**
 * طباعة مباشرة عبر إطار (iframe) مخفي داخل نفس الصفحة — بدون فتح نافذة منبثقة.
 *
 * توحّد سلوك الطباعة لكل مستندات A4: لا تظهر نافذة جديدة، بل تُرسل المستند مباشرةً
 * إلى مربّع طباعة المتصفّح. وإذا كان المتصفّح في وضع الطباعة المباشرة (kiosk/direct
 * printing) فستتم الطباعة بصمت إلى الطابعة الافتراضية للجهاز دون أي مربّع حوار.
 *
 * المتصفّح لا يستطيع اختيار طابعة بالاسم؛ لذا اسم الطابعة في الإعدادات يُستخدم كمرجع
 * لكل جهاز، والطباعة الفعلية تذهب للطابعة الافتراضية للجهاز.
 */

import { printHtmlViaQz, printerNameFor, shouldTryQz, defaultQzOpts } from "./qz-print";
import type { PrinterKey, QzHtmlOpts } from "./qz-print";

export interface PrintDirectOptions {
  /** إزالة أي سكربت طباعة تلقائية مدمج في الـ HTML لتفادي الطباعة المزدوجة (افتراضي: true). */
  stripAutoPrintScripts?: boolean;
  /** عرض الـ iframe بالبكسل — استخدم مقاس الملصق (mm × 3.78) للملصقات الحرارية، وA4 (794) للتقارير. */
  iframeWidth?: number;
  /** ارتفاع الـ iframe بالبكسل. */
  iframeHeight?: number;
  /** أي طابعة مُهيّأة نستهدفها عبر QZ Tray: الفواتير الحرارية | التقارير A4 | الباركود. الافتراضي 'report'. */
  printerKey?: PrinterKey;
  /** إعدادات مقاس/هوامش QZ للطباعة الحرارية والملصقات (اختياري — يُشتق افتراضياً من نوع الطابعة). */
  qz?: QzHtmlOpts;
}

/** يزيل فقط كتل <script> التي تستدعي window.print / window.close / onafterprint. */
function stripAutoPrint(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (block) =>
    /window\s*\.\s*print|window\s*\.\s*close|onafterprint/i.test(block) ? "" : block
  );
}

/**
 * تكتب الـ HTML في iframe مخفي، تنتظر الخطوط والصور، ثم تطبع مرة واحدة وتنظّف الإطار.
 */
export function printHtmlDirect(html: string, opts: PrintDirectOptions = {}): void {
  const content = opts.stripAutoPrintScripts === false ? html : stripAutoPrint(html);

  /* التوجيه عبر QZ Tray أولاً: إن كان اسم الطابعة المناسب مُهيّأً في الإعدادات وأمكن
     الاتصال بـ QZ Tray، تُطبع الفاتورة/التقرير/الملصق مباشرةً وبصمت إلى تلك الطابعة.
     عند عدم توفّر QZ (غير مثبّت/غير مشغّل) أو فشل الطباعة نعود تلقائياً إلى طباعة
     المتصفّح عبر إطار مخفي — دون أي خطأ ظاهر. */
  const key: PrinterKey = opts.printerKey ?? "report";
  const printerName = printerNameFor(key);
  if (printerName && shouldTryQz()) {
    printHtmlViaQz(printerName, content, opts.qz ?? defaultQzOpts(key)).catch(() => {
      browserIframePrint(content, opts);
    });
    return;
  }
  browserIframePrint(content, opts);
}

/** الطباعة عبر إطار (iframe) مخفي في المتصفّح — المسار الاحتياطي عندما لا يتوفّر QZ Tray. */
function browserIframePrint(content: string, opts: PrintDirectOptions): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  /* المقاس الافتراضي = A4 (794×1123px @ 96dpi). للملصقات الحرارية يُمرَّر مقاس الملصق
     بالبكسل (mm × 3.78) حتى يُخطط المتصفّح المحتوى بنفس عرض الطباعة الفعلي ويحترم @page size.
     (لا display:none — تكسر الطباعة في بعض المتصفّحات/الآيباد). */
  const fw = opts.iframeWidth  ?? 794;
  const fh = opts.iframeHeight ?? 1123;
  iframe.style.cssText =
    `position:fixed;right:0;bottom:0;width:${fw}px;height:${fh}px;opacity:0;pointer-events:none;border:0;z-index:-1;`;
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument || win?.document;
  if (!win || !doc) {
    try { iframe.remove(); } catch { /* noop */ }
    return;
  }

  doc.open();
  doc.write(content);
  doc.close();

  /* المتصفّح يستعمل عنوان الصفحة الأمّ (عنوان التبويب = اسم المحل) ورابطها كترويسة/تذييل
     عند طباعة الإطار. نُفرّغ العنوان مؤقتاً أثناء الطباعة فلا يُطبع اسم المحل في الأعلى،
     ونُعيده بعد الانتهاء. (التاريخ/الرابط يبقيان متعلّقين بإعداد الهوامش في المتصفّح/الطابعة.) */
  const prevTitle = document.title;
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    try { document.title = prevTitle; } catch { /* noop */ }
    setTimeout(() => {
      try { iframe.remove(); } catch { /* noop */ }
    }, 500);
  };

  const fire = () => {
    const imgs = Array.from(doc.images);
    const imgsReady = Promise.all(
      imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((res) => {
              img.onload = img.onerror = () => res();
            })
      )
    );
    const fontsReady =
      (doc as Document & { fonts?: FontFaceSet }).fonts?.ready ?? Promise.resolve();
    Promise.all([fontsReady, imgsReady]).then(() => {
      setTimeout(() => {
        try {
          document.title = "";
          win.focus();
          win.onafterprint = cleanup;
          win.print();
        } catch { /* noop */ }
        /* احتياط في حال عدم إطلاق afterprint */
        setTimeout(cleanup, 60000);
      }, 150);
    });
  };

  if (doc.readyState === "complete") fire();
  else iframe.onload = fire;
}
