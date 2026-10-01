"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BellRing, Check, ChefHat, CircleCheck, Clock3, ConciergeBell, Loader2, MapPin,
  RefreshCw, ScrollText, User, Volume2, VolumeX, X,
} from "lucide-react";
import type { OrderDTO } from "@/lib/shared";
import { STATUS_META, formatIQD, timeAgoAr } from "@/lib/shared";

type Tab = "pending" | "active" | "done" | "all";

const TABS: { key: Tab; label: string }[] = [
  { key: "pending", label: "طلبات جديدة" },
  { key: "active", label: "قيد التنفيذ" },
  { key: "done", label: "منتهية" },
  { key: "all", label: "الكل" },
];

export function CaptainBoard() {
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("pending");
  const [updating, setUpdating] = useState<number | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [flashIds, setFlashIds] = useState<number[]>([]);
  const knownPending = useRef<Set<number> | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);

  // --- audio ---
  const ensureAudio = useCallback(() => {
    if (!audioCtx.current) {
      try {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtx.current = new AC();
      } catch { /* unsupported */ }
    }
    if (audioCtx.current?.state === "suspended") audioCtx.current.resume().catch(() => undefined);
  }, []);

  const playDing = useCallback(() => {
    if (!soundOn) return;
    ensureAudio();
    const ctx = audioCtx.current;
    if (!ctx) return;
    const t0 = ctx.currentTime;
    [880, 1174.66, 1567.98].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0 + i * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.35, t0 + i * 0.14 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.14 + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + i * 0.14);
      osc.stop(t0 + i * 0.14 + 0.55);
    });
  }, [ensureAudio, soundOn]);

  useEffect(() => {
    const unlock = () => ensureAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, [ensureAudio]);

  // --- polling ---
  const fetchOrders = useCallback(async (initial = false) => {
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      if (!res.ok) return;
      const data: { orders: OrderDTO[] } = await res.json();
      setOrders(data.orders);

      const pendingIds = data.orders.filter((o) => o.status === "pending").map((o) => o.id);
      if (knownPending.current === null) {
        knownPending.current = new Set(pendingIds);
      } else {
        const fresh = pendingIds.filter((id) => !knownPending.current!.has(id));
        if (fresh.length > 0) {
          playDing();
          setFlashIds((f) => [...f, ...fresh]);
          setTimeout(() => setFlashIds((f) => f.filter((id) => !fresh.includes(id))), 9000);
        }
        knownPending.current = new Set(pendingIds);
      }
    } finally {
      if (initial) setLoading(false);
    }
  }, [playDing]);

  useEffect(() => {
    fetchOrders(true);
    const t = setInterval(() => fetchOrders(), 4000);
    const clock = setInterval(() => setNow(Date.now()), 15000);
    
    // Continuous alert interval
    const alarm = setInterval(() => {
      const hasPending = orders.some(o => o.status === "pending");
      if (hasPending && soundOn) {
        playDing();
      }
    }, 5000);

    return () => { 
      clearInterval(t); 
      clearInterval(clock); 
      clearInterval(alarm);
    };
  }, [fetchOrders, orders, soundOn, playDing]);

  // --- actions ---
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

  const counts = useMemo(
    () => ({
      pending: orders.filter((o) => o.status === "pending").length,
      active: orders.filter((o) => o.status === "accepted" || o.status === "served").length,
      done: orders.filter((o) => o.status === "completed" || o.status === "rejected").length,
    }),
    [orders],
  );

  const filtered = useMemo(() => {
    switch (tab) {
      case "pending": return orders.filter((o) => o.status === "pending");
      case "active": return orders.filter((o) => o.status === "accepted" || o.status === "served");
      case "done": return orders.filter((o) => o.status === "completed" || o.status === "rejected");
      default: return orders;
    }
  }, [orders, tab]);

  return (
    <div className="min-h-screen bg-ink">
      {/* header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-gold/40 bg-gold/10 text-gold">
              <ConciergeBell className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-xl font-bold leading-none text-cream">لوحة الكابتن</h1>
              <p className="mt-1 text-[10px] tracking-widest text-sand">NOOR LAND HOTEL</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`relative flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${
              counts.pending > 0 ? "border-gold/50 bg-gold/15 text-gold-2" : "border-white/10 text-sand"
            }`}>
              {counts.pending > 0 && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-ping rounded-full bg-gold" />}
              <BellRing className="h-3.5 w-3.5" />
              {counts.pending} جديد
            </span>
            <button
              onClick={() => setSoundOn((s) => { const n = !s; if (n) { ensureAudio(); } return n; })}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-sand transition hover:border-gold/40 hover:text-gold"
              aria-label="الصوت"
            >
              {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button
              onClick={() => fetchOrders()}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-sand transition hover:border-gold/40 hover:text-gold"
              aria-label="تحديث"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* tabs */}
        <div className="no-scrollbar mx-auto flex max-w-6xl gap-1.5 overflow-x-auto px-4 pb-2.5">
          {TABS.map((t) => {
            const count = t.key === "pending" ? counts.pending : t.key === "active" ? counts.active : t.key === "done" ? counts.done : orders.length;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                  active
                    ? "border-gold/60 bg-gold/15 text-gold-2"
                    : "border-white/[0.07] text-sand hover:border-gold/30 hover:text-cream"
                }`}
              >
                {t.label}
                <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-gold/25" : "bg-white/[0.06]"}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* body */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-3xl border border-white/[0.05] bg-card/50" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center">
            <ScrollText className="mx-auto h-12 w-12 text-sand/25" />
            <p className="mt-4 font-bold text-cream/80">لا توجد طلبات هنا</p>
            <p className="mt-1 text-xs text-sand">ستظهر الطلبات الجديدة فور وصولها مع تنبيه صوتي</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence initial={false}>
              {filtered.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  now={now}
                  flash={flashIds.includes(order.id)}
                  updating={updating === order.id}
                  onStatus={setStatus}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}

const TONE: Record<string, string> = {
  gold: "border-gold/50 bg-gold/10 text-gold-2",
  sky: "border-sky-400/40 bg-sky-400/10 text-sky-300",
  mint: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  zinc: "border-white/15 bg-white/5 text-sand",
  red: "border-red-500/40 bg-red-500/10 text-red-300",
};

function OrderCard({
  order,
  now,
  flash,
  updating,
  onStatus,
}: {
  order: OrderDTO;
  now: number;
  flash: boolean;
  updating: boolean;
  onStatus: (id: number, s: OrderDTO["status"]) => void;
}) {
  const meta = STATUS_META[order.status];
  const isNew = Date.now() - new Date(order.createdAt).getTime() < 120000 && order.status === "pending";
  void now;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`relative flex flex-col overflow-hidden rounded-3xl border bg-card/80 ${
        flash || isNew ? "ring-new border-gold/60" : "border-white/[0.07]"
      }`}
    >
      {(flash || isNew) && (
        <div className="flex items-center justify-center gap-1.5 bg-gradient-to-l from-gold/25 to-gold/10 py-1.5 text-[10px] font-black tracking-widest text-gold-2">
          <BellRing className="h-3 w-3 animate-bounce" /> طلب جديد وصل الآن
        </div>
      )}

      <div className="flex items-start justify-between p-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/20 to-transparent">
              <MapPin className="h-5 w-5 text-gold" />
            </span>
            <div>
              <p className="text-[10px] font-medium text-sand">طاولة</p>
              <p className="text-2xl font-black leading-none text-cream">{order.tableNumber}</p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-2 text-[10px] text-sand">
            <span className="flex items-center gap-1">
              <Clock3 className="h-3 w-3" /> {timeAgoAr(order.createdAt)}
            </span>
            {order.customerName && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" /> {order.customerName}
              </span>
            )}
            <span className="text-sand/40">#{order.id}</span>
          </div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${TONE[meta.tone]}`}>
          {meta.ar}
        </span>
      </div>

      <ul className="thin-scroll max-h-36 space-y-1.5 overflow-y-auto px-4 py-2">
        {order.items.map((it) => (
          <li key={it.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-1.5 text-xs">
            <span className="text-cream/90">
              <span className="ml-1 font-black text-gold-2">{it.quantity}×</span> {it.nameAr}
            </span>
            <span className="text-[10px] text-sand">{formatIQD(it.price * it.quantity)}</span>
          </li>
        ))}
      </ul>

      {order.notes && (
        <div className="mx-4 mt-1 rounded-xl border border-gold/25 bg-gold/[0.07] px-3 py-2 text-[11px] leading-relaxed text-gold-2">
          <span className="font-bold">ملاحظات: </span>{order.notes}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between px-4 pt-3">
        <span className="text-[10px] text-sand">الإجمالي</span>
        <span className="text-base font-black text-gold-2">{formatIQD(order.total)}</span>
      </div>

      <div className="flex gap-2 p-4 pt-2.5">
        {updating ? (
          <div className="flex w-full items-center justify-center gap-2 py-2.5 text-sand">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <>
            {order.status === "pending" && (
              <>
                <ActionBtn onClick={() => onStatus(order.id, "accepted")} primary icon={<Check className="h-4 w-4" strokeWidth={3} />} label="قبول الطلب" />
                <ActionBtn onClick={() => onStatus(order.id, "rejected")} danger icon={<X className="h-4 w-4" strokeWidth={3} />} label="رفض" />
              </>
            )}
            {order.status === "accepted" && (
              <ActionBtn onClick={() => onStatus(order.id, "served")} primary icon={<ChefHat className="h-4 w-4" />} label="تم التقديم على الطاولة" />
            )}
            {order.status === "served" && (
              <ActionBtn onClick={() => onStatus(order.id, "completed")} primary icon={<CircleCheck className="h-4 w-4" />} label="إنهاء الطلب" />
            )}
          </>
        )}
      </div>
    </motion.article>
  );
}

function ActionBtn({
  onClick, primary, danger, icon, label,
}: {
  onClick: () => void; primary?: boolean; danger?: boolean; icon: React.ReactNode; label: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition ${
        primary
          ? "bg-gradient-to-l from-gold-3 via-gold to-gold-2 text-ink shadow-lg shadow-gold/20"
          : danger
            ? "border border-red-500/40 text-red-300 hover:bg-red-500/10"
            : ""
      }`}
    >
      {icon} {label}
    </motion.button>
  );
}
