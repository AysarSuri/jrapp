import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema } from "@shared/routes";
import { z } from "zod";
import { useProducts, useCreateProduct } from "@/hooks/use-products";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus, Search, PackageOpen, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProductsPage() {
  const { t } = useTranslation();
  const { data: products, isLoading } = useProducts();
  const { data: unitsList } = useUnits();
  const { data: categoriesList } = useCategories();
  const { mutate: createProduct, isPending } = useCreateProduct();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const form = useForm<z.infer<typeof insertProductSchema>>({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      name: "",
      barcode: "",
      category: "",
      priceUsd: "0",
      priceIqd: "0",
      minStock: 0,
      bigUnit: "",
      smallUnit: "",
      conversionFactor: 1,
    },
  });

  const onSubmit = (values: z.infer<typeof insertProductSchema>) => {
    // Ensure numeric types for API payload even if inputs return strings
    const payload = {
      ...values,
      minStock: Number(values.minStock),
      conversionFactor: Number(values.conversionFactor),
    };

    createProduct(payload, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        toast({ title: "Product created successfully" });
      },
      onError: (err) => {
        toast({ 
          title: "Failed to create product", 
          description: err.message, 
          variant: "destructive" 
        });
      },
    });
  };

  const filteredProducts = products?.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode.includes(searchTerm)
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('Products')}</h1>
          <p className="text-muted-foreground mt-1">Manage your inventory items</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
              <Plus className="w-4 h-4 mr-2" />
              {t('Add Product')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Fill in the product details below.
              </DialogDescription>
            </DialogHeader>
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
                          <Input placeholder="SCAN-123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                </div>
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Name')}</FormLabel>
                      <FormControl>
                        <Input placeholder="Product Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="priceUsd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Price (USD)')}</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priceIqd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Price (IQD)')}</FormLabel>
                        <FormControl>
                          <Input type="number" step="250" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                        <FormLabel>Conversion</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
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
                      <FormLabel>Min Stock Alert</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-4">
                  <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                    {t('Cancel')}
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {t('Save')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
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
              <h3 className="font-semibold text-lg">No products found</h3>
              <p>Add a new product to get started.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>{t('Barcode')}</TableHead>
                    <TableHead>{t('Name')}</TableHead>
                    <TableHead>{t('Category')}</TableHead>
                    <TableHead className="text-right">{t('Price (USD)')}</TableHead>
                    <TableHead className="text-right">{t('Price (IQD)')}</TableHead>
                    <TableHead className="text-center">Units</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts?.map((product) => (
                    <TableRow key={product.id} className="hover:bg-muted/5">
                      <TableCell className="font-mono text-xs">{product.barcode}</TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          {product.category}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">${product.priceUsd}</TableCell>
                      <TableCell className="text-right">{product.priceIqd} IQD</TableCell>
                      <TableCell className="text-center text-muted-foreground text-sm">
                        1 {product.bigUnit} = {product.conversionFactor} {product.smallUnit}
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
