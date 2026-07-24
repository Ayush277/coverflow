"use client";
/** User management — roles, risk, engagement (ADMIN only). */
import { useCallback, useEffect, useState } from "react";
import { Users } from "lucide-react";
import { api, fmtDate } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Badge, Card, Empty, Select, useToast } from "@/components/ui";

export default function AdminUsers() {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[] | null>(null);

  const load = useCallback(() => {
    api<{ users: any[] }>("/api/admin/users").then(d => setUsers(d.users)).catch(() => setUsers([]));
  }, []);
  useEffect(load, [load]);

  const changeRole = async (id: string, role: string) => {
    try {
      await api(`/api/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
      toast({ tone: "success", title: "Role updated" });
      load();
    } catch (e: any) { toast({ tone: "error", title: "Update failed", body: e.message }); load(); }
  };

  if (me?.role === "SUPPORT") {
    return <Empty icon={<Users size={32} strokeWidth={1.5} />} title="Admin access required" hint="User management is restricted to the ADMIN role." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mono text-[11px] font-semibold uppercase tracking-widest text-accent">User Management</p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight">Users {users && <span className="text-muted">({users.length})</span>}</h1>
      </div>

      {users === null ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-[16px]" />)}</div>
      ) : (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="mono border-b border-border text-[10px] font-semibold uppercase tracking-widest text-muted">
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Benefits</th>
                  <th className="px-4 py-3.5">Claims</th>
                  <th className="px-4 py-3.5">Max Risk</th>
                  <th className="px-4 py-3.5">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-bg/40">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[11px] font-bold text-[#0e0e10]" style={{ background: u.avatar_color }}>
                          {u.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("")}
                        </span>
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-[11.5px] text-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {u.id === me?.id ? <Badge tone="APPROVED">{u.role} (you)</Badge> : (
                        <Select value={u.role} onChange={(e: any) => changeRole(u.id, e.target.value)} className="!h-8 !w-32 !text-xs">
                          <option value="CUSTOMER">CUSTOMER</option>
                          <option value="SUPPORT">SUPPORT</option>
                          <option value="ADMIN">ADMIN</option>
                        </Select>
                      )}
                    </td>
                    <td className="mono px-4 py-3.5">{u.benefits}</td>
                    <td className="mono px-4 py-3.5">{u.claims}</td>
                    <td className="px-4 py-3.5">
                      {u.max_fraud_score >= 50 ? <Badge tone="URGENT">{u.max_fraud_score}</Badge>
                        : u.max_fraud_score >= 30 ? <Badge tone="HIGH">{u.max_fraud_score}</Badge>
                        : <span className="mono text-muted">{u.max_fraud_score}</span>}
                    </td>
                    <td className="mono px-4 py-3.5 text-muted">{fmtDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
