import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useProducts } from "@/hooks/use-products";
import { useCategories } from "@/hooks/use-categories";
import { useUnits } from "@/hooks/use-units";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, DollarSign, Loader2, ArrowLeft, ChevronLeft, ChevronRight, Filter, X, Printer } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getProductName, resolveUnitName } from "@/lib/language-utils";

const ITEMS_PER_PAGE = 10;

export default function PriceListPage() {
  const { t } = useTranslation();
  const { data: productsList, isLoading } = useProducts();
  const { data: categoriesList } = useCategories();
  const { data: unitsData } = useUnits();
  const unitsList = unitsData || [];
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allProducts = productsList || [];
  const filtered = allProducts.filter((p) => {
    const matchesSearch = searchTerm.trim() === "" ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <Link href="/material-management" data-testid="link-back-material">
        <Button variant="outline" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t("Material Management")}
        </Button>
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('Price List')}</h1>
          <p className="text-muted-foreground mt-1">{t('Product prices by unit')}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint} data-testid="button-print-price-list">
          <Printer className="h-4 w-4" />
          {t('Print')}
        </Button>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative flex-1 min-w-[200px] max-w-sm" ref={searchRef}>
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('Search products...')}
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); setSearchOpen(true); }}
                  onFocus={() => { if (searchTerm.trim()) setSearchOpen(true); }}
                  data-testid="input-search-price-list"
                />
                {searchOpen && searchTerm.trim() && filtered.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filtered.slice(0, 10).map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        className="w-full text-start px-3 py-2 hover:bg-muted/70 flex items-center justify-between gap-2 font-bold text-sm transition-colors"
                        data-testid={`search-result-price-${product.id}`}
                        onClick={() => {
                          setSearchTerm(product.name);
                          setSearchOpen(false);
                          setCurrentPage(1);
                        }}
                      >
                        <span>{getProductName(product)}</span>
                        <Badge variant="outline" className="text-xs font-semibold shrink-0">{product.category}</Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative min-w-[180px] max-w-[220px]">
                <Select value={categoryFilter} onValueChange={(val) => { setCategoryFilter(val === "__all__" ? "" : val); setCurrentPage(1); }}>
                  <SelectTrigger className="h-10 text-sm font-semibold" data-testid="select-filter-category-price">
                    <Filter className="h-4 w-4 text-muted-foreground shrink-0 mr-1" />
                    <SelectValue placeholder={t('All Categories')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t('All Categories')}</SelectItem>
                    {categoriesList?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {categoryFilter && (
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setCategoryFilter(""); setCurrentPage(1); }} data-testid="button-clear-filter-price">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="text-sm text-muted-foreground font-medium">
              {filtered.length} {t('Total Products')}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="bg-muted/50 p-4 rounded-full mb-4"><DollarSign className="w-10 h-10" /></div>
              <h3 className="font-semibold text-lg">{t('No products found')}</h3>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-bold text-sm">#</TableHead>
                      <TableHead className="font-bold text-sm">{t('Barcode')}</TableHead>
                      <TableHead className="font-bold text-sm">{t('Product Name')}</TableHead>
                      <TableHead className="text-center font-bold text-sm">{t('Big Unit')}</TableHead>
                      <TableHead className="text-right font-bold text-sm">{t('Big Unit Price (USD)')}</TableHead>
                      <TableHead className="text-right font-bold text-sm">{t('Big Unit Price (IQD)')}</TableHead>
                      <TableHead className="text-center font-bold text-sm">{t('Small Unit')}</TableHead>
                      <TableHead className="text-right font-bold text-sm">{t('Small Unit Price (USD)')}</TableHead>
                      <TableHead className="text-right font-bold text-sm">{t('Small Unit Price (IQD)')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((product, idx) => (
                      <TableRow key={product.id} data-testid={`row-price-${product.id}`}>
                        <TableCell className="font-bold font-mono text-sm">{(safePage - 1) * ITEMS_PER_PAGE + idx + 1}</TableCell>
                        <TableCell className="font-bold font-mono text-sm">{product.barcode}</TableCell>
                        <TableCell className="font-bold text-sm">{getProductName(product)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-bold">{resolveUnitName(product.bigUnit, unitsList)}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold font-mono text-sm text-green-600">${product.bigUnitPriceUsd}</TableCell>
                        <TableCell className="text-right font-bold font-mono text-sm text-blue-600">{Number(product.bigUnitPriceIqd).toLocaleString()} IQD</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-bold">{resolveUnitName(product.smallUnit, unitsList)}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold font-mono text-sm text-green-600">${product.smallUnitPriceUsd}</TableCell>
                        <TableCell className="text-right font-bold font-mono text-sm text-blue-600">{Number(product.smallUnitPriceIqd).toLocaleString()} IQD</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    {t('Page')} {safePage} / {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)} data-testid="button-prev-page">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <Button
                        key={page}
                        variant={page === safePage ? "default" : "outline"}
                        size="sm"
                        className="min-w-[36px]"
                        onClick={() => setCurrentPage(page)}
                        data-testid={`button-page-${page}`}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)} data-testid="button-next-page">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
