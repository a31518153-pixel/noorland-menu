"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import QRCode from "qrcode";
import {
  AlertTriangle, Banknote, Check, ChevronDown, ClipboardList, FolderPlus, LayoutDashboard,
  Loader2, MapPin, Pencil, Plus, Printer, QrCode as QrIcon, Receipt, RefreshCw, Search,
  Star, Timer, Trash2, TrendingUp, UserCog, UserPlus, UtensilsCrossed, X,
} from "lucide-react";
import type { Category, MenuItem, User } from "@/db/schema";
import type { OrderDTO } from "@/lib/shared";
import { STATUS_META, formatIQD, timeAgoAr } from "@/lib/shared";
import { ItemFormModal } from "./item-form-modal";
import { CategoryFormModal } from "./category-form-modal";
import { UserFormModal } from "./user-form-modal";

interface CategoryBlock {
  category: Category;
  items: MenuItem[];
}

type Tab = "overview" | "orders" | "menu" | "users" | "qr";

const TAB_LIST: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "overview", label: "نظرة عامة", icon: LayoutDashboard },
  { key: "orders", label: "الطلبات", icon: ClipboardList },
  { key: "menu", label: "المنيو", icon: UtensilsCrossed },
  { key: "users", label: "المستخدمين", icon: UserCog },
  { key: "qr", label: "رموز QR", icon: QrIcon },
];

const NEXT_ACTIONS: Partial<Record<OrderDTO["status"], { to: OrderDTO["status"]; label: string; primary?: boolean; danger?: boolean }[]>> = {
  pending: [
    { to: "accepted", label: "قبول", primary: true },
    { to: "rejected", label: "رفض", danger: true },
  ],
  accepted: [{ to: "served", label: "تم التقديم", primary: true }],
  served: [{ to: "completed", label: "إنهاء", primary: true }],
  completed: [{ to: "pending", label: "إعادة فتح" }],
  rejected: [{ to: "pending", label: "إعادة فتح" }],
};

interface ConfirmState {
  title: string;
  message: string;
  action: () => Promise<void>;
}

export function AdminDashboard({ menuData }: { menuData: CategoryBlock[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [updating, setUpdating] = useState<number | null>(null);
  const [menu, setMenu] = useState<CategoryBlock[]>(menuData);
  const [itemModal, setItemModal] = useState<{ item: MenuItem | null; presetCategoryId?: number | null } | null>(null);
  const [catModal, setCatModal] = useState<{ category: Category | null } | null>(null);
  const [userModal, setUserModal] = useState<{ user: User | null } | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // keep local menu in sync after router.refresh()
  useEffect(() => setMenu(menuData), [menuData]);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    if (res.ok) {
      const data = await res.json();
      setUsersList(data.users);
    }
  }, []);

  useEffect(() => { if (tab === "users") fetchUsers(); }, [tab, fetchUsers]);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
      }
    } catch { /* retry next tick */ }
  }, []);

  useEffect(() => {
    fetchOrders();
    const t = setInterval(fetchOrders, 6000);
    return () => clearInterval(t);
  }, [fetchOrders]);

  const setStatus = async (id: number, status: OrderDTO["status"]) => {
    setUpdating(id);
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => undefined);
    await fetchOrders();
    setUpdating(null);
  };

  /* ---------------- CRUD handlers ---------------- */

  const toggleItem = (catId: number, item: MenuItem, patch: Partial<MenuItem>) => {
    setMenu((m) =>
      m.map((b) =>
        b.category.id === catId
          ? { ...b, items: b.items.map((i) => (i.id === item.id ? { ...i, ...patch } : i)) }
          : b,
      ),
    );
    fetch(`/api/menu-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
      .then(() => router.refresh())
      .catch(() => undefined);
  };

  const askDeleteItem = (item: MenuItem) =>
    setConfirm({
      title: `حذف «${item.nameAr}»؟`,
      message: "سيُحذف هذا الصنف نهائياً من المنيو. الطلبات السابقة تحتفظ بسجلّها.",
      action: async () => {
        await fetch(`/api/menu-items/${item.id}`, { method: "DELETE" }).catch(() => undefined);
        router.refresh();
      },
    });

  const askDeleteCategory = (c: Category, itemsCount: number) =>
    setConfirm({
      title: `حذف فئة «${c.nameAr}»؟`,
      message: `سيتم حذف الفئة وجميع أصنافها (${itemsCount} صنف) نهائياً. هذا الإجراء لا يمكن التراجع عنه.`,
      action: async () => {
        await fetch(`/api/categories/${c.id}`, { method: "DELETE" }).catch(() => undefined);
        router.refresh();
      },
    });

  const askDeleteOrder = (o: OrderDTO) =>
    setConfirm({
      title: `حذف الطلب #${o.id}؟`,
      message: `طاولة ${o.tableNumber} • ${formatIQD(o.total)} — سيُحذف نهائياً من السجلات.`,
      action: async () => {
        await fetch(`/api/orders/${o.id}`, { method: "DELETE" }).catch(() => undefined);
        await fetchOrders();
      },
    });

  const askClearFinished = (count: number) =>
    setConfirm({
      title: "حذف جميع الطلبات المنتهية؟",
      message: `سيتم حذف ${count} طلباً (مكتمل + مرفوض) لتنظيف السجلات.`,
      action: async () => {
        const done = orders.filter((o) => o.status === "completed" || o.status === "rejected");
        await Promise.all(done.map((o) => fetch(`/api/orders/${o.id}`, { method: "DELETE" }).catch(() => undefined)));
        await fetchOrders();
      },
    });

  const runConfirm = async () => {
    if (!confirm) return;
    setConfirmBusy(true);
    try {
      await confirm.action();
    } finally {
      setConfirmBusy(false);
      setConfirm(null);
    }
  };

  const stats = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const today = orders.filter((o) => new Date(o.createdAt) >= startOfDay);
    const valid = today.filter((o) => o.status !== "rejected");
    const revenue = valid.reduce((s, o) => s + o.total, 0);
    const pending = today.filter((o) => o.status === "pending").length;

    const counter = new Map<string, number>();
    for (const o of valid) for (const it of o.items) counter.set(it.nameAr, (counter.get(it.nameAr) ?? 0) + it.quantity);
    const top = [...counter.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    return { count: today.length, revenue, pending, avg: valid.length ? Math.round(revenue / valid.length) : 0, top };
  }, [orders]);

  return (
    <div className="min-h-screen bg-ink">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-gold/40 bg-gold/10 text-gold">
              <LayoutDashboard className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-xl font-bold leading-none text-cream">لوحة التحكم</h1>
              <p className="mt-1 text-[10px] tracking-widest text-sand">NOOR LAND HOTEL</p>
            </div>
          </div>
          <button
            onClick={() => { fetchOrders(); router.refresh(); }}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-sand transition hover:border-gold/40 hover:text-gold"
            aria-label="تحديث"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <div className="no-scrollbar mx-auto flex max-w-6xl gap-1.5 overflow-x-auto px-4 pb-2.5">
          {TAB_LIST.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                  active ? "border-gold/60 bg-gold/15 text-gold-2" : "border-white/[0.07] text-sand hover:border-gold/30 hover:text-cream"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {tab === "overview" && <Overview stats={stats} orders={orders} />}
            {tab === "orders" && (
              <OrdersTab
                orders={orders}
                updating={updating}
                onStatus={setStatus}
                onDelete={askDeleteOrder}
                onClearFinished={askClearFinished}
              />
            )}
            {tab === "menu" && (
              <MenuTab
                menu={menu}
                onToggle={(catId, item) => toggleItem(catId, item, { available: !item.available })}
                onToggleFeatured={(catId, item) => toggleItem(catId, item, { featured: !item.featured })}
                onAddItem={(presetCategoryId) => setItemModal({ item: null, presetCategoryId })}
                onEditItem={(item) => setItemModal({ item })}
                onDeleteItem={askDeleteItem}
                onAddCategory={() => setCatModal({ category: null })}
                onEditCategory={(category) => setCatModal({ category })}
                onDeleteCategory={askDeleteCategory}
              />
            )}
            {tab === "users" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold text-cream">إدارة طاقم العمل</h2>
                  <button onClick={() => setUserModal({ user: null })} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-gold-3 via-gold to-gold-2 px-4 py-2 text-xs font-bold text-ink shadow-lg shadow-gold/20">
                    <UserPlus className="h-4 w-4" /> إضافة مستخدم
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {usersList.map((u) => (
                    <div key={u.id} className="rounded-3xl border border-white/[0.07] bg-card/70 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gold/10 text-gold font-bold">
                            {u.username[0].toUpperCase()}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-cream">{u.fullName}</p>
                            <p className="text-[10px] text-sand">@{u.username} • {u.role === "admin" ? "مدير" : "كابتن"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setUserModal({ user: u })} className="grid h-8 w-8 place-items-center rounded-full border border-white/10 text-sand hover:text-gold transition">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setConfirm({ title: `حذف ${u.fullName}؟`, message: "سيتم سحب صلاحيات هذا المستخدم نهائياً.", action: async () => { await fetch(`/api/users/${u.id}`, { method: "DELETE" }); fetchUsers(); } })} className="grid h-8 w-8 place-items-center rounded-full border border-red-500/20 text-red-400 hover:bg-red-500/10 transition">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-3">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${u.active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                          {u.active ? "نشط حالياً" : "حساب معطل"}
                        </span>
                        <span className="text-[9px] text-sand/40">منذ {new Date(u.createdAt).toLocaleDateString("ar-EG")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {tab === "qr" && <QrTab />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* modals */}
      <ItemFormModal
        open={itemModal !== null}
        onClose={() => setItemModal(null)}
        onSaved={() => router.refresh()}
        categories={menu.map((b) => b.category)}
        item={itemModal?.item ?? null}
        presetCategoryId={itemModal?.presetCategoryId ?? null}
      />
      <CategoryFormModal
        open={catModal !== null}
        onClose={() => setCatModal(null)}
        onSaved={() => router.refresh()}
        category={catModal?.category ?? null}
      />
      <UserFormModal
        open={userModal !== null}
        onClose={() => setUserModal(null)}
        onSaved={fetchUsers}
        user={userModal?.user ?? null}
      />
      <ConfirmDialog state={confirm} busy={confirmBusy} onCancel={() => setConfirm(null)} onConfirm={runConfirm} />
    </div>
  );
}

/* ============================== confirm dialog ============================== */

function ConfirmDialog({
  state, busy, onCancel, onConfirm,
}: {
  state: ConfirmState | null; busy: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <AnimatePresence>
      {state && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 z-[95] bg-black/75 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            className="fixed inset-x-4 top-1/2 z-[96] mx-auto max-w-sm -translate-y-1/2 rounded-3xl border border-red-500/30 bg-ink-2 p-6 text-center"
          >
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-red-500/40 bg-red-500/10 text-red-400">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <h3 className="mt-3 font-display text-xl font-bold text-cream">{state.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-sand">{state.message}</p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={onCancel}
                className="flex-1 rounded-xl border border-white/15 py-2.5 text-xs font-bold text-sand transition hover:bg-white/5"
              >
                إلغاء
              </button>
              <button
                onClick={onConfirm}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-500 py-2.5 text-xs font-bold text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                تأكيد الحذف
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ============================== overview ============================== */

function Overview({
  stats,
  orders,
}: {
  stats: { count: number; revenue: number; pending: number; avg: number; top: [string, number][] };
  orders: OrderDTO[];
}) {
  const cards = [
    { icon: Receipt, label: "طلبات اليوم", value: String(stats.count), sub: "طلب" },
    { icon: Banknote, label: "إيراد اليوم", value: formatIQD(stats.revenue), sub: "غير شامل المرفوض" },
    { icon: Timer, label: "بانتظار الموافقة", value: String(stats.pending), sub: "طلب معلّق" },
    { icon: TrendingUp, label: "متوسط الطلب", value: formatIQD(stats.avg), sub: "لكل طلب" },
  ];
  const maxTop = stats.top[0]?.[1] ?? 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-3xl border border-white/[0.07] bg-card/70 p-4">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold">
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-3 text-lg font-black text-cream sm:text-xl">{c.value}</p>
              <p className="mt-0.5 text-[11px] font-bold text-sand">{c.label}</p>
              <p className="text-[10px] text-sand/50">{c.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/[0.07] bg-card/70 p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-cream">
            <TrendingUp className="h-4 w-4 text-gold" /> الأصناف الأكثر طلباً اليوم
          </h3>
          {stats.top.length === 0 ? (
            <p className="mt-6 text-center text-xs text-sand">لا توجد طلبات بعد اليوم</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {stats.top.map(([name, qty], i) => (
                <li key={name}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-cream/90">
                      <span className="ml-1.5 text-gold/70">{i + 1}.</span> {name}
                    </span>
                    <span className="font-bold text-gold-2">{qty}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(qty / maxTop) * 100}%` }}
                      transition={{ duration: 0.8, delay: i * 0.08 }}
                      className="h-full rounded-full bg-gradient-to-l from-gold-3 via-gold to-gold-2"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl border border-white/[0.07] bg-card/70 p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-cream">
            <ClipboardList className="h-4 w-4 text-gold" /> أحدث الطلبات
          </h3>
          <ul className="mt-4 space-y-2">
            {orders.slice(0, 6).map((o) => (
              <li key={o.id} className="flex items-center justify-between rounded-2xl bg-white/[0.03] px-3.5 py-2.5 text-xs">
                <span className="flex items-center gap-2 font-bold text-cream/90">
                  <MapPin className="h-3.5 w-3.5 text-gold" /> طاولة {o.tableNumber}
                  <span className="text-[10px] font-normal text-sand/50">#{o.id}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-gold-2">{formatIQD(o.total)}</span>
                  <StatusBadge status={o.status} />
                </span>
              </li>
            ))}
            {orders.length === 0 && <p className="py-6 text-center text-xs text-sand">لا توجد طلبات بعد</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: OrderDTO["status"] }) {
  const meta = STATUS_META[status];
  const tone: Record<string, string> = {
    gold: "border-gold/40 bg-gold/10 text-gold-2",
    sky: "border-sky-400/40 bg-sky-400/10 text-sky-300",
    mint: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
    zinc: "border-white/15 bg-white/5 text-sand",
    red: "border-red-500/40 bg-red-500/10 text-red-300",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${tone[meta.tone]}`}>{meta.ar}</span>
  );
}

/* ============================== orders tab ============================== */

function OrdersTab({
  orders,
  updating,
  onStatus,
  onDelete,
  onClearFinished,
}: {
  orders: OrderDTO[];
  updating: number | null;
  onStatus: (id: number, s: OrderDTO["status"]) => void;
  onDelete: (o: OrderDTO) => void;
  onClearFinished: (count: number) => void;
}) {
  const [filter, setFilter] = useState<"all" | OrderDTO["status"]>("all");
  const list = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const finishedCount = orders.filter((o) => o.status === "completed" || o.status === "rejected").length;

  return (
    <div>
      <div className="no-scrollbar mb-4 flex items-center gap-1.5 overflow-x-auto">
        {(["all", "pending", "accepted", "served", "completed", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              filter === f ? "border-gold/60 bg-gold/15 text-gold-2" : "border-white/[0.07] text-sand hover:text-cream"
            }`}
          >
            {f === "all" ? "الكل" : STATUS_META[f].ar}
          </button>
        ))}
        {finishedCount > 0 && (
          <button
            onClick={() => onClearFinished(finishedCount)}
            className="mr-auto flex shrink-0 items-center gap-1.5 rounded-full border border-red-500/40 px-3 py-1.5 text-xs font-bold text-red-300 transition hover:bg-red-500/10"
          >
            <Trash2 className="h-3 w-3" /> حذف المنتهية ({finishedCount})
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <p className="py-16 text-center text-sm text-sand">لا توجد طلبات مطابقة</p>
      ) : (
        <div className="space-y-3">
          {list.map((o) => {
            const actions = NEXT_ACTIONS[o.status] ?? [];
            return (
              <div key={o.id} className="rounded-3xl border border-white/[0.07] bg-card/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl border border-gold/30 bg-gold/10">
                      <MapPin className="h-5 w-5 text-gold" />
                    </span>
                    <div>
                      <p className="text-sm font-black text-cream">
                        طاولة {o.tableNumber} <span className="text-[10px] font-normal text-sand/50">#{o.id}</span>
                      </p>
                      <p className="text-[10px] text-sand">
                        {timeAgoAr(o.createdAt)}
                        {o.customerName ? ` • ${o.customerName}` : ""} • {o.items.reduce((s, i) => s + i.quantity, 0)} صنف
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-gold-2">{formatIQD(o.total)}</span>
                    <StatusBadge status={o.status} />
                    <button
                      onClick={() => onDelete(o)}
                      className="grid h-7 w-7 place-items-center rounded-full border border-red-500/30 text-red-400 transition hover:bg-red-500/10"
                      aria-label="حذف الطلب"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {o.items.map((it) => (
                    <span key={it.id} className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] text-cream/80">
                      {it.quantity}× {it.nameAr}
                    </span>
                  ))}
                </div>
                {o.notes && (
                  <p className="mt-2 rounded-xl border border-gold/25 bg-gold/[0.07] px-3 py-1.5 text-[11px] text-gold-2">
                    ملاحظات: {o.notes}
                  </p>
                )}

                <div className="mt-3 flex gap-2">
                  {updating === o.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-sand" />
                  ) : (
                    actions.map((a) => (
                      <button
                        key={a.to}
                        onClick={() => onStatus(o.id, a.to)}
                        className={`flex items-center gap-1 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                          a.primary
                            ? "bg-gradient-to-l from-gold-3 via-gold to-gold-2 text-ink"
                            : a.danger
                              ? "border border-red-500/40 text-red-300 hover:bg-red-500/10"
                              : "border border-white/15 text-sand hover:bg-white/5"
                        }`}
                      >
                        {a.to === "accepted" ? <Check className="h-3.5 w-3.5" /> : a.to === "rejected" ? <X className="h-3.5 w-3.5" /> : null}
                        {a.label}
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================== menu tab ============================== */

function MenuTab({
  menu,
  onToggle,
  onToggleFeatured,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}: {
  menu: CategoryBlock[];
  onToggle: (catId: number, item: MenuItem) => void;
  onToggleFeatured: (catId: number, item: MenuItem) => void;
  onAddItem: (presetCategoryId?: number | null) => void;
  onEditItem: (item: MenuItem) => void;
  onDeleteItem: (item: MenuItem) => void;
  onAddCategory: () => void;
  onEditCategory: (c: Category) => void;
  onDeleteCategory: (c: Category, itemsCount: number) => void;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim();
    return menu
      .map((b) => ({
        ...b,
        items: needle
          ? b.items.filter((i) => i.nameAr.includes(needle) || i.nameEn.toLowerCase().includes(needle.toLowerCase()))
          : b.items,
      }))
      .filter((b) => b.items.length > 0);
  }, [menu, q]);

  const availableCount = menu.reduce((s, b) => s + b.items.filter((i) => i.available).length, 0);
  const totalCount = menu.reduce((s, b) => s + b.items.length, 0);

  return (
    <div>
      {/* toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => onAddItem(null)}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-gold-3 via-gold to-gold-2 px-4 py-2.5 text-xs font-bold text-ink shadow-lg shadow-gold/20"
        >
          <Plus className="h-4 w-4" strokeWidth={3} /> إضافة صنف
        </button>
        <button
          onClick={onAddCategory}
          className="flex items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2.5 text-xs font-bold text-gold-2 transition hover:bg-gold/20"
        >
          <FolderPlus className="h-4 w-4" /> إضافة فئة
        </button>
        <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-card/60 px-4 py-2.5">
          <Search className="h-4 w-4 text-gold" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث في المنيو…"
            className="w-full bg-transparent text-sm text-cream placeholder:text-sand/50 focus:outline-none"
          />
        </div>
        <span className="rounded-full border border-white/10 px-3 py-2 text-[11px] font-bold text-sand">
          متوفر {availableCount} / {totalCount}
        </span>
      </div>

      <div className="space-y-3">
        {filtered.map(({ category, items }) => {
          const isOpen = open === category.id || q.trim().length > 0;
          const off = items.filter((i) => !i.available).length;
          return (
            <div key={category.id} className="overflow-hidden rounded-3xl border border-white/[0.07] bg-card/70">
              <div className="flex w-full items-center justify-between px-4 py-3 sm:px-5">
                <button onClick={() => setOpen(isOpen && q.trim().length === 0 ? null : category.id)} className="flex flex-1 items-center gap-2 text-start">
                  <ChevronDown className={`h-4 w-4 shrink-0 text-sand transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  <span className="font-display text-lg font-bold text-cream">{category.nameAr}</span>
                  <span className="text-[10px] tracking-widest text-sand/50">{category.nameEn}</span>
                  <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-bold text-sand">{items.length}</span>
                  {off > 0 && (
                    <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">{off} غير متوفر</span>
                  )}
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onAddItem(category.id)}
                    title="إضافة صنف لهذه الفئة"
                    className="grid h-7 w-7 place-items-center rounded-full border border-gold/30 text-gold transition hover:bg-gold/10"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                  </button>
                  <button
                    onClick={() => onEditCategory(category)}
                    title="تعديل الفئة"
                    className="grid h-7 w-7 place-items-center rounded-full border border-white/15 text-sand transition hover:border-gold/40 hover:text-gold"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => onDeleteCategory(category, items.length)}
                    title="حذف الفئة"
                    className="grid h-7 w-7 place-items-center rounded-full border border-red-500/30 text-red-400 transition hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              {isOpen && (
                <ul className="border-t border-white/[0.05]">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-center gap-2.5 border-b border-white/[0.04] px-4 py-2.5 last:border-0 sm:px-5">
                      {item.image && <img src={item.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" loading="lazy" />}
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-[13px] font-bold ${item.available ? "text-cream" : "text-sand/50 line-through"}`}>
                          {item.nameAr}
                        </p>
                        <p className="text-[10px] text-gold-2/80">{formatIQD(item.price)}</p>
                      </div>
                      <button
                        onClick={() => onToggleFeatured(category.id, item)}
                        title="توقيع الشيف"
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border transition ${
                          item.featured ? "border-gold/50 bg-gold/15 text-gold" : "border-white/10 text-sand/40 hover:text-gold"
                        }`}
                      >
                        <Star className="h-3.5 w-3.5" fill={item.featured ? "currentColor" : "none"} />
                      </button>
                      <button
                        onClick={() => onEditItem(item)}
                        title="تعديل"
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/15 text-sand transition hover:border-gold/40 hover:text-gold"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => onDeleteItem(item)}
                        title="حذف"
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-red-500/30 text-red-400 transition hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => onToggle(category.id, item)}
                        role="switch"
                        aria-checked={item.available}
                        title="التوفر"
                        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                          item.available ? "bg-gradient-to-l from-gold-3 to-gold" : "bg-white/10"
                        }`}
                      >
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${item.available ? "left-0.5" : "left-[22px]"}`} />
                      </button>
                    </li>
                  ))}
                  {items.length === 0 && (
                    <li className="px-5 py-4 text-center text-xs text-sand">فئة فارغة — أضف أصنافاً إليها</li>
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== QR tab ============================== */

function QrTab() {
  const [count, setCount] = useState(12);
  const [origin, setOrigin] = useState("");
  const [codes, setCodes] = useState<{ table: number; url: string; dataUrl: string }[]>([]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!origin) return;
    let cancelled = false;
    (async () => {
      const out = [];
      for (let t = 1; t <= count; t++) {
        const url = `${origin}/?table=${t}`;
        const dataUrl = await QRCode.toDataURL(url, {
          margin: 1,
          width: 480,
          color: { dark: "#1a1405", light: "#ffffff" },
        });
        out.push({ table: t, url, dataUrl });
      }
      if (!cancelled) setCodes(out);
    })();
    return () => { cancelled = true; };
  }, [count, origin]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-3xl border border-white/[0.07] bg-card/70 p-4">
        <QrIcon className="h-5 w-5 text-gold" />
        <p className="flex-1 text-xs leading-relaxed text-sand">
          حدّد عدد الطاولات ثم اطبع الرموز. كل رمز يفتح المنيو مباشرة مع رقم الطاولة محفوظاً.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={60}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
            className="w-20 rounded-xl border border-white/10 bg-ink px-3 py-2 text-center text-sm font-bold text-cream focus:border-gold/40 focus:outline-none"
          />
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-gold-3 via-gold to-gold-2 px-4 py-2.5 text-xs font-bold text-ink"
          >
            <Printer className="h-4 w-4" /> طباعة
          </button>
        </div>
      </div>

      <div id="qr-sheet" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {codes.map((c) => (
          <div key={c.table} className="qr-card flex flex-col items-center rounded-3xl border border-gold/25 bg-white p-4 text-center text-ink">
            <p className="font-display text-2xl font-bold text-[#7a5c14]">نور لاند</p>
            <p className="text-[9px] font-bold tracking-[0.3em] text-[#a58a45]">NOOR LAND • AL MURJAN</p>
            <img src={c.dataUrl} alt={`QR table ${c.table}`} className="mt-3 w-full max-w-[170px] rounded-xl" />
            <p className="mt-3 rounded-full bg-[#f4e9c8] px-4 py-1 text-sm font-black text-[#7a5c14]">طاولة {c.table}</p>
            <p className="mt-1.5 text-[9px] text-[#8a7a55]">امسح الرمز لعرض المنيو والطلب</p>
          </div>
        ))}
      </div>
    </div>
  );
}
