import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users as UsersIcon, ShieldCheck } from "lucide-react";
import { format } from "date-fns";

const ROLE_COLORS: Record<string, string> = { admin: "bg-red-50 text-red-700 border-red-200", doctor: "bg-blue-50 text-blue-700 border-blue-200", assistant: "bg-green-50 text-green-700 border-green-200", user: "bg-gray-50 text-gray-700 border-gray-200" };

export default function Users() {
  const { user: currentUser } = useAuth();
  const utils = trpc.useUtils();
  const [editUser, setEditUser] = useState<any>(null);
  const [newRole, setNewRole] = useState("");
  const { data: users, isLoading } = trpc.users.list.useQuery();
  const updateRoleMutation = trpc.users.updateUserRole.useMutation({ onSuccess: () => { toast.success("Role updated"); utils.users.list.invalidate(); setEditUser(null); }, onError: (e) => toast.error(e.message) });
  const isAdmin = currentUser?.role === "admin";
  if (!isAdmin) return <div className="p-6 text-center"><ShieldCheck className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" /><p className="text-muted-foreground">Admin access required</p></div>;
  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div><h1 className="text-2xl font-bold text-foreground">User Management</h1><p className="text-sm text-muted-foreground mt-0.5">{users?.length ?? 0} registered users</p></div>
      <Card><CardContent className="p-0">
        {isLoading ? <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        : <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Email</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Joined</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {users?.map((u: any) => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">{(u.name ?? u.email ?? "?")[0].toUpperCase()}</div><p className="font-medium">{u.name ?? "No name"}</p></div></td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{u.email ?? "—"}</td>
                  <td className="px-4 py-3"><Badge className={`text-xs border ${ROLE_COLORS[u.role] ?? ""}`}>{u.role}</Badge></td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">{u.createdAt ? format(new Date(u.createdAt), "MMM d, yyyy") : "—"}</td>
                  <td className="px-4 py-3"><div className="flex justify-end">{u.id !== currentUser?.id && <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setEditUser(u); setNewRole(u.role); }}>Change Role</Button>}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </CardContent></Card>
      <Dialog open={!!editUser} onOpenChange={(v) => !v && setEditUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Change Role: {editUser?.name ?? editUser?.email}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Select value={newRole} onValueChange={setNewRole}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="user">User</SelectItem><SelectItem value="assistant">Assistant</SelectItem><SelectItem value="doctor">Doctor</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button><Button onClick={() => editUser && updateRoleMutation.mutate({ userId: editUser.id, role: newRole as any })} disabled={updateRoleMutation.isPending}>{updateRoleMutation.isPending ? "Saving..." : "Update Role"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
