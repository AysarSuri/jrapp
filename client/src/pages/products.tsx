import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema } from "@shared/routes";
import { products } from "@shared/schema";
type Product = typeof products.$inferSelect;
import { z } from "zod";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/use-products";
import { useUnits } from "@/hooks/use-units";
import { useCategories } from "@/hooks/use-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Plus, Search, PackageOpen, Loader2, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getProductName, resolveUnitName } from "@/lib/language-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type FormValues = z.infer<typeof insertProductSchema>;

const defaultValues: FormValues = {
  name: "",
  nameEn: "",
  barcode: "",
  category: "",
  bigUnit: "",
  smallUnit: "",
  conversionFactor: 1,
  weight: "0",
  bigUnitPriceUsd: "0",
  bigUnitPriceIqd: "0",
  smallUnitPriceUsd: "0",
  smallUnitPriceIqd: "0",
  minStock: 0,
};

function ProductForm({
  form,
  onSubmit,
  isPending,
  unitsList,
  categoriesList,
  submitLabel,
  onCancel,
}: {
  form: ReturnType<typeof useForm<FormValues>>;
  onSubmit: (v: FormValues) => void;
  isPending: boolean;
  unitsList: { id: number; name: string }[] | undefined;
  categoriesList: { id: number; name: string }[] | undefined;
  submitLabel: string;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="barcode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Barcode')}</FormLabel>
                <FormControl>
                  <Input placeholder="SCAN-123" {...field} data-testid="input-barcode" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Name')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('Product Name')} {...field} data-testid="input-product-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nameEn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Product Name (English)')}</FormLabel>
                <FormControl>
                  <Input placeholder="Product Name in English" {...field} data-testid="input-product-name-en" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Category')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder={t('Select Category')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categoriesList?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name} data-testid={`option-category-${cat.id}`}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="bigUnit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Big Unit')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-big-unit">
                      <SelectValue placeholder={t('Select Unit')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {unitsList?.map((unit) => (
                      <SelectItem key={unit.id} value={unit.name} data-testid={`option-big-unit-${unit.id}`}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="smallUnit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Small Unit')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-small-unit">
                      <SelectValue placeholder={t('Select Unit')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {unitsList?.map((unit) => (
                      <SelectItem key={unit.id} value={unit.name} data-testid={`option-small-unit-${unit.id}`}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="conversionFactor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Conversion Factor')}</FormLabel>
                <FormControl>
                  <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} data-testid="input-conversion-factor" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Weight (KG)')}</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} data-testid="input-weight" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="bigUnitPriceUsd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Big Unit Price (USD)')}</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} data-testid="input-big-unit-price-usd" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="bigUnitPriceIqd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Big Unit Price (IQD)')}</FormLabel>
                <FormControl>
                  <Input type="number" step="250" {...field} data-testid="input-big-unit-price-iqd" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="smallUnitPriceUsd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Small Unit Price (USD)')}</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} data-testid="input-small-unit-price-usd" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="smallUnitPriceIqd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Small Unit Price (IQD)')}</FormLabel>
                <FormControl>
                  <Input type="number" step="250" {...field} data-testid="input-small-unit-price-iqd" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="minStock"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Min Stock Alert')}</FormLabel>
              <FormControl>
                <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} data-testid="input-min-stock" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter className="pt-4">
          <Button variant="outline" type="button" onClick={onCancel} data-testid="button-cancel-product">
            {t('Cancel')}
          </Button>
          <Button type="submit" disabled={isPending} data-testid="button-save-product">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export default function ProductsPage() {
  const { t } = useTranslation();
  const { data: products, isLoading } = useProducts();
  const { data: unitsData } = useUnits();
  const unitsList = unitsData || [];
  const { data: categoriesList } = useCategories();
  const { mutate: createProduct, isPending: isCreating } = useCreateProduct();
  const { mutate: updateProduct, isPending: isUpdating } = useUpdateProduct();
  const { mutate: deleteProduct, isPending: isDeleting } = useDeleteProduct();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const addForm = useForm<FormValues>({
    resolver: zodResolver(insertProductSchema),
    defaultValues,
  });

  const editForm = useForm<FormValues>({
    resolver: zodResolver(insertProductSchema),
    defaultValues,
  });

  const onAdd = (values: FormValues) => {
    const payload = { ...values, minStock: Number(values.minStock), conversionFactor: Number(values.conversionFactor) };
    createProduct(payload, {
      onSuccess: () => {
        setAddOpen(false);
        addForm.reset(defaultValues);
        toast({ title: t('Product added successfully') });
      },
      onError: (err) => toast({ title: t('Failed to add product'), description: t(err.message), variant: "destructive" }),
    });
  };

  const onEdit = (values: FormValues) => {
    if (!editProduct) return;
    const payload = { ...values, minStock: Number(values.minStock), conversionFactor: Number(values.conversionFactor) };
    updateProduct({ id: editProduct.id, data: payload }, {
      onSuccess: () => {
        setEditProduct(null);
        toast({ title: t('Product updated successfully') });
      },
      onError: (err) => toast({ title: t('Failed to update product'), description: t(err.message), variant: "destructive" }),
    });
  };

  const openEdit = (product: Product) => {
    editForm.reset({
      name: product.name,
      nameEn: product.nameEn || "",
      barcode: product.barcode,
      category: product.category,
      bigUnit: product.bigUnit,
      smallUnit: product.smallUnit,
      conversionFactor: product.conversionFactor,
      weight: product.weight,
      bigUnitPriceUsd: product.bigUnitPriceUsd,
      bigUnitPriceIqd: product.bigUnitPriceIqd,
      smallUnitPriceUsd: product.smallUnitPriceUsd,
      smallUnitPriceIqd: product.smallUnitPriceIqd,
      minStock: product.minStock,
    });
    setEditProduct(product);
  };

  const handleDelete = (id: number) => {
    deleteProduct(id, {
      onSuccess: () => toast({ title: t('Product deleted successfully') }),
      onError: () => toast({ title: t('Failed to delete product'), variant: "destructive" }),
    });
  };

  const filteredProducts = products?.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('Products')}</h1>
          <p className="text-muted-foreground mt-1">{t('Manage your inventory items')}</p>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-product" className="shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
              <Plus className="w-4 h-4 mr-2" />
              {t('Add Product')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('Add New Product')}</DialogTitle>
              <DialogDescription>{t('Fill in the product details below.')}</DialogDescription>
            </DialogHeader>
            <ProductForm
              form={addForm}
              onSubmit={onAdd}
              isPending={isCreating}
              unitsList={unitsList}
              categoriesList={categoriesList}
              submitLabel={t('Save')}
              onCancel={() => setAddOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Total Products')}</CardTitle>
            <PackageOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-products">{products?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Categories Used')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(products?.map(p => p.category)).size}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('Low Stock')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">0</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('Search products...')}
              className="pl-9 max-w-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-products"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredProducts?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="bg-muted/50 p-4 rounded-full mb-4">
                <PackageOpen className="w-10 h-10" />
              </div>
              <h3 className="font-semibold text-lg">{t('No products found')}</h3>
              <p>{t('Add a new product to get started.')}</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>{t('Barcode')}</TableHead>
                    <TableHead>{t('Name')}</TableHead>
                    <TableHead>{t('Category')}</TableHead>
                    <TableHead className="text-center">{t('Units')}</TableHead>
                    <TableHead className="text-right">{t('Weight (KG)')}</TableHead>
                    <TableHead className="text-right">{t('Big Unit Price (USD)')}</TableHead>
                    <TableHead className="text-right">{t('Big Unit Price (IQD)')}</TableHead>
                    <TableHead className="text-right">{t('Small Unit Price (USD)')}</TableHead>
                    <TableHead className="text-right">{t('Small Unit Price (IQD)')}</TableHead>
                    <TableHead className="text-center">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts?.map((product) => (
                    <TableRow key={product.id} data-testid={`row-product-${product.id}`} className="hover:bg-muted/5">
                      <TableCell className="font-mono text-xs">{product.barcode}</TableCell>
                      <TableCell className="font-medium">{getProductName(product)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{product.category}</Badge>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground text-sm">
                        1 {resolveUnitName(product.bigUnit, unitsList)} = {product.conversionFactor} {resolveUnitName(product.smallUnit, unitsList)}
                      </TableCell>
                      <TableCell className="text-right">{product.weight} kg</TableCell>
                      <TableCell className="text-right">${product.bigUnitPriceUsd}</TableCell>
                      <TableCell className="text-right">{Number(product.bigUnitPriceIqd).toLocaleString()} IQD</TableCell>
                      <TableCell className="text-right">${product.smallUnitPriceUsd}</TableCell>
                      <TableCell className="text-right">{Number(product.smallUnitPriceIqd).toLocaleString()} IQD</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(product)} data-testid={`button-edit-product-${product.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" data-testid={`button-delete-product-${product.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('Delete Product')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('Are you sure you want to delete this product?')} <strong>{product.name}</strong>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(product.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  data-testid={`button-confirm-delete-product-${product.id}`}
                                >
                                  {t('Delete')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editProduct} onOpenChange={(open) => { if (!open) setEditProduct(null); }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Edit Product')}</DialogTitle>
            <DialogDescription>{t('Update the product details below.')}</DialogDescription>
          </DialogHeader>
          <ProductForm
            form={editForm}
            onSubmit={onEdit}
            isPending={isUpdating}
            unitsList={unitsList}
            categoriesList={categoriesList}
            submitLabel={t('Save Changes')}
            onCancel={() => setEditProduct(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
