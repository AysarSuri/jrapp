import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { warehouses } from "@shared/schema";
type Warehouse = typeof warehouses.$inferSelect;
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ClipboardList, Search } from "lucide-react";

interface ReportRow {
  productId: number;
  productCode: string;
  productName: string;
  category: string;
  bigUnit: string;
  smallUnit: string;
  conversionFactor: number;
  purchased: number;
  sold: number;
  purchaseReturned: number;
  salesReturned: number;
  damaged: number;
  transferIn: number;
  transferOut: number;
  netSmallUnits: number;
  bigQty: number;
  smallQty: number;
  purchasedBig: number;
  purchasedRemainder: number;
  soldBig: number;
  soldRemainder: number;
  purchaseReturnedBig: number;
  purchaseReturnedRemainder: number;
  salesReturnedBig: number;
  salesReturnedRemainder: number;
  damagedBig: number;
  damagedRemainder: number;
  transferInBig: number;
  transferInRemainder: number;
  transferOutBig: number;
  transferOutRemainder: number;
}

function formatUnit(big: number, remainder: number, bigUnit: string, smallUnit: string) {
  const parts: string[] = [];
  if (big > 0) parts.push(`${big} ${bigUnit}`);
  if (remainder > 0) parts.push(`${remainder} ${smallUnit}`);
  if (parts.length === 0) return "0";
  return parts.join(" + ");
}

export default function InventoryReportPage() {
  const { t } = useTranslation();
  const [warehouseId, setWarehouseId] = useState<string>("all");

  const { data: warehousesList } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
  });

  const queryParam = warehouseId !== "all" ? `?warehouseId=${warehouseId}` : "";
  const { data: report, isLoading } = useQuery<ReportRow[]>({
    queryKey: [`/api/inventory-report${queryParam}`],
  });

  const whs = warehousesList || [];
  const rows = report || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="w-7 h-7 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-page-title">{t('Inventory Report')}</h1>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5" />
            {t('Filter')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2 min-w-[220px]">
              <Label>{t('Warehouse')}</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger data-testid="select-warehouse">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All (Total)')}</SelectItem>
                  {whs.map(wh => (
                    <SelectItem key={wh.id} value={String(wh.id)}>{wh.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t('No records found')}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>{t('Product Code')}</TableHead>
                    <TableHead>{t('Product Name')}</TableHead>
                    <TableHead>{t('Category')}</TableHead>
                    <TableHead className="text-center">{t('Purchases')}</TableHead>
                    <TableHead className="text-center">{t('Sales')}</TableHead>
                    <TableHead className="text-center">{t('Purchase Returns')}</TableHead>
                    <TableHead className="text-center">{t('Sales Returns')}</TableHead>
                    <TableHead className="text-center">{t('Damages')}</TableHead>
                    {warehouseId !== "all" && (
                      <>
                        <TableHead className="text-center">{t('Transfer In')}</TableHead>
                        <TableHead className="text-center">{t('Transfer Out')}</TableHead>
                      </>
                    )}
                    <TableHead className="text-center">{t('Net Stock')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={row.productId} data-testid={`row-product-${row.productId}`}>
                      <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                      <TableCell className="font-mono text-sm">{row.productCode}</TableCell>
                      <TableCell className="font-medium">{row.productName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{row.category}</Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {formatUnit(row.purchasedBig, row.purchasedRemainder, row.bigUnit, row.smallUnit)}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {formatUnit(row.soldBig, row.soldRemainder, row.bigUnit, row.smallUnit)}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {formatUnit(row.purchaseReturnedBig, row.purchaseReturnedRemainder, row.bigUnit, row.smallUnit)}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {formatUnit(row.salesReturnedBig, row.salesReturnedRemainder, row.bigUnit, row.smallUnit)}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {formatUnit(row.damagedBig, row.damagedRemainder, row.bigUnit, row.smallUnit)}
                      </TableCell>
                      {warehouseId !== "all" && (
                        <>
                          <TableCell className="text-center text-sm">
                            {formatUnit(row.transferInBig, row.transferInRemainder, row.bigUnit, row.smallUnit)}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {formatUnit(row.transferOutBig, row.transferOutRemainder, row.bigUnit, row.smallUnit)}
                          </TableCell>
                        </>
                      )}
                      <TableCell className="text-center font-semibold">
                        <span className={row.netSmallUnits < 0 ? "text-destructive" : row.netSmallUnits > 0 ? "text-green-600 dark:text-green-400" : ""}>
                          {formatUnit(row.bigQty, row.smallQty, row.bigUnit, row.smallUnit)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
