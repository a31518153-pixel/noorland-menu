"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChefHat,
  CircleAlert,
  Clock3,
  ConciergeBell,
  Receipt,
  UtensilsCrossed,
  X,
} from "lucide-react";
import type { OrderDTO } from "@/lib/shared";
import { STATUS_META, formatIQD } from "@/lib/shared";

interface Props {
  orderId: number;
  onClose: () => void;
  onFinished: () => void;
}

const STEPS = [
  { key: "pending", label: "تم استلام طلبك", desc: "بانتظار موافقة الكابتن", icon: Clock3 },
  { key: "accepted", label: "تم القبول — قيد التحضير", desc: "المطبخ يجهّز أطباقك الآن", icon: ChefHat },
  { key: "served", label: "تم التقديم", desc: "بالعافية! أطباقك على الطاولة", icon: ConciergeBell },
  { key: "completed", label: "اكتمل الطلب", desc: "نتشرف بزيارتك مجدداً", icon: UtensilsCrossed },
] as const;

function stepIndex(status: OrderDTO["status"]): number {
  if (status === "rejected") return -1;
  return STEPS.findIndex((s) => s.key === status);
}

export function OrderTracker({ orderId, onClose, onFinished }: Props) {
  const [order, setOrder] = useState<OrderDTO | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
      }
    } catch {
      /* keep polling */
    }
  }, [orderId]);

  useEffect(() => {
    poll();
    const t = setInterval(poll, 4000);
    return () => clearInterval(t);
  }, [poll]);

  const idx = order ? stepIndex(order.status) : 0;
  const rejected = order?.status === "rejected";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] overflow-y-auto bg-ink/95 backdrop-blur-xl"
    >
      <div className="mx-auto min-h-full w-full max-w-lg px-5 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gold">
            <Receipt className="h-5 w-5" />
            <span className="text-sm font-bold">متابعة الطلب المباشرة</span>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-sand transition hover:bg-white/10"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!order ? (
          <div className="mt-24 text-center text-sand">جارٍ تحميل الطلب…</div>
        ) : (
          <>
            <div className="mt-8 text-center">
              <p className="text-xs text-sand">رقم الطلب</p>
              <h2 className="mt-1 text-5xl font-black tracking-tight gold-text">#{order.id}</h2>
              <p className="mt-2 text-xs text-sand">
                طاولة {order.tableNumber}
                {order.customerName ? ` • ${order.customerName}` : ""}
              </p>
              <span
                className={`mt-3 inline-block rounded-full px-4 py-1.5 text-xs font-bold ${
                  rejected
                    ? "border border-red-500/40 bg-red-500/10 text-red-300"
                    : "border border-gold/40 bg-gold/10 text-gold-2"
                }`}
              >
                {STATUS_META[order.status].ar}
              </span>
            </div>

            {rejected ? (
              <div className="mt-8 rounded-3xl border border-red-500/30 bg-red-500/[0.07] p-6 text-center">
                <CircleAlert className="mx-auto h-10 w-10 text-red-400" />
                <h3 className="mt-3 font-bold text-red-200">نعتذر، تم رفض الطلب</h3>
                <p className="mt-1 text-xs text-sand">يرجى التواصل مع كابتن الصالة للمساعدة</p>
                <button
                  onClick={onFinished}
                  className="mt-5 w-full rounded-2xl border border-gold/30 bg-gold/10 py-3 text-sm font-bold text-gold-2 transition hover:bg-gold/20"
                >
                  العودة للمنيو
                </button>
              </div>
            ) : (
              <div className="mt-8 space-y-0">
                {STEPS.map((s, i) => {
                  const done = i < idx || order.status === "completed" && i <= idx;
                  const active = i === idx && order.status !== "completed";
                  const Icon = s.icon;
                  return (
                    <div key={s.key} className="relative flex gap-4 pb-7 last:pb-0">
                      {i < STEPS.length - 1 && (
                        <span
                          className={`absolute right-[21px] top-11 h-[calc(100%-44px)] w-px ${
                            i < idx ? "bg-gold" : "bg-white/10"
                          }`}
                        />
                      )}
                      <div
                        className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full border transition ${
                          done
                            ? "border-gold bg-gradient-to-br from-gold-2 to-gold text-ink"
                            : active
                              ? "ring-new border-gold/60 bg-gold/10 text-gold"
                              : "border-white/10 bg-card text-sand/50"
                        }`}
                      >
                        {done ? <Check className="h-5 w-5" strokeWidth={3} /> : <Icon className={`h-5 w-5 ${active ? "animate-pulse" : ""}`} />}
                      </div>
                      <div className="pt-1.5">
                        <p className={`text-sm font-bold ${done || active ? "text-cream" : "text-sand/60"}`}>
                          {s.label}
                        </p>
                        <p className={`mt-0.5 text-[11px] ${active ? "text-gold/90" : "text-sand/50"}`}>{s.desc}</p>
                        {active && (
                          <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-gold">
                            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-gold" /> تحديث مباشر
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 rounded-3xl border border-white/[0.07] bg-card/60 p-5">
              <h3 className="text-sm font-bold text-cream">تفاصيل الطلب</h3>
              <ul className="mt-3 space-y-2">
                {order.items.map((it) => (
                  <li key={it.id} className="flex items-center justify-between text-xs">
                    <span className="text-sand">
                      <span className="font-bold text-gold-2">{it.quantity}×</span> {it.nameAr}
                    </span>
                    <span className="text-cream/80">{formatIQD(it.price * it.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between border-t border-white/[0.07] pt-3">
                <span className="text-xs font-bold text-sand">الإجمالي</span>
                <span className="text-base font-bold text-gold-2">{formatIQD(order.total)}</span>
              </div>
            </div>

            <AnimatePresence>
              {order.status === "completed" && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={onFinished}
                  className="mt-5 w-full rounded-2xl bg-gradient-to-l from-gold-3 via-gold to-gold-2 py-3.5 text-sm font-bold text-ink shadow-xl shadow-gold/25"
                >
                  طلب جديد
                </motion.button>
              )}
            </AnimatePresence>

            <button
              onClick={onClose}
              className="mt-4 w-full rounded-2xl border border-white/10 py-3 text-sm font-bold text-sand transition hover:bg-white/5"
            >
              متابعة تصفح المنيو
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
