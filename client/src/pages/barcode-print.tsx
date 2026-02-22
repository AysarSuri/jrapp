import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import JsBarcode from "jsbarcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Printer, QrCode, Plus, Trash2, Settings2, Eye, Search } from "lucide-react";

type Product = {
  id: number;
  barcode: string;
  name: string;
  category: string;
  bigUnit: string;
  smallUnit: string;
  bigUnitPriceUsd: string;
  bigUnitPriceIqd: string;
  smallUnitPriceUsd: string;
  smallUnitPriceIqd: string;
  conversionFactor: number;
};

interface LabelItem {
  product: Product;
  quantity: number;
  priceType: "big_usd" | "big_iqd" | "small_usd" | "small_iqd";
}

interface LabelSettings {
  labelWidth: number;
  labelHeight: number;
  columns: number;
  marginX: number;
  marginY: number;
  barcodeType: string;
  showProductName: boolean;
  showPrice: boolean;
  showBarcode: boolean;
  showBarcodeText: boolean;
  fontSize: number;
  barcodeWidth: number;
  barcodeHeight: number;
  pageSize: string;
}

const defaultSettings: LabelSettings = {
  labelWidth: 50,
  labelHeight: 30,
  columns: 4,
  marginX: 2,
  marginY: 2,
  barcodeType: "CODE128",
  showProductName: true,
  showPrice: true,
  showBarcode: true,
  showBarcodeText: true,
  fontSize: 10,
  barcodeWidth: 1.5,
  barcodeHeight: 40,
  pageSize: "A4",
};

function BarcodeCanvas({ value, format, width, height, displayValue }: {
  value: string; format: string; width: number; height: number; displayValue: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format,
          width,
          height,
          displayValue,
          margin: 0,
          fontSize: 10,
          textMargin: 2,
        });
      } catch {
        if (svgRef.current) {
          svgRef.current.innerHTML = `<text x="5" y="15" font-size="10" fill="red">Invalid</text>`;
        }
      }
    }
  }, [value, format, width, height, displayValue]);

  return <svg ref={svgRef} />;
}

function getPrice(product: Product, priceType: string): string {
  switch (priceType) {
    case "big_usd": return `$${product.bigUnitPriceUsd}`;
    case "big_iqd": return `${Number(product.bigUnitPriceIqd).toLocaleString()} IQD`;
    case "small_usd": return `$${product.smallUnitPriceUsd}`;
    case "small_iqd": return `${Number(product.smallUnitPriceIqd).toLocaleString()} IQD`;
    default: return "";
  }
}

export default function BarcodePrintPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<LabelItem[]>([]);
  const [settings, setSettings] = useState<LabelSettings>(defaultSettings);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: productsList } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const allProducts = productsList || [];
  const filteredProducts = searchQuery.length >= 1
    ? allProducts.filter(p =>
        p.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const addProduct = useCallback((product: Product) => {
    const exists = items.find(i => i.product.id === product.id);
    if (exists) {
      setItems(prev => prev.map(i =>
        i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setItems(prev => [...prev, { product, quantity: 1, priceType: "small_usd" }]);
    }
    setSearchQuery("");
  }, [items]);

  const removeItem = (productId: number) => {
    setItems(prev => prev.filter(i => i.product.id !== productId));
  };

  const updateQuantity = (productId: number, qty: number) => {
    if (qty < 1) return;
    setItems(prev => prev.map(i =>
      i.product.id === productId ? { ...i, quantity: qty } : i
    ));
  };

  const updatePriceType = (productId: number, priceType: LabelItem["priceType"]) => {
    setItems(prev => prev.map(i =>
      i.product.id === productId ? { ...i, priceType } : i
    ));
  };

  const totalLabels = items.reduce((s, i) => s + i.quantity, 0);

  const handlePrint = () => {
    setShowPreview(true);
    setTimeout(() => {
      const content = printRef.current;
      if (!content) return;

      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      const pageSizes: Record<string, string> = {
        A4: "210mm 297mm",
        A5: "148mm 210mm",
        Letter: "216mm 279mm",
      };

      printWindow.document.write(`<!DOCTYPE html>
        <html><head><title>${t('Barcode Print')}</title>
        <style>
          @page { size: ${pageSizes[settings.pageSize] || "210mm 297mm"}; margin: 5mm; }
          body { margin: 0; padding: 0; }
          .labels-grid {
            display: flex;
            flex-wrap: wrap;
            gap: ${settings.marginY}mm ${settings.marginX}mm;
          }
          .label-cell {
            width: ${settings.labelWidth}mm;
            height: ${settings.labelHeight}mm;
            border: 0.5px dashed #ccc;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            padding: 1mm;
            box-sizing: border-box;
            page-break-inside: avoid;
          }
          .label-name {
            font-size: ${settings.fontSize}px;
            font-weight: 600;
            text-align: center;
            line-height: 1.1;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .label-price {
            font-size: ${Math.max(settings.fontSize - 1, 7)}px;
            font-weight: 500;
            text-align: center;
            margin-top: 0.5mm;
          }
          .label-barcode { margin-top: 0.5mm; }
          .label-barcode svg { max-width: ${settings.labelWidth - 4}mm; height: auto; }
          @media print { .label-cell { border: none; } }
        </style>
        </head><body>`);

      printWindow.document.write(content.innerHTML);
      printWindow.document.write("</body></html>");
      printWindow.document.close();

      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    }, 300);
  };

  const allLabels: { product: Product; priceType: LabelItem["priceType"] }[] = [];
  items.forEach(item => {
    for (let i = 0; i < item.quantity; i++) {
      allLabels.push({ product: item.product, priceType: item.priceType });
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <QrCode className="w-7 h-7" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t('Barcode Print')}</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            data-testid="button-toggle-settings"
          >
            <Settings2 className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
            {t('Print Settings')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            data-testid="button-toggle-preview"
          >
            <Eye className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
            {t('Preview')}
          </Button>
          <Button
            size="sm"
            disabled={items.length === 0}
            onClick={handlePrint}
            data-testid="button-print"
          >
            <Printer className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
            {t('Print')} ({totalLabels})
          </Button>
        </div>
      </div>

      {showSettings && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              {t('Print Settings')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('Page Size')}</Label>
                <Select
                  value={settings.pageSize}
                  onValueChange={v => setSettings(s => ({ ...s, pageSize: v }))}
                >
                  <SelectTrigger data-testid="select-page-size"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4</SelectItem>
                    <SelectItem value="A5">A5</SelectItem>
                    <SelectItem value="Letter">Letter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('Label Width')} (mm)</Label>
                <Input
                  type="number"
                  value={settings.labelWidth}
                  onChange={e => setSettings(s => ({ ...s, labelWidth: Number(e.target.value) || 50 }))}
                  data-testid="input-label-width"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('Label Height')} (mm)</Label>
                <Input
                  type="number"
                  value={settings.labelHeight}
                  onChange={e => setSettings(s => ({ ...s, labelHeight: Number(e.target.value) || 30 }))}
                  data-testid="input-label-height"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('Columns')}</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={settings.columns}
                  onChange={e => setSettings(s => ({ ...s, columns: Math.min(10, Math.max(1, Number(e.target.value) || 4)) }))}
                  data-testid="input-columns"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('Gap X')} (mm)</Label>
                <Input
                  type="number"
                  value={settings.marginX}
                  onChange={e => setSettings(s => ({ ...s, marginX: Number(e.target.value) || 0 }))}
                  data-testid="input-gap-x"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('Gap Y')} (mm)</Label>
                <Input
                  type="number"
                  value={settings.marginY}
                  onChange={e => setSettings(s => ({ ...s, marginY: Number(e.target.value) || 0 }))}
                  data-testid="input-gap-y"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('Barcode Type')}</Label>
                <Select
                  value={settings.barcodeType}
                  onValueChange={v => setSettings(s => ({ ...s, barcodeType: v }))}
                >
                  <SelectTrigger data-testid="select-barcode-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CODE128">CODE 128</SelectItem>
                    <SelectItem value="EAN13">EAN-13</SelectItem>
                    <SelectItem value="EAN8">EAN-8</SelectItem>
                    <SelectItem value="UPC">UPC</SelectItem>
                    <SelectItem value="CODE39">CODE 39</SelectItem>
                    <SelectItem value="ITF14">ITF-14</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('Barcode Line Width')}</Label>
                <Input
                  type="number"
                  step="0.1"
                  min={0.5}
                  max={4}
                  value={settings.barcodeWidth}
                  onChange={e => setSettings(s => ({ ...s, barcodeWidth: Number(e.target.value) || 1.5 }))}
                  data-testid="input-barcode-width"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('Barcode Height')} (px)</Label>
                <Input
                  type="number"
                  min={20}
                  max={100}
                  value={settings.barcodeHeight}
                  onChange={e => setSettings(s => ({ ...s, barcodeHeight: Number(e.target.value) || 40 }))}
                  data-testid="input-barcode-height"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('Font Size')} (px)</Label>
                <Input
                  type="number"
                  min={6}
                  max={24}
                  value={settings.fontSize}
                  onChange={e => setSettings(s => ({ ...s, fontSize: Number(e.target.value) || 10 }))}
                  data-testid="input-font-size"
                />
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showProductName"
                  checked={settings.showProductName}
                  onCheckedChange={c => setSettings(s => ({ ...s, showProductName: !!c }))}
                  data-testid="checkbox-show-name"
                />
                <Label htmlFor="showProductName" className="text-sm cursor-pointer">{t('Show Product Name')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showPrice"
                  checked={settings.showPrice}
                  onCheckedChange={c => setSettings(s => ({ ...s, showPrice: !!c }))}
                  data-testid="checkbox-show-price"
                />
                <Label htmlFor="showPrice" className="text-sm cursor-pointer">{t('Show Price')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showBarcode"
                  checked={settings.showBarcode}
                  onCheckedChange={c => setSettings(s => ({ ...s, showBarcode: !!c }))}
                  data-testid="checkbox-show-barcode"
                />
                <Label htmlFor="showBarcode" className="text-sm cursor-pointer">{t('Show Barcode')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showBarcodeText"
                  checked={settings.showBarcodeText}
                  onCheckedChange={c => setSettings(s => ({ ...s, showBarcodeText: !!c }))}
                  data-testid="checkbox-show-barcode-text"
                />
                <Label htmlFor="showBarcodeText" className="text-sm cursor-pointer">{t('Show Barcode Number')}</Label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('Select Products')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t('Search by code or name...')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              data-testid="input-search-product"
            />
            {filteredProducts.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredProducts.slice(0, 10).map(p => (
                  <button
                    key={p.id}
                    className="w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors hover:bg-muted"
                    onClick={() => addProduct(p)}
                    data-testid={`button-add-product-${p.id}`}
                  >
                    <span className="font-medium truncate">{p.name}</span>
                    <span className="text-xs text-muted-foreground font-mono shrink-0">{p.barcode}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {t('Search and add products to generate barcode labels')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>{t('Product Code')}</TableHead>
                    <TableHead>{t('Product Name')}</TableHead>
                    <TableHead className="text-center">{t('Price Display')}</TableHead>
                    <TableHead className="text-center w-24">{t('Quantity')}</TableHead>
                    <TableHead className="text-center w-16">{t('Preview')}</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={item.product.id} data-testid={`row-item-${item.product.id}`}>
                      <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                      <TableCell className="font-mono text-sm">{item.product.barcode}</TableCell>
                      <TableCell className="font-medium">{item.product.name}</TableCell>
                      <TableCell className="text-center">
                        <Select
                          value={item.priceType}
                          onValueChange={v => updatePriceType(item.product.id, v as LabelItem["priceType"])}
                        >
                          <SelectTrigger className="w-40 mx-auto" data-testid={`select-price-${item.product.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="big_usd">{t('Big Unit')} USD</SelectItem>
                            <SelectItem value="big_iqd">{t('Big Unit')} IQD</SelectItem>
                            <SelectItem value="small_usd">{t('Small Unit')} USD</SelectItem>
                            <SelectItem value="small_iqd">{t('Small Unit')} IQD</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={e => updateQuantity(item.product.id, parseInt(e.target.value) || 1)}
                          className="w-20 mx-auto text-center"
                          data-testid={`input-qty-${item.product.id}`}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <BarcodeCanvas
                            value={item.product.barcode}
                            format={settings.barcodeType}
                            width={1}
                            height={25}
                            displayValue={false}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.product.id)}
                          data-testid={`button-remove-${item.product.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {showPreview && items.length > 0 && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                {t('Print Preview')} — {totalLabels} {t('Labels')}
              </div>
              <Button size="sm" onClick={handlePrint} data-testid="button-print-preview">
                <Printer className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                {t('Print')}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white dark:bg-white rounded-md p-4 overflow-auto max-h-[600px]" style={{ color: "#000" }}>
              <div
                ref={printRef}
                className="labels-grid"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: `${settings.marginY}mm ${settings.marginX}mm`,
                }}
              >
                {allLabels.map((label, i) => (
                  <div
                    key={i}
                    className="label-cell"
                    style={{
                      width: `${settings.labelWidth}mm`,
                      height: `${settings.labelHeight}mm`,
                      border: "0.5px dashed #ccc",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      padding: "1mm",
                      boxSizing: "border-box",
                    }}
                  >
                    {settings.showProductName && (
                      <div style={{
                        fontSize: `${settings.fontSize}px`,
                        fontWeight: 600,
                        textAlign: "center",
                        lineHeight: 1.1,
                        maxWidth: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: "#000",
                      }}>
                        {label.product.name}
                      </div>
                    )}
                    {settings.showPrice && (
                      <div style={{
                        fontSize: `${Math.max(settings.fontSize - 1, 7)}px`,
                        fontWeight: 500,
                        textAlign: "center",
                        marginTop: "0.5mm",
                        color: "#000",
                      }}>
                        {getPrice(label.product, label.priceType)}
                      </div>
                    )}
                    {settings.showBarcode && (
                      <div style={{ marginTop: "0.5mm" }}>
                        <BarcodeCanvas
                          value={label.product.barcode}
                          format={settings.barcodeType}
                          width={settings.barcodeWidth}
                          height={settings.barcodeHeight}
                          displayValue={settings.showBarcodeText}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
