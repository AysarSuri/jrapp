import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import type { CompanyBook, BookType } from "@shared/schema";
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Loader2, Trash2, Pencil, Save, RotateCcw, BookOpen, Printer, Eye, X, Check } from "lucide-react";
import { playDeleteSound } from "@/lib/sounds";
import { formatDate } from "@/lib/format-utils";
import i18n from "@/lib/i18n";
import { getModernPrintStyles, PRINT_FONT_LINKS } from "@/lib/print-styles";

export default function CompanyBookPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: user } = useUser();
  const qc = useQueryClient();
  const { data: companyProfile } = useQuery<{ id: number; name: string; logo: string | null; cliche: string | null; stamp: string | null; primaryColor: string }>({ queryKey: ["/api/company-profile"] });

  const { data: booksList, isLoading } = useQuery<CompanyBook[]>({
    queryKey: ["/api/company-books"],
  });
  const { data: nextNumber } = useQuery<{ number: number }>({
    queryKey: ["/api/company-books/next-number"],
  });
  const { data: bookTypesList } = useQuery<BookType[]>({
    queryKey: ["/api/book-types"],
  });

  const createBookTypeMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/book-types", { name });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/book-types"] });
    },
  });

  const updateBookTypeMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const res = await apiRequest("PUT", `/api/book-types/${id}`, { name });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/book-types"] });
    },
  });

  const deleteBookTypeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/book-types/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/book-types"] });
    },
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
  const [bookTypeId, setBookTypeId] = useState<number | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [toField, setToField] = useState("");
  const [subject, setSubject] = useState("");
  const [authorizedPerson, setAuthorizedPerson] = useState("");
  const [personName, setPersonName] = useState("");
  const [note, setNote] = useState("");
  const [rightText1, setRightText1] = useState("");
  const [rightText2, setRightText2] = useState("");
  const [showStamp, setShowStamp] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchBookNumber, setSearchBookNumber] = useState("");
  const [filterTypeId, setFilterTypeId] = useState<string>("all");
  const [deleteItem, setDeleteItem] = useState<CompanyBook | null>(null);
  const [previewItem, setPreviewItem] = useState<CompanyBook | null>(null);
  const [bookTypeSearch, setBookTypeSearch] = useState("");
  const [bookTypeDropdownOpen, setBookTypeDropdownOpen] = useState(false);
  const [newBookTypeName, setNewBookTypeName] = useState("");
  const [showBookTypeDialog, setShowBookTypeDialog] = useState(false);
  const [editingBookTypeId, setEditingBookTypeId] = useState<number | null>(null);
  const [editingBookTypeName, setEditingBookTypeName] = useState("");
  const [deleteBookTypeItem, setDeleteBookTypeItem] = useState<BookType | null>(null);
  const bookTypeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (nextNumber?.number && !editingId) {
      setBookNumber(nextNumber.number);
    }
  }, [nextNumber, editingId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bookTypeContainerRef.current && !bookTypeContainerRef.current.contains(e.target as Node)) {
        setBookTypeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredBookTypes = (bookTypesList || []).filter(bt =>
    bt.name.toLowerCase().includes(bookTypeSearch.toLowerCase())
  );

  const selectedBookType = (bookTypesList || []).find(bt => bt.id === bookTypeId);

  const handleAddBookType = () => {
    const name = newBookTypeName.trim();
    if (!name) return;
    createBookTypeMutation.mutate(name, {
      onSuccess: (newType: BookType) => {
        setBookTypeId(newType.id);
        setNewBookTypeName("");
        setShowBookTypeDialog(false);
        toast({ title: t("Book type added successfully") });
      },
    });
  };

  const resetForm = () => {
    setToField("");
    setSubject("");
    setAuthorizedPerson("");
    setPersonName("");
    setNote("");
    setRightText1("");
    setRightText2("");
    setBookTypeId(null);
    setBookTypeSearch("");
    setDate(new Date().toISOString().split("T")[0]);
    setEditingId(null);
  };

  const startEdit = (item: CompanyBook) => {
    setEditingId(item.id);
    setBookNumber(item.bookNumber);
    setBookTypeId(item.bookTypeId || null);
    setDate(typeof item.date === "string" ? item.date.split("T")[0] : new Date(item.date).toISOString().split("T")[0]);
    setToField(item.toField);
    setSubject(item.subject);
    setAuthorizedPerson(item.authorizedPerson);
    setPersonName(item.personName || "");
    setNote(item.note || "");
    setRightText1(item.rightText1 || "");
    setRightText2(item.rightText2 || "");
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
      bookTypeId: bookTypeId || null,
      toField: toField.trim(),
      subject: subject.trim(),
      authorizedPerson: authorizedPerson.trim(),
      personName: personName.trim() || null,
      note: note.trim() || null,
      rightText1: rightText1.trim() || null,
      rightText2: rightText2.trim() || null,
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
    if (searchBookNumber && !String(b.bookNumber).includes(searchBookNumber)) return false;
    if (filterTypeId !== "all" && String(b.bookTypeId || "") !== filterTypeId) return false;
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
    const rightSide = isRtl ? "right" : "left";
    const leftSide = isRtl ? "left" : "right";
    printW.document.write(`<!DOCTYPE html><html dir="${dir}"><head>
      ${PRINT_FONT_LINKS}
      <title>${t("Company Book")} - #${book.bookNumber}</title>
      <style>${getModernPrintStyles(dir)}
        @page { size: A4 portrait; margin: 15mm; }
        .doc-container { padding: 20px; min-height: 700px; font-family: 'Tajawal', 'Inter', sans-serif; }
        .doc-cliche { text-align: center; margin-bottom: 10px; }
        .doc-cliche img { max-width: 100%; max-height: 160px; object-fit: contain; }
        .doc-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; font-size: 11pt; font-weight: 600; }
        .doc-fields { text-align: center; margin-bottom: 30px; }
        .doc-field { margin-bottom: 16px; font-size: 14pt; line-height: 2; }
        .doc-field .label { font-weight: 700; }
        .doc-field .value { border-bottom: 1px dotted #666; padding: 0 10px; min-width: 200px; display: inline-block; }
        .doc-body { margin: 30px 0; min-height: 200px; font-size: 13pt; line-height: 2.2; }
        .doc-footer { margin-top: 60px; display: flex; justify-content: space-between; font-size: 13pt; }
      </style>
    </head><body>
      <div class="doc-container">
        ${companyProfile?.cliche ? `<div class="doc-cliche"><img src="${companyProfile.cliche}" /></div>` : ""}
        <div class="doc-meta">
          <div style="text-align: ${rightSide};">عـدد: ${book.bookNumber}</div>
          <div style="text-align: ${leftSide};">${t("Date")}: ${formatDate(book.date)}</div>
        </div>
        <div class="doc-fields">
          <div class="doc-field">
            <span class="label">${t("To")} / </span>
            <span class="value">${book.toField}</span>
          </div>
          <div class="doc-field">
            <span class="label">${t("Subject")} / </span>
            <span class="value">${book.subject}</span>
          </div>
        </div>
        ${book.note ? `<div class="doc-body"><p>${book.note.replace(/\n/g, '<br/>')}</p></div>` : '<div class="doc-body"></div>'}
        ${showStamp && companyProfile?.stamp ? `<div style="margin-top:40px;margin-bottom:10px;text-align:${leftSide};"><img src="${companyProfile.stamp}" style="max-width:120px;max-height:120px;object-fit:contain;" /></div>` : ""}
        <div class="doc-footer" style="${!showStamp || !companyProfile?.stamp ? 'margin-top:60px;' : ''}">
          <div style="text-align:center;">
            <span style="font-weight:700;font-size:13pt;">${book.rightText1 || ""}</span>
          </div>
          <div style="text-align:center;">
            <span style="font-weight:700;font-size:13pt;">${book.authorizedPerson || ""}</span>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:10px;font-size:12pt;">
          <div style="text-align:center;font-weight:600;">${book.rightText2 || ""}</div>
          <div style="text-align:center;font-weight:600;">${book.personName || ""}</div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-bold">{t("Writing Type")}</Label>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => { setNewBookTypeName(""); setShowBookTypeDialog(true); }}
                    className="bg-primary text-white h-7 px-2 text-xs gap-1"
                    data-testid="button-open-add-book-type"
                  >
                    <Plus className="w-3 h-3" />
                    {t("Add Type")}
                  </Button>
                </div>
                <div ref={bookTypeContainerRef} className="relative">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      data-testid="select-book-type"
                      placeholder={t("Search or select writing type...")}
                      value={bookTypeDropdownOpen ? bookTypeSearch : (selectedBookType?.name || "")}
                      onChange={(e) => {
                        setBookTypeSearch(e.target.value);
                        if (!bookTypeDropdownOpen) setBookTypeDropdownOpen(true);
                      }}
                      onFocus={() => {
                        setBookTypeDropdownOpen(true);
                        setBookTypeSearch("");
                      }}
                      className="h-11 text-base font-semibold pl-8 pr-8"
                    />
                    {bookTypeId && (
                      <button
                        type="button"
                        onClick={() => { setBookTypeId(null); setBookTypeSearch(""); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  {bookTypeDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-md border bg-popover shadow-lg">
                      {filteredBookTypes.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-center text-muted-foreground">
                          {t("No types found")}
                        </div>
                      ) : (
                        filteredBookTypes.map(bt => (
                          <button
                            key={bt.id}
                            type="button"
                            className={`w-full text-start px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer ${bt.id === bookTypeId ? "bg-accent font-medium" : ""}`}
                            onClick={() => {
                              setBookTypeId(bt.id);
                              setBookTypeSearch("");
                              setBookTypeDropdownOpen(false);
                            }}
                            data-testid={`book-type-option-${bt.id}`}
                          >
                            {bt.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-base font-bold">{t("Right Text 1")}</Label>
                    <Input
                      value={rightText1}
                      onChange={(e) => setRightText1(e.target.value)}
                      placeholder={t("Right Text 1") + "..."}
                      className="h-11 text-base font-semibold"
                      data-testid="input-right-text-1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-base font-bold">{t("Right Text 2")}</Label>
                    <Input
                      value={rightText2}
                      onChange={(e) => setRightText2(e.target.value)}
                      placeholder={t("Right Text 2") + "..."}
                      className="h-11 text-base font-semibold"
                      data-testid="input-right-text-2"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-base font-bold">{t("Authorized Person")}</Label>
                    <Input
                      value={authorizedPerson}
                      onChange={(e) => setAuthorizedPerson(e.target.value)}
                      placeholder={t("Authorized person name...")}
                      className="h-11 text-sm font-semibold"
                      data-testid="input-authorized-person"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-base font-bold">{t("Left Text 2")}</Label>
                    <Input
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      placeholder={t("Left Text 2") + "..."}
                      className="h-11 text-base font-semibold"
                      data-testid="input-person-name"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-base font-bold">{t("Writing Text")}</Label>
              <Textarea
                value={note}
                onChange={(e) => {
                  const raw = e.target.value;
                  const lines = raw.split("\n");
                  const wrapped: string[] = [];
                  for (const line of lines) {
                    if (line.length <= 70) {
                      wrapped.push(line);
                    } else {
                      let remaining = line;
                      while (remaining.length > 70) {
                        let breakAt = remaining.lastIndexOf(" ", 70);
                        if (breakAt <= 0) breakAt = 70;
                        wrapped.push(remaining.slice(0, breakAt));
                        remaining = remaining.slice(breakAt).replace(/^ /, "");
                      }
                      if (remaining) wrapped.push(remaining);
                    }
                  }
                  const result = wrapped.join("\n");
                  setNote(result);
                  e.target.style.height = "auto";
                  e.target.style.height = e.target.scrollHeight + "px";
                }}
                placeholder={t("Additional notes...")}
                className="min-h-[70px] text-sm font-bold resize-none overflow-hidden font-mono"
                data-testid="input-book-note"
                ref={(el) => {
                  if (el) {
                    el.style.height = "auto";
                    el.style.height = el.scrollHeight + "px";
                  }
                }}
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
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="show-stamp-filter"
                  checked={showStamp}
                  onCheckedChange={(checked) => setShowStamp(!!checked)}
                  data-testid="checkbox-show-stamp"
                />
                <Label htmlFor="show-stamp-filter" className="text-sm font-bold cursor-pointer whitespace-nowrap">{t("Show Stamp")}</Label>
              </div>
              <Input
                placeholder={t("Search by book number...")}
                value={searchBookNumber}
                onChange={(e) => setSearchBookNumber(e.target.value)}
                className="w-40 h-9"
                data-testid="input-search-book-number"
              />
              <Select value={filterTypeId} onValueChange={setFilterTypeId}>
                <SelectTrigger className="w-44 h-9" data-testid="select-filter-type">
                  <SelectValue placeholder={t("Filter by type")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("All Types")}</SelectItem>
                  {(bookTypesList || []).map(bt => (
                    <SelectItem key={bt.id} value={String(bt.id)}>{bt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("Search...")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-48 h-9"
                  data-testid="input-search-books"
                />
              </div>
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
                    <TableHead className="text-sm font-bold">{t("Writing Type")}</TableHead>
                    <TableHead className="text-sm font-bold">{t("Date")}</TableHead>
                    <TableHead className="text-sm font-bold">{t("To")}</TableHead>
                    <TableHead className="text-sm font-bold">{t("Subject")}</TableHead>
                    <TableHead className="text-sm font-bold text-center">{t("Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBooks.map((book) => (
                    <TableRow key={book.id} data-testid={`row-book-${book.id}`}>
                      <TableCell className="text-sm font-semibold font-mono">{book.bookNumber}</TableCell>
                      <TableCell className="text-sm font-semibold">{book.bookTypeId ? ((bookTypesList || []).find(bt => bt.id === book.bookTypeId)?.name || "-") : "-"}</TableCell>
                      <TableCell className="text-sm font-semibold">{formatDate(book.date)}</TableCell>
                      <TableCell className="text-sm font-semibold">{book.toField}</TableCell>
                      <TableCell className="text-sm font-semibold">{book.subject}</TableCell>
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
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
                {previewItem.personName && <div><span className="font-bold">{t("Left Text 2")}:</span> {previewItem.personName}</div>}
                {previewItem.rightText1 && <div><span className="font-bold">{t("Right Text 1")}:</span> {previewItem.rightText1}</div>}
                {previewItem.rightText2 && <div><span className="font-bold">{t("Right Text 2")}:</span> {previewItem.rightText2}</div>}
              </div>
              {previewItem.note && (
                <div className="border-t pt-3">
                  <span className="font-bold text-sm">{t("Writing Text")}:</span>
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

      <Dialog open={showBookTypeDialog} onOpenChange={setShowBookTypeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Add Type")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-base font-bold">{t("Writing Type")}</Label>
              <div className="flex gap-2">
                <Input
                  data-testid="input-new-book-type"
                  placeholder={t("Add new writing type...")}
                  value={newBookTypeName}
                  onChange={(e) => setNewBookTypeName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddBookType();
                    }
                  }}
                  className="h-11 text-base font-semibold flex-1"
                />
                <Button
                  type="button"
                  onClick={handleAddBookType}
                  disabled={!newBookTypeName.trim() || createBookTypeMutation.isPending}
                  className="bg-primary text-white h-11 px-4"
                  data-testid="button-add-book-type"
                >
                  {createBookTypeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            {(bookTypesList || []).length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">{t("Existing Types")}</Label>
                <div className="border rounded-md max-h-48 overflow-auto">
                  {(bookTypesList || []).map(bt => (
                    <div key={bt.id} className="flex items-center justify-between px-3 py-2 text-sm border-b last:border-b-0 hover:bg-muted/50">
                      {editingBookTypeId === bt.id ? (
                        <Input
                          value={editingBookTypeName}
                          onChange={(e) => setEditingBookTypeName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (editingBookTypeName.trim()) {
                                updateBookTypeMutation.mutate({ id: bt.id, name: editingBookTypeName.trim() }, {
                                  onSuccess: () => {
                                    setEditingBookTypeId(null);
                                    toast({ title: t("Book type updated") });
                                  },
                                });
                              }
                            }
                            if (e.key === "Escape") setEditingBookTypeId(null);
                          }}
                          className="h-8 text-sm font-semibold flex-1 mr-2"
                          autoFocus
                          data-testid={`edit-book-type-input-${bt.id}`}
                        />
                      ) : (
                        <span className="font-semibold flex-1">{bt.name}</span>
                      )}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {editingBookTypeId === bt.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                if (editingBookTypeName.trim()) {
                                  updateBookTypeMutation.mutate({ id: bt.id, name: editingBookTypeName.trim() }, {
                                    onSuccess: () => {
                                      setEditingBookTypeId(null);
                                      toast({ title: t("Book type updated") });
                                    },
                                  });
                                }
                              }}
                              className="text-green-600 hover:text-green-700"
                              data-testid={`save-book-type-${bt.id}`}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingBookTypeId(null)}
                              className="text-muted-foreground hover:text-foreground"
                              data-testid={`cancel-edit-book-type-${bt.id}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBookTypeId(bt.id);
                                setEditingBookTypeName(bt.name);
                              }}
                              className="text-muted-foreground hover:text-orange-600"
                              data-testid={`edit-book-type-${bt.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteBookTypeItem(bt)}
                              className="text-muted-foreground hover:text-red-500"
                              data-testid={`dialog-delete-book-type-${bt.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteBookTypeItem} onOpenChange={(open) => { if (!open) setDeleteBookTypeItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Are you sure?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("This will permanently delete book")} — {deleteBookTypeItem?.name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBookTypeMutation.isPending}>{t("No")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteBookTypeItem) return;
                if (bookTypeId === deleteBookTypeItem.id) setBookTypeId(null);
                deleteBookTypeMutation.mutate(deleteBookTypeItem.id, {
                  onSuccess: () => {
                    toast({ title: t("Book type deleted") });
                    setDeleteBookTypeItem(null);
                  },
                });
              }}
              disabled={deleteBookTypeMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="confirm-delete-book-type"
            >
              {deleteBookTypeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t("Yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
