import { useState } from "react";
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
import {
  Users, Plus, Pencil, Trash2, Loader2, Save, Shield, User, Truck,
  Eye, EyeOff, ChevronLeft, ChevronRight, Search, UserPlus, RotateCcw,
  CheckCircle, XCircle, Phone,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type SafeUser = {
  id: string;
  username: string;
  fullName: string;
  mobile: string;
  role: string;
  isActive: number;
  createdAt: string;
};

export default function UserManagementPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery<SafeUser[]>({
    queryKey: ["/api/users"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; fullName: string; mobile: string; role: string }) => {
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
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
      toast({ title: t("User updated successfully") });
      setEditUser(null);
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

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [role, setRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [editUser, setEditUser] = useState<SafeUser | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editFullName, setEditFullName] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editIsActive, setEditIsActive] = useState(1);
  const [editShowPassword, setEditShowPassword] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setFullName("");
    setMobile("");
    setRole("");
    setShowPassword(false);
  };

  const handleCreate = () => {
    if (!username.trim()) {
      toast({ title: t("Please enter a username"), variant: "destructive" });
      return;
    }
    if (!password.trim()) {
      toast({ title: t("Please enter a password"), variant: "destructive" });
      return;
    }
    if (!role) {
      toast({ title: t("Please select a role"), variant: "destructive" });
      return;
    }
    createMutation.mutate({ username: username.trim(), password, fullName: fullName.trim(), mobile: mobile.trim(), role });
  };

  const openEdit = (u: SafeUser) => {
    setEditUser(u);
    setEditUsername(u.username);
    setEditPassword("");
    setEditFullName(u.fullName);
    setEditMobile(u.mobile || "");
    setEditRole(u.role);
    setEditIsActive(u.isActive);
    setEditShowPassword(false);
  };

  const handleUpdate = () => {
    if (!editUser) return;
    if (!editUsername.trim()) {
      toast({ title: t("Please enter a username"), variant: "destructive" });
      return;
    }
    if (!editRole) {
      toast({ title: t("Please select a role"), variant: "destructive" });
      return;
    }
    const data: any = {
      username: editUsername.trim(),
      fullName: editFullName.trim(),
      mobile: editMobile.trim(),
      role: editRole,
      isActive: editIsActive,
    };
    if (editPassword.trim()) {
      data.password = editPassword;
    }
    updateMutation.mutate({ id: editUser.id, data });
  };

  const roleConfig = {
    admin: { icon: Shield, color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300", label: "Admin" },
    user: { icon: User, color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", label: "User" },
    sales_rep: { icon: Truck, color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300", label: "Representative" },
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

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return "-";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3" data-testid="text-user-management-title">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Users className="h-7 w-7 text-purple-600 dark:text-purple-400" />
            </div>
            {t('User Management')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('Create and manage system users')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-purple-600" />
              {t('Add New User')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
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
                <Label className="font-semibold">{t('Password')}</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
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
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">{t('User Role')}</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="h-11" data-testid="select-user-role">
                    <SelectValue placeholder={t('Select role...')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-purple-600" />
                        {t('Admin')}
                      </div>
                    </SelectItem>
                    <SelectItem value="user">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-600" />
                        {t('User')}
                      </div>
                    </SelectItem>
                    <SelectItem value="sales_rep">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-emerald-600" />
                        {t('Representative')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="gap-2 bg-purple-600 hover:bg-purple-700 text-[#ffffff]"
                data-testid="button-create-user"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {t('Add User')}
              </Button>
              <Button variant="outline" onClick={resetForm} className="gap-2" data-testid="button-reset-user-form">
                <RotateCcw className="h-4 w-4" />
                {t('Reset')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 dark:border-purple-900 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('Statistics')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex justify-between items-center p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t('Total Users')}</span>
                </div>
                <span className="font-bold text-lg" data-testid="text-total-users">{allUsers.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">{t('Admin')}</span>
                </div>
                <span className="font-bold text-lg text-purple-600" data-testid="text-admin-count">
                  {allUsers.filter(u => u.role === 'admin').length}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">{t('User')}</span>
                </div>
                <span className="font-bold text-lg text-blue-600" data-testid="text-user-count">
                  {allUsers.filter(u => u.role === 'user').length}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium">{t('Representative')}</span>
                </div>
                <span className="font-bold text-lg text-emerald-600" data-testid="text-rep-count">
                  {allUsers.filter(u => u.role === 'sales_rep').length}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">{t('Active')}</span>
                </div>
                <span className="font-bold text-lg text-green-600" data-testid="text-active-count">
                  {allUsers.filter(u => u.isActive === 1).length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              {t('Users List')}
              <Badge variant="secondary" className="ml-2">{filteredUsers.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative w-48">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder={t('Search...')}
                  className="ps-9 h-9"
                  data-testid="input-search-users"
                />
              </div>
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
                    <TableHead>{t('Created')}</TableHead>
                    <TableHead className="text-center">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((u, i) => {
                    const rc = roleConfig[u.role as keyof typeof roleConfig] || roleConfig.user;
                    const RoleIcon = rc.icon;
                    return (
                      <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
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
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                              onClick={() => openEdit(u)}
                              data-testid={`button-edit-user-${u.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  data-testid={`button-delete-user-${u.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
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
                                    className="bg-red-600 hover:bg-red-700"
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
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
                    <ChevronLeft className="h-4 w-4" />
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
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-orange-600" />
              {t('Edit User')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-semibold">{t('Full Name')}</Label>
              <Input
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                placeholder={t('Enter full name...')}
                data-testid="input-edit-user-fullname"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">{t('Username')}</Label>
              <Input
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder={t('Enter username...')}
                data-testid="input-edit-user-username"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">{t('Mobile')}</Label>
              <div className="relative">
                <Phone className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={editMobile}
                  onChange={(e) => setEditMobile(e.target.value)}
                  placeholder={t('Enter mobile number...')}
                  className="ps-9"
                  data-testid="input-edit-user-mobile"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">{t('New Password')}</Label>
              <div className="relative">
                <Input
                  type={editShowPassword ? "text" : "password"}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder={t('Leave empty to keep current password')}
                  className="pe-10"
                  data-testid="input-edit-user-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute end-1 top-1 h-8 w-8"
                  onClick={() => setEditShowPassword(!editShowPassword)}
                  data-testid="button-toggle-edit-password"
                >
                  {editShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t('Leave empty to keep current password')}</p>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">{t('User Role')}</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger data-testid="select-edit-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-600" />
                      {t('Admin')}
                    </div>
                  </SelectItem>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" />
                      {t('User')}
                    </div>
                  </SelectItem>
                  <SelectItem value="sales_rep">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-emerald-600" />
                      {t('Representative')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">{t('Status')}</Label>
              <Select value={String(editIsActive)} onValueChange={(v) => setEditIsActive(parseInt(v))}>
                <SelectTrigger data-testid="select-edit-user-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      {t('Active')}
                    </div>
                  </SelectItem>
                  <SelectItem value="0">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      {t('Inactive')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditUser(null)}>{t('Cancel')}</Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
              className="gap-2 bg-purple-600 hover:bg-purple-700"
              data-testid="button-update-user"
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t('Update')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
