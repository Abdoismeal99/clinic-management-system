import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Users as UsersIcon, Shield, User, Edit, Search, UserPlus, UserMinus, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const ROLE_CONFIG: Record<string, { label: string; className: string; description: string }> = {
  admin: { label: "أدمن النظام", className: "bg-red-50 text-red-700 border-red-200", description: "صلاحية كاملة على النظام" },
  doctor: { label: "دكتور", className: "bg-blue-50 text-blue-700 border-blue-200", description: "إدارة المرضى والزيارات والوصفات" },
  assistant: { label: "مساعد", className: "bg-green-50 text-green-700 border-green-200", description: "إضافة مرضى ومواعيد فقط" },
  user: { label: "مستخدم", className: "bg-gray-50 text-gray-700 border-gray-200", description: "وصول أساسي" },
};

const TENANT_ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  clinic_admin: { label: "أدمن العيادة", className: "bg-purple-50 text-purple-700 border-purple-200" },
  staff: { label: "موظف", className: "bg-teal-50 text-teal-700 border-teal-200" },
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<any>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [assignUser, setAssignUser] = useState<any>(null);
  const [assignTenantId, setAssignTenantId] = useState<string>("");
  const [assignTenantRole, setAssignTenantRole] = useState<"clinic_admin" | "staff">("staff");

  const SUPER_ADMIN_EMAIL = "abdoismeal012@gmail.com";
  const isSuperAdmin = currentUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  const isClinicAdmin = (currentUser as any)?.tenantRole === "clinic_admin";
  const canManageUsers = isSuperAdmin || isClinicAdmin;

  const { data: users, isLoading } = trpc.users.list.useQuery();
  const { data: unassignedUsers } = trpc.users.listUnassigned.useQuery(undefined, { enabled: isSuperAdmin });
  const { data: tenants } = trpc.tenants.list.useQuery(undefined, { enabled: isSuperAdmin });

  const updateRoleMutation = trpc.users.updateUserRole.useMutation({
    onSuccess: () => { toast.success("تم تحديث الدور"); utils.users.list.invalidate(); setEditUser(null); },
    onError: (e) => toast.error(e.message),
  });

  const assignMutation = trpc.users.assignToTenant.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة المستخدم للعيادة");
      utils.users.list.invalidate();
      utils.users.listUnassigned.invalidate();
      setAssignUser(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const removeMutation = trpc.users.removeFromTenant.useMutation({
    onSuccess: () => {
      toast.success("تم إزالة المستخدم من العيادة");
      utils.users.list.invalidate();
      utils.users.listUnassigned.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const filteredUsers = (users ?? []).filter((u: any) =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (u: any) => { setEditUser(u); setNewRole(u.role ?? "user"); };
  const openAssign = (u: any) => { setAssignUser(u); setAssignTenantId(""); setAssignTenantRole("staff"); };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <UsersIcon className="w-6 h-6 text-primary" /> إدارة المستخدمين
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isSuperAdmin ? "كل المستخدمين في النظام" : isClinicAdmin ? "مستخدمو عيادتك" : "أعضاء الفريق"}
        </p>
      </div>

      {!canManageUsers && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          <Shield className="w-4 h-4 flex-shrink-0" />
          <span>فقط أدمن العيادة يمكنه تعديل أدوار المستخدمين.</span>
        </div>
      )}

      {/* Unassigned Users Section (super admin only) */}
      {isSuperAdmin && (unassignedUsers ?? []).length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700">
              <AlertCircle className="w-4 h-4" />
              مستخدمون غير مرتبطون بعيادة ({(unassignedUsers ?? []).length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-amber-100">
              {(unassignedUsers ?? []).map((u: any) => (
                <div key={u.id} className="flex items-center gap-4 p-4">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{u.name ?? "مستخدم بدون اسم"}</p>
                    {u.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
                  </div>
                  <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => openAssign(u)}>
                    <UserPlus className="w-3.5 h-3.5" /> ربط بعيادة
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث في المستخدمين..." className="pl-9 h-9 text-sm" />
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>المستخدمون</span>
            <Badge variant="secondary">{filteredUsers.length} مستخدم</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UsersIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">لا يوجد مستخدمون</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredUsers.map((u: any) => {
                const roleConfig = ROLE_CONFIG[u.role ?? "user"] ?? ROLE_CONFIG.user;
                const tenantRoleConfig = u.tenantRole ? TENANT_ROLE_CONFIG[u.tenantRole] : null;
                const isCurrentUser = u.id === currentUser?.id;
                return (
                  <div key={u.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{u.name ?? "مستخدم بدون اسم"}</p>
                        {isCurrentUser && <Badge variant="outline" className="text-xs">أنت</Badge>}
                        <Badge className={`text-xs border ${roleConfig.className}`}>{roleConfig.label}</Badge>
                        {tenantRoleConfig && (
                          <Badge className={`text-xs border ${tenantRoleConfig.className}`}>{tenantRoleConfig.label}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {u.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
                        {u.lastSignedIn && <p className="text-xs text-muted-foreground">آخر دخول: {format(new Date(u.lastSignedIn), "dd/MM/yyyy")}</p>}
                      </div>
                    </div>
                    {canManageUsers && !isCurrentUser && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => openEdit(u)}>
                          <Edit className="w-3.5 h-3.5" /> الدور
                        </Button>
                        {isSuperAdmin && u.tenantId && (
                          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs text-red-600 hover:text-red-700" onClick={() => removeMutation.mutate({ userId: u.id })}>
                            <UserMinus className="w-3.5 h-3.5" /> إزالة
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={!!editUser} onOpenChange={(v) => !v && setEditUser(null)}>
        <DialogContent aria-describedby={undefined} className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> تغيير الدور</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-4 h-4 text-primary" /></div>
                <div>
                  <p className="font-medium text-sm">{editUser.name ?? "مستخدم بدون اسم"}</p>
                  <p className="text-xs text-muted-foreground">{editUser.email}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>الدور الجديد</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doctor">دكتور — إدارة المرضى والزيارات</SelectItem>
                    <SelectItem value="assistant">مساعد — إضافة مرضى ومواعيد</SelectItem>
                    <SelectItem value="user">مستخدم — وصول أساسي</SelectItem>
                    {isSuperAdmin && <SelectItem value="admin">أدمن النظام — صلاحية كاملة</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>إلغاء</Button>
            <Button onClick={() => editUser && updateRoleMutation.mutate({ userId: editUser.id, role: newRole as any })} disabled={updateRoleMutation.isPending}>
              {updateRoleMutation.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign to Tenant Dialog (super admin only) */}
      {isSuperAdmin && (
        <Dialog open={!!assignUser} onOpenChange={(v) => !v && setAssignUser(null)}>
          <DialogContent aria-describedby={undefined} className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" /> ربط مستخدم بعيادة</DialogTitle>
            </DialogHeader>
            {assignUser && (
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-4 h-4 text-primary" /></div>
                  <div>
                    <p className="font-medium text-sm">{assignUser.name ?? "مستخدم بدون اسم"}</p>
                    <p className="text-xs text-muted-foreground">{assignUser.email}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>العيادة</Label>
                  <Select value={assignTenantId} onValueChange={setAssignTenantId}>
                    <SelectTrigger><SelectValue placeholder="اختر العيادة..." /></SelectTrigger>
                    <SelectContent>
                      {(tenants ?? []).map((t: any) => (
                        <SelectItem key={t.id} value={String(t.id)}>{t.clinicName} ({t.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>الدور في العيادة</Label>
                  <Select value={assignTenantRole} onValueChange={(v) => setAssignTenantRole(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clinic_admin">أدمن العيادة</SelectItem>
                      <SelectItem value="staff">موظف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignUser(null)}>إلغاء</Button>
              <Button
                disabled={!assignTenantId || assignMutation.isPending}
                onClick={() => assignUser && assignMutation.mutate({ userId: assignUser.id, tenantId: Number(assignTenantId), tenantRole: assignTenantRole })}
              >
                {assignMutation.isPending ? "جاري الحفظ..." : "ربط"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
