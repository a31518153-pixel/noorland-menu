"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BellRing, Minus, Phone, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import type { MenuItem } from "@/db/schema";
import { formatIQD } from "@/lib/shared";

interface Props {
  open: boolean;
  onClose: () => void;
  cart: Record<number, number>;
  itemsById: Map<number, MenuItem>;
  onInc: (id: number) => void;
  onDec: (id: number) => void;
  onClear: () => void;
  lang: "ar" | "en";
}

export function CartDrawer({
  open,
  onClose,
  cart,
  itemsById,
  onInc,
  onDec,
  onClear,
  lang,
}: Props) {
  const t = (ar: string, en: string) => (lang === "ar" ? ar : en);

  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ item: itemsById.get(Number(id))!, qty }))
    .filter((l) => l.item);
  const total = lines.reduce((s, l) => s + l.item.price * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[90] mx-auto flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-t-[28px] border-t border-gold/25 bg-ink-2"
          >
            {/* handle */}
            <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/15" />

            <header className="flex items-center justify-between px-5 pb-3 pt-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-full border border-gold/30 bg-gold/10 text-gold">
                  <ShoppingBag className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-cream">{t("سلة الطلب", "Your Cart")}</h2>
                  <p className="text-[10px] text-sand">{count} {t("صنف", "items")} • {formatIQD(total, lang)}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-sand transition hover:bg-white/10"
                aria-label="close"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="thin-scroll flex-1 overflow-y-auto px-5 pb-4">
              {lines.length === 0 ? (
                <div className="py-14 text-center">
                  <ShoppingBag className="mx-auto h-10 w-10 text-sand/30" />
                  <p className="mt-3 text-sm text-sand">{t("سلتك فارغة — أضف أصنافاً من المنيو", "Your cart is empty — add items from the menu")}</p>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  <AnimatePresence initial={false}>
                    {lines.map(({ item, qty }) => (
                      <motion.li
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -24, height: 0, marginBottom: 0 }}
                        className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-card/80 p-2.5"
                      >
                        {item.image && (
                          <img src={item.image} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-bold text-cream">
                            {lang === "ar" ? item.nameAr : item.nameEn}
                          </p>
                          <p className="text-[11px] text-gold-2">{formatIQD(item.price, lang)}</p>
                        </div>
                        <div className="flex items-center gap-1 rounded-full border border-gold/25 p-0.5">
                          <button onClick={() => onDec(item.id)} className="grid h-6 w-6 place-items-center rounded-full text-gold hover:bg-gold/10">
                            <Minus className="h-3 w-3" strokeWidth={3} />
                          </button>
                          <span className="min-w-4 text-center text-xs font-bold text-cream">{qty}</span>
                          <button onClick={() => onInc(item.id)} className="grid h-6 w-6 place-items-center rounded-full text-gold hover:bg-gold/10">
                            <Plus className="h-3 w-3" strokeWidth={3} />
                          </button>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}

              {lines.length > 0 && (
                <div className="mt-4">
                  <button onClick={onClear} className="flex items-center gap-1 text-[11px] text-sand/70 transition hover:text-red-400">
                    <Trash2 className="h-3 w-3" /> {t("إفراغ السلة", "Clear Cart")}
                  </button>
                </div>
              )}
            </div>

            {lines.length > 0 && (
              <footer className="shrink-0 border-t border-white/[0.06] bg-ink/80 px-5 pb-6 pt-3 backdrop-blur">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs text-sand">{t("الإجمالي", "Total")}</span>
                  <span className="text-lg font-bold text-gold-2">{formatIQD(total, lang)}</span>
                </div>

                {/* زر استدعاء الكابتن — بدون أي إجراء */}
                <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-gold-3 via-gold to-gold-2 py-3.5 text-[15px] font-bold text-ink shadow-xl shadow-gold/25">
                  <BellRing className="h-4 w-4" />
                  {t("استدعاء الكابتن", "Call Captain")}
                </div>

                {/* رسالة الغرف */}
                <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-gold/20 bg-gold/[0.05] px-4 py-2.5">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-gold" />
                  <p className="text-[11px] font-bold text-gold-2">
                    {t("للغرف يرجى الاتصال على الرقم 116", "For room service please call 116")}
                  </p>
                </div>
              </footer>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
