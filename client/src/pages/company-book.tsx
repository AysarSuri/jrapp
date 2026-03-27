import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import type { CompanyBook } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Loader2, Trash2, Pencil, Save, RotateCcw, BookOpen, Printer, Eye } from "lucide-react";
import { playDeleteSound } from "@/lib/sounds";
import { formatDate } from "@/lib/format-utils";
import i18n from "@/lib/i18n";
import { getModernPrintStyles, PRINT_FONT_LINKS } from "@/lib/print-styles";

export default function CompanyBookPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: user } = useUser();
  const qc = useQueryClient();
  const { data: companyProfile } = useQuery<{ id: number; name: string; logo: string | null; primaryColor: string }>({ queryKey: ["/api/company-profile"] });

  const { data: booksList, isLoading } = useQuery<CompanyBook[]>({
    queryKey: ["/api/company-books"],
  });
  const { data: nextNumber } = useQuery<{ number: number }>({
    queryKey: ["/api/company-books/next-number"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/company-books", data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/company-books"] });
      qc.invalidateQueries({ queryKey: ["/api/company-books/next-number"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/company-books/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/company-books"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/company-books/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/company-books"] });
      qc.invalidateQueries({ queryKey: ["/api/company-books/next-number"] });
    },
  });

  const [bookNumber, setBookNumber] = useState<number>(0);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [toField, setToField] = useState("");
  const [subject, setSubject] = useState("");
  const [authorizedPerson, setAuthorizedPerson] = useState("");
  const [personName, setPersonName] = useState("");
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteItem, setDeleteItem] = useState<CompanyBook | null>(null);
  const [previewItem, setPreviewItem] = useState<CompanyBook | null>(null);

  useEffect(() => {
    if (nextNumber?.number && !editingId) {
      setBookNumber(nextNumber.number);
    }
  }, [nextNumber, editingId]);

  const resetForm = () => {
    setToField("");
    setSubject("");
    setAuthorizedPerson("");
    setPersonName("");
    setNote("");
    setDate(new Date().toISOString().split("T")[0]);
    setEditingId(null);
  };

  const startEdit = (item: CompanyBook) => {
    setEditingId(item.id);
    setBookNumber(item.bookNumber);
    setDate(typeof item.date === "string" ? item.date.split("T")[0] : new Date(item.date).toISOString().split("T")[0]);
    setToField(item.toField);
    setSubject(item.subject);
    setAuthorizedPerson(item.authorizedPerson);
    setPersonName(item.personName || "");
    setNote(item.note || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = () => {
    if (!toField.trim()) {
      toast({ title: t("Please enter the recipient"), variant: "destructive" });
      return;
    }
    if (!subject.trim()) {
      toast({ title: t("Please enter the subject"), variant: "destructive" });
      return;
    }
    if (!authorizedPerson.trim()) {
      toast({ title: t("Please enter the authorized person"), variant: "destructive" });
      return;
    }

    const data = {
      date,
      toField: toField.trim(),
      subject: subject.trim(),
      authorizedPerson: authorizedPerson.trim(),
      personName: personName.trim() || null,
      note: note.trim() || null,
      createdBy: user?.username || null,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data }, {
        onSuccess: () => {
          toast({ title: t("Book updated successfully") });
          resetForm();
        },
        onError: (err) => {
          toast({ title: t("Failed to update book"), description: err.message, variant: "destructive" });
        },
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast({ title: t("Book saved successfully") });
          resetForm();
        },
        onError: (err) => {
          toast({ title: t("Failed to save book"), description: err.message, variant: "destructive" });
        },
      });
    }
  };

  const handleDelete = () => {
    if (!deleteItem) return;
    deleteMutation.mutate(deleteItem.id, {
      onSuccess: () => {
        playDeleteSound();
        toast({ title: t("Book deleted successfully") });
        setDeleteItem(null);
      },
      onError: (err) => {
        toast({ title: t("Failed to delete book"), description: err.message, variant: "destructive" });
      },
    });
  };

  const isRtl = ["ar", "ckb"].includes(i18n.language);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const filteredBooks = (booksList || []).filter(b => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      String(b.bookNumber).includes(s) ||
      b.toField.toLowerCase().includes(s) ||
      b.subject.toLowerCase().includes(s) ||
      b.authorizedPerson.toLowerCase().includes(s) ||
      (b.personName && b.personName.toLowerCase().includes(s))
    );
  }).sort((a, b) => b.bookNumber - a.bookNumber);

  const handlePrint = (book: CompanyBook) => {
    const printW = window.open("", "_blank");
    if (!printW) return;
    const dir = isRtl ? "rtl" : "ltr";
    printW.document.write(`<!DOCTYPE html><html dir="${dir}"><head>
      ${PRINT_FONT_LINKS}
      <title>${t("Company Book")} - #${book.bookNumber}</title>
      <style>${getModernPrintStyles(dir)}
        @page { size: A4 portrait; margin: 15mm; }
        .doc-container { border: 2px solid #333; padding: 40px; min-height: 700px; position: relative; font-family: 'Tajawal', 'Inter', sans-serif; }
        .doc-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .doc-field { margin-bottom: 20px; font-size: 14pt; line-height: 2; }
        .doc-field .label { font-weight: 700; }
        .doc-field .value { border-bottom: 1px dotted #666; padding: 0 10px; min-width: 200px; display: inline-block; }
        .doc-body { margin: 30px 0; min-height: 200px; font-size: 13pt; line-height: 2.2; }
        .doc-footer { margin-top: 60px; display: flex; justify-content: space-between; font-size: 13pt; }
        .doc-number-badge { position: absolute; top: 15px; ${isRtl ? 'left' : 'right'}: 15px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 16px; font-weight: 800; font-size: 13pt; }
      </style>
    </head><body>
      <div class="doc-container">
        <div class="doc-number-badge">${t("Book #")}: ${book.bookNumber}</div>
        <div class="doc-header">
          ${companyProfile?.logo ? `<img src="${companyProfile.logo}" style="width:80px;height:80px;object-fit:contain;border-radius:8px;margin-bottom:8px;" />` : ""}
          <h2 style="margin:0;font-size:11pt;color:#64748b;font-weight:800;">${companyProfile?.name || ""}</h2>
          <h1 style="margin:8px 0 0;font-size:18pt;font-weight:800;">${t("Company Book")}</h1>
        </div>
        <div class="doc-field">
          <span class="label">${t("To")} / </span>
          <span class="value">${book.toField}</span>
        </div>
        <div class="doc-field">
          <span class="label">${t("Subject")} / </span>
          <span class="value">${book.subject}</span>
        </div>
        <div class="doc-field">
          <span class="label">${t("Date")} / </span>
          <span class="value">${formatDate(book.date)}</span>
        </div>
        ${book.note ? `<div class="doc-body"><p>${book.note.replace(/\n/g, '<br/>')}</p></div>` : '<div class="doc-body"></div>'}
        <div class="doc-footer">
          <div>
            <strong>${t("Authorized Person")}</strong><br/>
            <span style="font-weight:600;">${book.authorizedPerson}</span>
          </div>
          ${book.personName ? `<div>
            <strong>${t("Name")}</strong><br/>
            <span style="font-weight:600;">${book.personName}</span>
          </div>` : ""}
        </div>
      </div>
    </body></html>`);
    printW.document.close();
    printW.onafterprint = () => printW.close();
    setTimeout(() => { document.fonts.ready.then(() => printW.print()); }, 600);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            {t("Company Book Management")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("Manage official company correspondence and books")}</p>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm border-primary/30">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {editingId ? t("Edit Book") : t("New Book")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-border/60 rounded-xl p-6 bg-muted/10 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-base font-bold">{t("Book #")}</Label>
                <Input
                  value={bookNumber}
                  readOnly
                  className="h-11 text-base font-semibold font-mono bg-muted/40 cursor-not-allowed text-center"
                  data-testid="input-book-number"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-base font-bold">{t("Date")}</Label>
                <DateInput
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 text-base font-semibold"
                  data-testid="input-book-date"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-base font-bold">{t("To")} /</Label>
                <Input
                  value={toField}
                  onChange={(e) => setToField(e.target.value)}
                  placeholder={t("Recipient name or department...")}
                  className="h-11 text-base font-semibold"
                  data-testid="input-book-to"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-base font-bold">{t("Subject")} / {t("م")}</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t("Subject of the book...")}
                  className="h-11 text-base font-semibold"
                  data-testid="input-book-subject"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-base font-bold">{t("Authorized Person")}</Label>
                <Input
                  value={authorizedPerson}
                  onChange={(e) => setAuthorizedPerson(e.target.value)}
                  placeholder={t("Authorized person name...")}
                  className="h-11 text-base font-semibold"
                  data-testid="input-authorized-person"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-base font-bold">{t("Name")}</Label>
                <Input
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder={t("Person name...")}
                  className="h-11 text-base font-semibold"
                  data-testid="input-person-name"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-base font-bold">{t("Note")}</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("Additional notes...")}
                className="min-h-[70px] text-base font-semibold"
                data-testid="input-book-note"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={isSaving} className="bg-primary text-white" data-testid="button-save-book">
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                {editingId ? t("Update Book") : t("Save Book")}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={resetForm} data-testid="button-cancel-edit-book">
                  <RotateCcw className="w-5 h-5 mr-2" />
                  {t("Cancel")}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {t("Books List")}
              <Badge variant="secondary" className="ml-2">{filteredBooks.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder={t("Search...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 h-9"
                data-testid="input-search-books"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-sm font-bold">{t("Book #")}</TableHead>
                    <TableHead className="text-sm font-bold">{t("Date")}</TableHead>
                    <TableHead className="text-sm font-bold">{t("To")}</TableHead>
                    <TableHead className="text-sm font-bold">{t("Subject")}</TableHead>
                    <TableHead className="text-sm font-bold">{t("Authorized Person")}</TableHead>
                    <TableHead className="text-sm font-bold">{t("Name")}</TableHead>
                    <TableHead className="text-sm font-bold text-center">{t("Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBooks.map((book) => (
                    <TableRow key={book.id} data-testid={`row-book-${book.id}`}>
                      <TableCell className="text-sm font-semibold font-mono">{book.bookNumber}</TableCell>
                      <TableCell className="text-sm font-semibold">{formatDate(book.date)}</TableCell>
                      <TableCell className="text-sm font-semibold">{book.toField}</TableCell>
                      <TableCell className="text-sm font-semibold">{book.subject}</TableCell>
                      <TableCell className="text-sm font-semibold">{book.authorizedPerson}</TableCell>
                      <TableCell className="text-sm font-semibold">{book.personName || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20" onClick={() => handlePrint(book)} data-testid={`btn-print-book-${book.id}`}>
                            <Printer className="h-5 w-5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20" onClick={() => setPreviewItem(book)} data-testid={`btn-preview-book-${book.id}`}>
                            <Eye className="h-5 w-5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20" onClick={() => startEdit(book)} data-testid={`btn-edit-book-${book.id}`}>
                            <Pencil className="h-5 w-5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setDeleteItem(book)} data-testid={`btn-delete-book-${book.id}`}>
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredBooks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {t("No books found")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteItem} onOpenChange={(open) => { if (!open) setDeleteItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Are you sure?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("This will permanently delete book")} #{deleteItem?.bookNumber}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>{t("No")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteMutation.isPending} className="bg-red-600 hover:bg-red-700 text-white" data-testid="confirm-delete-book">
              {deleteMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-1" /> : null}
              {t("Yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!previewItem} onOpenChange={(open) => { if (!open) setPreviewItem(null); }}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {t("Company Book")} - #{previewItem?.bookNumber}
            </AlertDialogTitle>
          </AlertDialogHeader>
          {previewItem && (
            <div className="border rounded-lg p-6 space-y-4 bg-muted/10">
              <div className="text-center border-b pb-4">
                {companyProfile?.logo && <img src={companyProfile.logo} className="w-16 h-16 object-contain mx-auto mb-2 rounded-lg" />}
                <h3 className="text-sm font-bold text-muted-foreground">{companyProfile?.name}</h3>
                <h2 className="text-xl font-bold mt-1">{t("Company Book")}</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="font-bold">{t("Book #")}:</span> <span className="font-mono">{previewItem.bookNumber}</span></div>
                <div><span className="font-bold">{t("Date")}:</span> {formatDate(previewItem.date)}</div>
                <div><span className="font-bold">{t("To")}:</span> {previewItem.toField}</div>
                <div><span className="font-bold">{t("Subject")}:</span> {previewItem.subject}</div>
                <div><span className="font-bold">{t("Authorized Person")}:</span> {previewItem.authorizedPerson}</div>
                {previewItem.personName && <div><span className="font-bold">{t("Name")}:</span> {previewItem.personName}</div>}
              </div>
              {previewItem.note && (
                <div className="border-t pt-3">
                  <span className="font-bold text-sm">{t("Note")}:</span>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{previewItem.note}</p>
                </div>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Close")}</AlertDialogCancel>
            {previewItem && (
              <AlertDialogAction onClick={() => { handlePrint(previewItem); setPreviewItem(null); }} className="bg-primary text-white">
                <Printer className="w-4 h-4 mr-2" />
                {t("Print")}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
