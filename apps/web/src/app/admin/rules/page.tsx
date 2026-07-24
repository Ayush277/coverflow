"use client";
/** Benefit Knowledge Engine console — rules are configuration, not code. */
import { useCallback, useEffect, useState } from "react";
import { ScrollText, Plus, Pencil } from "lucide-react";
import { api, compactMoney } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Badge, Button, Card, Empty, Input, Modal, Select, useToast, cx } from "@/components/ui";

const emptyRule = {
  name: "", benefit_type: "Purchase Protection", description: "",
  card_tiers: ["PLATINUM"], categories: ["ELECTRONICS"], countries: ["*"],
  min_amount: 0, max_amount: null as number | null, coverage_days: 90, coverage_limit: 50000,
  claim_window_days: 120, decision: "AUTO" as const, exclusions: [] as string[], active: true,
};

export default function AdminRules() {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [rules, setRules] = useState<any[] | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const isAdmin = me?.role === "ADMIN";

  const load = useCallback(() => {
    api<{ rules: any[] }>("/api/admin/rules").then(d => setRules(d.rules)).catch(() => setRules([]));
  }, []);
  useEffect(load, [load]);

  const save = async () => {
    setBusy(true);
    const body = {
      ...editing,
      min_amount: Number(editing.min_amount), max_amount: editing.max_amount ? Number(editing.max_amount) : null,
      coverage_days: Number(editing.coverage_days), coverage_limit: Number(editing.coverage_limit),
      claim_window_days: Number(editing.claim_window_days),
      card_tiers: arr(editing.card_tiers), categories: arr(editing.categories), countries: arr(editing.countries), exclusions: arr(editing.exclusions),
    };
    try {
      if (editing.id) await api(`/api/admin/rules/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
      else await api("/api/admin/rules", { method: "POST", body: JSON.stringify(body) });
      toast({ tone: "success", title: editing.id ? "Rule updated" : "Rule created", body: "Applies to the next transaction immediately — no redeploy." });
      setEditing(null); load();
    } catch (e: any) { toast({ tone: "error", title: "Save failed", body: e.message }); }
    finally { setBusy(false); }
  };

  const arr = (v: string | string[]) => Array.isArray(v) ? v : v.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
  const toggleActive = async (r: any) => {
    await api(`/api/admin/rules/${r.id}`, { method: "PATCH", body: JSON.stringify({ active: !r.active }) });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mono text-[11px] font-semibold uppercase tracking-widest text-accent">Benefit Knowledge Engine</p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight">Coverage rules</h1>
        </div>
        {isAdmin && <Button onClick={() => setEditing({ ...emptyRule })}><Plus size={15} /> New rule</Button>}
      </div>

      {rules === null ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-[16px]" />)}</div>
      ) : rules.length === 0 ? (
        <Empty icon={<ScrollText size={32} strokeWidth={1.5} />} title="No rules configured" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rules.map(r => (
            <Card key={r.id} className={cx(!r.active && "opacity-55")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[14.5px] font-semibold">{r.name}</h3>
                    <Badge tone={r.decision}>{r.decision}</Badge>
                    {!r.active && <Badge>disabled</Badge>}
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{r.description}</p>
                </div>
                {isAdmin && (
                  <button onClick={() => setEditing({ ...r })} className="cursor-pointer text-muted transition-colors hover:text-text"><Pencil size={15} /></button>
                )}
              </div>
              <div className="mono mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10.5px] uppercase tracking-wide text-muted sm:grid-cols-3">
                <p>Tiers · <span className="text-text">{r.card_tiers.join(", ")}</span></p>
                <p>Cats · <span className="text-text">{r.categories.join(", ")}</span></p>
                <p>Countries · <span className="text-text">{r.countries.join(", ")}</span></p>
                <p>Coverage · <span className="text-primary">{r.coverage_days}d</span></p>
                <p>Limit · <span className="text-text">{compactMoney(r.coverage_limit)}</span></p>
                <p>Claim window · <span className="text-text">{r.claim_window_days}d</span></p>
                <p>Min amt · <span className="text-text">{compactMoney(r.min_amount)}</span></p>
                <p>Used · <span className="text-mint">{r.usage_count}×</span></p>
                <p>v{r.version}</p>
              </div>
              {isAdmin && (
                <Button size="sm" variant={r.active ? "outline" : "primary"} className="mt-4" onClick={() => toggleActive(r)}>
                  {r.active ? "Disable" : "Enable"}
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit rule" : "New coverage rule"} wide>
        {editing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
            <Input label="Benefit type" value={editing.benefit_type} onChange={e => setEditing({ ...editing, benefit_type: e.target.value })} />
            <div className="sm:col-span-2"><Input label="Description" value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} /></div>
            <Input label="Card tiers (comma sep)" value={Array.isArray(editing.card_tiers) ? editing.card_tiers.join(", ") : editing.card_tiers} onChange={e => setEditing({ ...editing, card_tiers: e.target.value })} />
            <Input label="Categories (* = all)" value={Array.isArray(editing.categories) ? editing.categories.join(", ") : editing.categories} onChange={e => setEditing({ ...editing, categories: e.target.value })} />
            <Input label="Countries (* = all)" value={Array.isArray(editing.countries) ? editing.countries.join(", ") : editing.countries} onChange={e => setEditing({ ...editing, countries: e.target.value })} />
            <Select label="Decision" value={editing.decision} onChange={(e: any) => setEditing({ ...editing, decision: e.target.value })}>
              <option value="AUTO">AUTO — activate instantly</option>
              <option value="REMINDER">REMINDER — needs receipt</option>
              <option value="MANUAL">MANUAL — user activates</option>
            </Select>
            <Input label="Min amount (₹)" type="number" value={editing.min_amount} onChange={e => setEditing({ ...editing, min_amount: e.target.value })} />
            <Input label="Max amount (₹, blank = ∞)" type="number" value={editing.max_amount ?? ""} onChange={e => setEditing({ ...editing, max_amount: e.target.value || null })} />
            <Input label="Coverage days" type="number" value={editing.coverage_days} onChange={e => setEditing({ ...editing, coverage_days: e.target.value })} />
            <Input label="Coverage limit (₹)" type="number" value={editing.coverage_limit} onChange={e => setEditing({ ...editing, coverage_limit: e.target.value })} />
            <Input label="Claim window days" type="number" value={editing.claim_window_days} onChange={e => setEditing({ ...editing, claim_window_days: e.target.value })} />
            <div className="flex justify-end gap-2.5 sm:col-span-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button disabled={busy || !editing.name || !editing.description} onClick={save}>{busy ? "Saving…" : "Save rule"}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
