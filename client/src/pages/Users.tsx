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
import { Users as UsersIcon, Shield, User, Edit, Search, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const ROLE_CONFIG: Record<string, { label: string; className: string; description: string }> = {
  admin: { label: "Admin", className: "bg-red-50 text-red-700 border-red-200", description: "Full system access" },
  doctor: { label: "Doctor", className: "bg-blue-50 text-blue-700 border-blue-200", description: "Manage patients, visits, prescriptions, files" },
  assistant: { label: "Assistant", className: "bg-green-50 text-green-700 border-green-200", description: "Add patients and appointments only" },
  user: { label: "User", className: "bg-gray-50 text-gray-700 border-gray-200", description: "Basic access" },
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<any>(null);
  const [newRole, setNewRole] = useState<string>("");

  const { data: users, isLoading } = trpc.users.list.useQuery();

  const updateRoleMutation = trpc.users.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated successfully");
      utils.users.list.invalidate();
      setEditUser(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const isAdmin = currentUser?.role === "admin";

  const filteredUsers = (users ?? []).filter((u: any) =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (u: any) => {
    setEditUser(u);
    setNewRole(u.role ?? "user");
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><UsersIcon className="w-6 h-6 text-primary" /> User Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage team members and their access roles</p>
      </div>

      {!isAdmin && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          <Shield className="w-4 h-4 flex-shrink-0" />
          <span>Only administrators can modify user roles.</span>
        </div>
      )}

      {/* Role Legend */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(ROLE_CONFIG).map(([role, config]) => (
          <Card key={role} className="border-border/60">
            <CardContent className="p-3">
              <Badge className={`text-xs border ${config.className} mb-2`}>{config.label}</Badge>
              <p className="text-xs text-muted-foreground">{config.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="pl-9 h-9 text-sm" />
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Team Members</span>
            <Badge variant="secondary">{filteredUsers.length} users</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UsersIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No users found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredUsers.map((u: any) => {
                const roleConfig = ROLE_CONFIG[u.role ?? "user"] ?? ROLE_CONFIG.user;
                const isCurrentUser = u.id === currentUser?.id;
                return (
                  <div key={u.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{u.name ?? "Unnamed User"}</p>
                        {isCurrentUser && <Badge variant="outline" className="text-xs">You</Badge>}
                        <Badge className={`text-xs border ${roleConfig.className}`}>{roleConfig.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {u.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
                        {u.lastSignedIn && <p className="text-xs text-muted-foreground">Last seen: {format(new Date(u.lastSignedIn), "MMM d, yyyy")}</p>}
                      </div>
                    </div>
                    {isAdmin && !isCurrentUser && (
                      <Button variant="outline" size="sm" className="gap-2 h-8 flex-shrink-0" onClick={() => openEdit(u)}>
                        <Edit className="w-3.5 h-3.5" /> Change Role
                      </Button>
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
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Change Role</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-4 h-4 text-primary" /></div>
                <div>
                  <p className="font-medium text-sm">{editUser.name ?? "Unnamed User"}</p>
                  <p className="text-xs text-muted-foreground">{editUser.email}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>New Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin — Full access</SelectItem>
                    <SelectItem value="doctor">Doctor — Manage patients & visits</SelectItem>
                    <SelectItem value="assistant">Assistant — Add patients & appointments</SelectItem>
                    <SelectItem value="user">User — Basic access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newRole === "admin" && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Admin role grants full system access including user management and settings.</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={() => editUser && updateRoleMutation.mutate({ userId: editUser.id, role: newRole as any })} disabled={updateRoleMutation.isPending}>
              {updateRoleMutation.isPending ? "Saving..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
