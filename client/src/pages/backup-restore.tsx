import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, Shield, Loader2, FileJson, CheckCircle2, AlertTriangle, HardDrive } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function BackupRestorePage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreFile, setRestoreFile] = useState<any>(null);
  const [restoreFileName, setRestoreFileName] = useState("");
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [backupProgress, setBackupProgress] = useState(false);

  const handleBackup = async () => {
    setBackupProgress(true);
    try {
      const res = await fetch("/api/backup", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to create backup");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      const h = String(now.getHours()).padStart(2, "0");
      const min = String(now.getMinutes()).padStart(2, "0");
      a.href = url;
      a.download = `ERP-Backup_${y}-${m}-${d}_${h}-${min}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: t("Backup created successfully"), description: t("File downloaded to your device") });
    } catch (e: any) {
      toast({ title: t("Error"), description: e.message, variant: "destructive" });
    } finally {
      setBackupProgress(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".json")) {
      toast({ title: t("Error"), description: t("Please select a valid JSON backup file"), variant: "destructive" });
      return;
    }
    setRestoreFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.version || !data.tables) {
          toast({ title: t("Error"), description: t("Invalid backup file format"), variant: "destructive" });
          return;
        }
        setRestoreFile(data);
      } catch {
        toast({ title: t("Error"), description: t("Invalid backup file format"), variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const restoreMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Restore failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: t("Backup restored successfully"), description: `${data.restoredRows} ${t("records restored")}` });
      setRestoreFile(null);
      setRestoreFileName("");
      setConfirmRestore(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (e: any) => {
      toast({ title: t("Error"), description: e.message, variant: "destructive" });
      setConfirmRestore(false);
    },
  });

  const tableCount = restoreFile ? Object.keys(restoreFile.tables).length : 0;
  const rowCount = restoreFile ? Object.values(restoreFile.tables as Record<string, any[]>).reduce((sum: number, rows: any[]) => sum + (rows?.length || 0), 0) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-backup-title">
          <HardDrive className="w-7 h-7 text-blue-600" />
          {t("Backup & Restore")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("Create and restore database backups")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-green-700">
              <Download className="w-5 h-5" />
              {t("Create Backup")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-4 text-sm text-green-800 dark:text-green-300 space-y-2">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{t("Downloads a complete copy of all your data as a JSON file")}</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{t("Includes all invoices, clients, products, accounts, and settings")}</span>
              </div>
            </div>
            <Button
              onClick={handleBackup}
              disabled={backupProgress}
              className="w-full h-12 text-base font-bold bg-green-600 hover:bg-green-700"
              data-testid="button-create-backup"
            >
              {backupProgress ? <Loader2 className="w-5 h-5 animate-spin me-2" /> : <Download className="w-5 h-5 me-2" />}
              {backupProgress ? t("Creating backup...") : t("Download Backup")}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
              <Upload className="w-5 h-5" />
              {t("Restore Backup")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-orange-50 dark:bg-orange-900/10 rounded-lg p-4 text-sm text-orange-800 dark:text-orange-300 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{t("Warning: Restoring will replace all current data with the backup data")}</span>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{t("Make sure to create a backup of current data before restoring")}</span>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="input-backup-file"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-12 text-base font-bold border-orange-300 hover:bg-orange-50"
              data-testid="button-select-file"
            >
              <FileJson className="w-5 h-5 me-2" />
              {restoreFileName || t("Select backup file")}
            </Button>

            {restoreFile && (
              <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4 space-y-2">
                <p className="text-sm font-bold text-blue-800 dark:text-blue-300">{t("Backup Info")}:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">{t("Date")}:</span>
                  <span className="font-bold" data-testid="text-backup-date">{new Date(restoreFile.createdAt).toLocaleString()}</span>
                  <span className="text-muted-foreground">{t("Created By")}:</span>
                  <span className="font-bold" data-testid="text-backup-by">{restoreFile.createdBy}</span>
                  <span className="text-muted-foreground">{t("Tables")}:</span>
                  <span className="font-bold" data-testid="text-backup-tables">{tableCount}</span>
                  <span className="text-muted-foreground">{t("Records")}:</span>
                  <span className="font-bold" data-testid="text-backup-records">{rowCount}</span>
                </div>
                <Button
                  onClick={() => setConfirmRestore(true)}
                  disabled={restoreMutation.isPending}
                  className="w-full h-12 text-base font-bold bg-orange-600 hover:bg-orange-700 mt-2"
                  data-testid="button-restore-backup"
                >
                  {restoreMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin me-2" /> : <Upload className="w-5 h-5 me-2" />}
                  {restoreMutation.isPending ? t("Restoring...") : t("Restore Backup")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmRestore} onOpenChange={setConfirmRestore}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              {t("Confirm Restore")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {t("Warning: Restoring will replace all current data with the backup data")}
              <br /><br />
              <strong>{t("This action cannot be undone!")}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-restore">{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => restoreMutation.mutate(restoreFile)}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-confirm-restore"
            >
              {t("Yes, Restore")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
