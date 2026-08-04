import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, Save, Shield, User, Eye, EyeOff, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, UserPlus, RotateCcw, CheckCircle, XCircle, Phone, LogOut, KeyRound, LogIn, Building2 } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { IconCustomers, IconSupplierList } from "@/components/erp-icons";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { getAssignableModules, getSalesRepModules, SALES_REP_PERMISSIONS, getDefaultPermissions, MODULE_FORMS, SUB_PERMISSION_ACTIONS, type DetailedPermissions, type DetailedFormPermissions } from "@/lib/permissions";

type SafeUser = {
  id: string;
  username: string;
  fullName: string;
  mobile: string;
  role: string;
  isActive: number;
  permissions: string[] | null;
  detailedPermissions: DetailedPermissions | null;
  lastLoginAt: string | null;
  lastLogoutAt: string | null;
  createdAt: string;
  branchId?: number | null;
};

type BranchOption = { id: number; name: string; color: string | null };

export default function UserManagementPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const { data: users, isLoading } = useQuery<SafeUser[]>({
    queryKey: ["/api/users"],
  });

  const [editUser, setEditUser] = useState<SafeUser | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [role, setRole] = useState("");
  const [isActive, setIsActive] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [detailedPermissions, setDetailedPermissions] = useState<DetailedPermissions>({});
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [debtUsd, setDebtUsd] = useState("");
  const [debtIqd, setDebtIqd] = useState("");
  const [branchId, setBranchId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const [passwordUser, setPasswordUser] = useState<SafeUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data: branchOptions = [] } = useQuery<BranchOption[]>({
    queryKey: ["/api/login-branches"],
  });

  const resetForm = () => {
    setEditUser(null);
    setUsername("");
    setPassword("");
    setFullName("");
    setMobile("");
    setRole("");
    setIsActive(1);
    setShowPassword(false);
    setPermissions([]);
    setDetailedPermissions({});
    setExpandedModules([]);
    setDebtUsd("");
    setDebtIqd("");
    setBranchId("");
    setDialogOpen(false);
  };

  const { data: representativesList } = useQuery<{ id: string; name: string; repId: number | null; debtUsd: string; debtIqd: string }[]>({
    queryKey: ["/api/agents"],
  });

  const openEdit = (u: SafeUser) => {
    setEditUser(u);
    setUsername(u.username);
    setPassword("");
    setFullName(u.fullName);
    setMobile(u.mobile || "");
    setRole(u.role);
    setIsActive(u.isActive);
    setPermissions(u.permissions || []);
    setDetailedPermissions(u.detailedPermissions || {});
    setExpandedModules([]);
    setShowPassword(false);
    setBranchId(u.branchId != null ? String(u.branchId) : "");
    if (u.role === "sales_rep") {
      const rep = representativesList?.find(r => r.name === u.fullName || r.name === u.username);
      setDebtUsd(rep?.debtUsd || "0");
      setDebtIqd(rep?.debtIqd || "0");
    } else {
      setDebtUsd("");
      setDebtIqd("");
    }
    setDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; fullName: string; mobile: string; role: string; permissions: string[]; debtUsd?: string; debtIqd?: string }) => {
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({ title: t("User created successfully") });
      resetForm();
    },
    onError: (err: any) => {
      toast({ title: err.message || t("Failed to create user"), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({ title: t("User updated successfully") });
      resetForm();
    },
    onError: (err: any) => {
      toast({ title: err.message || t("Failed to update user"), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/users/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: t("User deleted successfully") });
    },
    onError: (err: any) => {
      toast({ title: err.message || t("Failed to delete user"), variant: "destructive" });
    },
  });

  const forceLogoutMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/users/${id}/force-logout`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: t("User has been logged out") });
    },
    onError: (err: any) => {
      toast({ title: err.message || t("Failed to force logout user"), variant: "destructive" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ id, newPassword }: { id: string; newPassword: string }) => {
      const res = await apiRequest("POST", `/api/users/${id}/change-password`, { newPassword });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: t("Password changed successfully") });
      setPasswordUser(null);
      setNewPassword("");
      setShowNewPassword(false);
    },
    onError: (err: any) => {
      toast({ title: err.message || t("Failed to change password"), variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!username.trim()) {
      toast({ title: t("Please enter a username"), variant: "destructive" });
      return;
    }
    if (!editUser && !password.trim()) {
      toast({ title: t("Please enter a password"), variant: "destructive" });
      return;
    }
    if (!role) {
      toast({ title: t("Please select a role"), variant: "destructive" });
      return;
    }
    if (role === "admin" && (!branchId || branchId === "none")) {
      toast({ title: "يجب اختيار الفرع لمدير الفرع", variant: "destructive" });
      return;
    }

    const effectivePermissions = role === "admin" ? getDefaultPermissions("admin") : role === "sales_rep" ? getDefaultPermissions("sales_rep") : permissions;

    if (editUser) {
      const data: any = {
        username: username.trim(),
        fullName: fullName.trim(),
        mobile: mobile.trim(),
        role,
        isActive,
        permissions: effectivePermissions,
      };
      if (role === "user" || role === "sales_rep") {
        data.detailedPermissions = detailedPermissions;
      }
      if (password.trim()) {
        data.password = password;
      }
      if (role === "sales_rep") {
        data.debtUsd = debtUsd || "0";
        data.debtIqd = debtIqd || "0";
      }
      data.branchId = branchId && branchId !== "none" ? parseInt(branchId) : null;
      updateMutation.mutate({ id: editUser.id, data });
    } else {
      const createData: any = { username: username.trim(), password, fullName: fullName.trim(), mobile: mobile.trim(), role, permissions: effectivePermissions };
      if (role === "user" || role === "sales_rep") {
        createData.detailedPermissions = detailedPermissions;
      }
      if (role === "sales_rep") {
        createData.debtUsd = debtUsd || "0";
        createData.debtIqd = debtIqd || "0";
      }
      createData.branchId = branchId && branchId !== "none" ? parseInt(branchId) : null;
      createMutation.mutate(createData);
    }
  };

  const handleChangePassword = () => {
    if (!passwordUser) return;
    if (!newPassword.trim()) {
      toast({ title: t("Please enter a new password"), variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({ id: passwordUser.id, newPassword: newPassword.trim() });
  };

  const roleConfig = {
    admin: { icon: Shield, color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300", label: "مدير الفرع" },
    user: { icon: User, color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", label: "User" },
    sales_rep: { icon: IconSupplierList, color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300", label: "Representative" },
  };

  const allUsers = users || [];
  const filteredUsers = allUsers.filter(u => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!u.username.toLowerCase().includes(q) && !u.fullName.toLowerCase().includes(q)) return false;
    }
    if (filterRole && filterRole !== "all" && u.role !== filterRole) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize);

  const fmtDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "-";
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dy = String(d.getDate()).padStart(2, "0");
      return `${dy} / ${m} / ${y}`;
    } catch {
      return "-";
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dy = String(d.getDate()).padStart(2, "0");
      const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${dy} / ${m} / ${y} ${time}`;
    } catch {
      return null;
    }
  };

  const isUserOnline = (u: SafeUser) => {
    if (!u.lastLoginAt) return false;
    if (!u.lastLogoutAt) return true;
    return new Date(u.lastLoginAt) > new Date(u.lastLogoutAt);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  /* ---- form JSX shown inside Dialog ---- */
  const formContent = (
    <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold">{t('Full Name')}</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t('Enter full name...')}
                  className="h-11"
                  data-testid="input-user-fullname"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">{t('Username')}</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('Enter username...')}
                  className="h-11"
                  data-testid="input-user-username"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold">{t('Mobile')}</Label>
                <div className="relative">
                  <Phone className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder={t('Enter mobile number...')}
                    className="h-11 ps-9"
                    data-testid="input-user-mobile"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">
                  {editUser ? t('New Password') : t('Password')}
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editUser ? t('Leave empty to keep current password') : "••••••••"}
                    className="h-11 pe-10"
                    data-testid="input-user-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute end-1 top-1 h-9 w-9"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </Button>
                </div>
                {editUser && (
                  <p className="text-xs text-muted-foreground">{t('Leave empty to keep current password')}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">{t('User Role')}</Label>
                <Select value={role} onValueChange={(v) => { setRole(v); }}>
                  <SelectTrigger className="h-11" data-testid="select-user-role">
                    <SelectValue placeholder={t('Select role...')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-purple-600" />
                        مدير الفرع
                      </div>
                    </SelectItem>
                    <SelectItem value="user">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-blue-600" />
                        {t('User')}
                      </div>
                    </SelectItem>
                    <SelectItem value="sales_rep">
                      <div className="flex items-center gap-2">
                        <IconSupplierList className="h-5 w-5 text-emerald-600" />
                        {t('Representative')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Branch selector — required for all roles */}
              {role && (
                <div className="space-y-2">
                  <Label className="font-semibold flex items-center gap-1">
                    <Building2 className="h-4 w-4 text-primary" />
                    {t('Branch')}
                    {role === "admin" && <span className="text-red-500 ms-1">*</span>}
                  </Label>
                  <Select value={branchId} onValueChange={setBranchId}>
                    <SelectTrigger className="h-11" data-testid="select-user-branch">
                      <SelectValue placeholder={role === "admin" ? "اختر الفرع (إجباري)" : (t('No branch (all branches)') || "بدون فرع")} />
                    </SelectTrigger>
                    <SelectContent>
                      {role !== "admin" && <SelectItem value="none">{t('No branch') || "بدون فرع"}</SelectItem>}
                      {branchOptions.map(b => (
                        <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t('branchAssignDesc') || "يظهر هذا المستخدم فقط عند اختيار هذا الفرع في شاشة تسجيل الدخول"}
                  </p>
                </div>
              )}
              {role === "sales_rep" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-base font-bold">{t('Opening Balance')} (USD)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="h-11 text-base font-semibold"
                      value={debtUsd}
                      onChange={(e) => setDebtUsd(e.target.value)}
                      placeholder="0.00"
                      data-testid="input-debt-usd"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-base font-bold">{t('Opening Balance')} (IQD)</Label>
                    <Input
                      type="number"
                      step="1"
                      className="h-11 text-base font-semibold"
                      value={debtIqd}
                      onChange={(e) => setDebtIqd(e.target.value)}
                      placeholder="0"
                      data-testid="input-debt-iqd"
                    />
                  </div>
                </div>
              )}
              {editUser && (
                <div className="space-y-2">
                  <Label className="font-semibold">{t('Status')}</Label>
                  <Select value={String(isActive)} onValueChange={(v) => setIsActive(parseInt(v))}>
                    <SelectTrigger className="h-11" data-testid="select-user-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          {t('Active')}
                        </div>
                      </SelectItem>
                      <SelectItem value="0">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-5 w-5 text-red-600" />
                          {t('Inactive')}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {role && (
              <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-base flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {t('Permissions')}
                  </Label>
                  {role === "user" && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPermissions(getAssignableModules().map(m => m.key))}
                        data-testid="button-select-all-permissions"
                      >
                        {t('Select All')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPermissions([])}
                        data-testid="button-deselect-all-permissions"
                      >
                        {t('Deselect All')}
                      </Button>
                    </div>
                  )}
                </div>
                {role === "admin" && (
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium" data-testid="text-admin-full-access">
                    <CheckCircle className="h-5 w-5 inline me-1" />
                    {t('Full access to all modules')}
                  </p>
                )}
                {role === "sales_rep" && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground" data-testid="text-sales-rep-fixed">
                      {t('Representative permissions')} — {t('Dashboard')}, {t('Sales Management')}, {t('Agent Management')}
                    </p>
                    <div className="space-y-1">
                      {getSalesRepModules().map(mod => {
                        const isExpanded = expandedModules.includes(mod.key);
                        const forms = MODULE_FORMS[mod.key] || [];
                        const hasForms = forms.length > 0;

                        const toggleExpand = () => {
                          setExpandedModules(prev =>
                            prev.includes(mod.key)
                              ? prev.filter(k => k !== mod.key)
                              : [...prev, mod.key]
                          );
                        };

                        const getFormPerms = (route: string): DetailedFormPermissions => {
                          return detailedPermissions[mod.key]?.[route] || {};
                        };

                        const setFormPerm = (route: string, action: string, value: boolean | number) => {
                          setDetailedPermissions(prev => {
                            const updated = { ...prev };
                            if (!updated[mod.key]) updated[mod.key] = {};
                            if (!updated[mod.key][route]) updated[mod.key][route] = {};
                            (updated[mod.key][route] as any)[action] = value;
                            return updated;
                          });
                        };

                        return (
                          <div key={mod.key} className="rounded border bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
                            <div className="flex items-center gap-2 p-2">
                              <Checkbox checked={true} disabled data-testid={`checkbox-perm-${mod.key}`} />
                              <span className="text-sm flex-1 font-medium">{t(mod.labelKey)}</span>
                              {hasForms && (
                                <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={toggleExpand} data-testid={`btn-expand-${mod.key}`}>
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                              )}
                            </div>
                            {hasForms && isExpanded && (
                              <div className="px-3 pb-3 space-y-2">
                                {forms.map(form => {
                                  const fp = getFormPerms(form.route);
                                  const formEnabled = detailedPermissions[mod.key]?.[form.route] !== undefined;
                                  return (
                                    <div key={form.key} className="rounded border p-2 bg-background/50 space-y-1.5">
                                      <div className="flex items-center gap-2">
                                        <Checkbox
                                          checked={formEnabled}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              setFormPerm(form.route, "create", true);
                                              setFormPerm(form.route, "edit", true);
                                              setFormPerm(form.route, "editDays", 0);
                                              setFormPerm(form.route, "delete", true);
                                              setFormPerm(form.route, "viewHistory", true);
                                              setFormPerm(form.route, "print", true);
                                            } else {
                                              setDetailedPermissions(prev => {
                                                const updated = { ...prev };
                                                if (updated[mod.key]) {
                                                  delete updated[mod.key][form.route];
                                                }
                                                return updated;
                                              });
                                            }
                                          }}
                                          data-testid={`checkbox-form-${form.key}`}
                                        />
                                        <span className="text-xs font-medium">{t(form.labelKey)}</span>
                                      </div>
                                      {formEnabled && (
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 ms-6">
                                          {SUB_PERMISSION_ACTIONS.map(action => (
                                            <label key={action.key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                                              <Checkbox
                                                className="h-3.5 w-3.5"
                                                checked={fp[action.key as keyof DetailedFormPermissions] !== false}
                                                onCheckedChange={(checked) => {
                                                  setFormPerm(form.route, action.key, !!checked);
                                                }}
                                                data-testid={`checkbox-action-${form.key}-${action.key}`}
                                              />
                                              <span>{t(action.labelKey)}</span>
                                            </label>
                                          ))}
                                          {fp.edit !== false && (
                                            <label className="flex items-center gap-1.5 text-xs">
                                              <span>{t('Edit Days')}:</span>
                                              <Input
                                                type="number"
                                                min={0}
                                                value={fp.editDays ?? 0}
                                                onChange={(e) => setFormPerm(form.route, "editDays", parseInt(e.target.value) || 0)}
                                                className="h-6 w-16 text-xs px-1"
                                                data-testid={`input-editdays-${form.key}`}
                                              />
                                              <span className="text-muted-foreground">({t('0 = unlimited')})</span>
                                            </label>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {role === "user" && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {t('Select permissions for this user')}
                    </p>
                    <div className="space-y-1">
                      {getAssignableModules().map(mod => {
                        const isChecked = permissions.includes(mod.key);
                        const isExpanded = expandedModules.includes(mod.key);
                        const forms = MODULE_FORMS[mod.key] || [];
                        const hasForms = forms.length > 0;

                        const toggleExpand = () => {
                          setExpandedModules(prev =>
                            prev.includes(mod.key)
                              ? prev.filter(k => k !== mod.key)
                              : [...prev, mod.key]
                          );
                        };

                        const getFormPerms = (route: string): DetailedFormPermissions => {
                          return detailedPermissions[mod.key]?.[route] || {};
                        };

                        const setFormPerm = (route: string, action: string, value: boolean | number) => {
                          setDetailedPermissions(prev => {
                            const updated = { ...prev };
                            if (!updated[mod.key]) updated[mod.key] = {};
                            if (!updated[mod.key][route]) updated[mod.key][route] = {};
                            (updated[mod.key][route] as any)[action] = value;
                            return updated;
                          });
                        };

                        const toggleAllFormsInModule = (enabled: boolean) => {
                          setDetailedPermissions(prev => {
                            const updated = { ...prev };
                            if (enabled) {
                              if (!updated[mod.key]) updated[mod.key] = {};
                              forms.forEach(f => {
                                updated[mod.key][f.route] = { create: true, edit: true, editDays: 0, delete: true, viewHistory: true, print: true };
                              });
                            } else {
                              delete updated[mod.key];
                            }
                            return updated;
                          });
                        };

                        return (
                          <div key={mod.key} className={`rounded border transition-colors ${isChecked ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'hover:bg-muted/50'}`}>
                            <div className="flex items-center gap-2 p-2">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setPermissions(prev => [...prev, mod.key]);
                                    toggleAllFormsInModule(true);
                                  } else {
                                    setPermissions(prev => prev.filter(p => p !== mod.key));
                                    toggleAllFormsInModule(false);
                                  }
                                }}
                                data-testid={`checkbox-perm-${mod.key}`}
                              />
                              <span className="text-sm flex-1 cursor-pointer" onClick={() => {
                                if (isChecked) {
                                  setPermissions(prev => prev.filter(p => p !== mod.key));
                                  toggleAllFormsInModule(false);
                                } else {
                                  setPermissions(prev => [...prev, mod.key]);
                                  toggleAllFormsInModule(true);
                                }
                              }}>{t(mod.labelKey)}</span>
                              {hasForms && isChecked && (
                                <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={toggleExpand} data-testid={`btn-expand-${mod.key}`}>
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                              )}
                            </div>
                            {hasForms && isChecked && isExpanded && (
                              <div className="px-3 pb-3 space-y-2">
                                {forms.map(form => {
                                  const fp = getFormPerms(form.route);
                                  const formEnabled = detailedPermissions[mod.key]?.[form.route] !== undefined;
                                  return (
                                    <div key={form.key} className="rounded border p-2 bg-background/50 space-y-1.5">
                                      <div className="flex items-center gap-2">
                                        <Checkbox
                                          checked={formEnabled}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              setFormPerm(form.route, "create", true);
                                              setFormPerm(form.route, "edit", true);
                                              setFormPerm(form.route, "editDays", 0);
                                              setFormPerm(form.route, "delete", true);
                                              setFormPerm(form.route, "viewHistory", true);
                                              setFormPerm(form.route, "print", true);
                                            } else {
                                              setDetailedPermissions(prev => {
                                                const updated = { ...prev };
                                                if (updated[mod.key]) {
                                                  delete updated[mod.key][form.route];
                                                }
                                                return updated;
                                              });
                                            }
                                          }}
                                          data-testid={`checkbox-form-${form.key}`}
                                        />
                                        <span className="text-xs font-medium">{t(form.labelKey)}</span>
                                      </div>
                                      {formEnabled && (
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 ms-6">
                                          {SUB_PERMISSION_ACTIONS.map(action => (
                                            <label key={action.key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                                              <Checkbox
                                                className="h-3.5 w-3.5"
                                                checked={fp[action.key as keyof DetailedFormPermissions] !== false}
                                                onCheckedChange={(checked) => {
                                                  setFormPerm(form.route, action.key, !!checked);
                                                }}
                                                data-testid={`checkbox-action-${form.key}-${action.key}`}
                                              />
                                              <span>{t(action.labelKey)}</span>
                                            </label>
                                          ))}
                                          {fp.edit !== false && (
                                            <label className="flex items-center gap-1.5 text-xs">
                                              <span>{t('Edit Days')}:</span>
                                              <Input
                                                type="number"
                                                min={0}
                                                value={fp.editDays ?? 0}
                                                onChange={(e) => setFormPerm(form.route, "editDays", parseInt(e.target.value) || 0)}
                                                className="h-6 w-16 text-xs px-1"
                                                data-testid={`input-editdays-${form.key}`}
                                              />
                                              <span className="text-muted-foreground">({t('0 = unlimited')})</span>
                                            </label>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
    </div>
  );

  return (
    <div className="space-y-3">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3" data-testid="text-user-management-title">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <IconCustomers className="h-7 w-7 text-purple-600 dark:text-purple-400" />
            </div>
            {t('User Management')}
          </h1>
          <p className="text-muted-foreground text-sm">{t('Create and manage system users')}</p>
        </div>
        <Button
          onClick={() => { resetForm(); setDialogOpen(true); }}
          className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
          data-testid="button-open-add-user"
        >
          <UserPlus className="h-5 w-5" />
          {t('Add New User')}
        </Button>
      </div>

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editUser ? (
                <>
                  <Pencil className="h-5 w-5 text-orange-600" />
                  {t('Edit User')} — <span className="text-orange-600">{editUser.fullName || editUser.username}</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5 text-purple-600" />
                  {t('Add New User')}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {formContent}

          <DialogFooter className="gap-2 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`gap-2 text-white ${editUser ? 'bg-orange-600 hover:bg-orange-700' : 'bg-purple-600 hover:bg-purple-700'}`}
              data-testid={editUser ? "button-update-user" : "button-create-user"}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : editUser ? (
                <Save className="h-5 w-5" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
              {editUser ? t('Update') : t('Add User')}
            </Button>
            <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset-user-form">
              <RotateCcw className="h-5 w-5" />
              {editUser ? t('Cancel') : t('Reset')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <IconCustomers className="h-5 w-5 text-purple-600" />
              {t('Users List')}
              <Badge variant="secondary" className="ml-2">{filteredUsers.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <SearchInput
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                onClear={() => { setSearchQuery(""); setCurrentPage(1); }}
                placeholder={t('Search...')}
                containerClassName="w-48"
                className="h-9"
                data-testid="input-search-users"
              />
              <div className="w-40">
                <Select value={filterRole} onValueChange={(v) => { setFilterRole(v); setCurrentPage(1); }}>
                  <SelectTrigger className="h-9" data-testid="select-filter-role">
                    <SelectValue placeholder={t('All Roles')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All Roles')}</SelectItem>
                    <SelectItem value="admin">{t('Admin')}</SelectItem>
                    <SelectItem value="user">{t('User')}</SelectItem>
                    <SelectItem value="sales_rep">{t('Representative')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t('Full Name')}</TableHead>
                    <TableHead>{t('Username')}</TableHead>
                    <TableHead>{t('Mobile')}</TableHead>
                    <TableHead>{t('Role')}</TableHead>
                    <TableHead>{t('Status')}</TableHead>
                    <TableHead>{t('Session Info')}</TableHead>
                    <TableHead>{t('Created')}</TableHead>
                    <TableHead className="text-center">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((u, i) => {
                    const rc = roleConfig[u.role as keyof typeof roleConfig] || roleConfig.user;
                    const RoleIcon = rc.icon;
                    const online = isUserOnline(u);
                    const isEditing = editUser?.id === u.id;
                    return (
                      <TableRow key={u.id} className={isEditing ? "bg-orange-50 dark:bg-orange-950/20" : ""} data-testid={`row-user-${u.id}`}>
                        <TableCell className="font-mono text-xs">{(safePage - 1) * pageSize + i + 1}</TableCell>
                        <TableCell className="font-semibold">{u.fullName || "-"}</TableCell>
                        <TableCell className="font-mono text-sm">{u.username}</TableCell>
                        <TableCell className="font-mono text-sm">{u.mobile || "-"}</TableCell>
                        <TableCell>
                          <Badge className={rc.color}>
                            <RoleIcon className="h-3 w-3 me-1" />
                            {t(rc.label)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {u.isActive === 1 ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                <CheckCircle className="h-3 w-3 me-1" />
                                {t('Active')}
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                                <XCircle className="h-3 w-3 me-1" />
                                {t('Inactive')}
                              </Badge>
                            )}
                            {online ? (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse me-1" />
                                {t('Online')}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                <div className="h-2 w-2 rounded-full bg-gray-400 me-1" />
                                {t('Offline')}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-xs">
                            <div className="flex items-center gap-1 text-green-700 dark:text-green-400" data-testid={`text-login-time-${u.id}`}>
                              <LogIn className="h-3 w-3" />
                              <span className="font-medium">{t('Last Login')}:</span>
                              <span>{formatDateTime(u.lastLoginAt) || t('Never logged in')}</span>
                            </div>
                            <div className="flex items-center gap-1 text-red-600 dark:text-red-400" data-testid={`text-logout-time-${u.id}`}>
                              <LogOut className="h-3 w-3" />
                              <span className="font-medium">{t('Last Logout')}:</span>
                              <span>{formatDateTime(u.lastLogoutAt) || "-"}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">{fmtDate(u.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 ${isEditing ? 'text-orange-700 bg-orange-100 dark:bg-orange-900/40' : 'text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20'}`}
                              onClick={() => isEditing ? resetForm() : openEdit(u)}
                              title={isEditing ? t('Cancel') : t('Edit User')}
                              data-testid={`button-edit-user-${u.id}`}
                            >
                              {isEditing ? <XCircle className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              onClick={() => { setPasswordUser(u); setNewPassword(""); setShowNewPassword(false); }}
                              title={t('Change Password')}
                              data-testid={`button-change-password-${u.id}`}
                            >
                              <KeyRound className="h-5 w-5" />
                            </Button>
                            {u.role !== 'admin' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                    title={t('Force Logout')}
                                    data-testid={`button-force-logout-${u.id}`}
                                  >
                                    <LogOut className="h-5 w-5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t('Force logout this user?')}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t('This will terminate the user\'s active session')} - <strong>{u.fullName || u.username}</strong>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{t('No')}</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => forceLogoutMutation.mutate(u.id)}
                                      className="bg-amber-600 hover:bg-amber-700"
                                    >
                                      {t('Yes')}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  data-testid={`button-delete-user-${u.id}`}
                                >
                                  <Trash2 className="h-5 w-5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('This will permanently delete user')} <strong>{u.fullName || u.username}</strong>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('No')}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(u.id)}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                  >
                                    {t('Yes')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {paginatedUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        {t('No users yet')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  {t('Showing')} {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredUsers.length)} {t('of')} {filteredUsers.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage(safePage - 1)}
                    data-testid="button-users-prev-page"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                    <Button
                      key={pg}
                      variant={pg === safePage ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(pg)}
                      data-testid={`button-users-page-${pg}`}
                    >
                      {pg}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage(safePage + 1)}
                    data-testid="button-users-next-page"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!passwordUser} onOpenChange={(open) => { if (!open) { setPasswordUser(null); setNewPassword(""); setShowNewPassword(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-600" />
              {t('Change Password')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold">{passwordUser?.fullName || passwordUser?.username}</span>
                <span className="text-muted-foreground text-sm">({passwordUser?.username})</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">{t('New Password')}</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pe-10"
                  data-testid="input-new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute end-1 top-1 h-8 w-8"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  data-testid="button-toggle-new-password"
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setPasswordUser(null); setNewPassword(""); setShowNewPassword(false); }}>{t('Cancel')}</Button>
            <Button
              onClick={handleChangePassword}
              disabled={changePasswordMutation.isPending}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-[#ffffff]"
              data-testid="button-save-password"
            >
              {changePasswordMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <KeyRound className="h-5 w-5" />}
              {t('Change Password')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
