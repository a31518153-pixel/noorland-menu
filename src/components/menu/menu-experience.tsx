"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Apple, Beef, CakeSlice, ChevronDown, Citrus, Coffee, ConciergeBell, Croissant, CupSoda, Fish,
  Flame, FlameKindling, GlassWater, Grape, IceCreamBowl, Layers, LayoutGrid, Leaf, MapPin, Martini,
  Milk, Pizza, Salad, Sandwich, Search, ShoppingBag, Soup, Sparkles, UtensilsCrossed, Wheat, Wind, Wine,
} from "lucide-react";
import type { Category, MenuItem } from "@/db/schema";
import { formatIQD } from "@/lib/shared";
import { MenuItemCard, FeatureCard } from "./item-card";
import { CartDrawer } from "./cart-drawer";
import { OrderTracker } from "./order-tracker";

export interface CategoryBlock {
  category: Category;
  items: MenuItem[];
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  soups: Soup, salads: Salad, "cold-mezza": Grape, "hot-mezza": Flame, pasta: Wheat,
  oriental: UtensilsCrossed, international: Beef, seafood: Fish, sandwiches: Sandwich,
  bbq: FlameKindling, pizza: Pizza, desserts: CakeSlice, "hot-drinks": Coffee, tea: Leaf,
  "iced-coffee": GlassWater, juices: Citrus, mojitos: Martini, smoothies: Milk,
  milkshakes: IceCreamBowl, "fruit-salads": Apple, cocktails: Wine, crepes: Croissant,
  waffles: LayoutGrid, pancakes: Layers, beverages: CupSoda, shisha: Wind,
};

interface Props {
  data: CategoryBlock[];
  initialTable: string | null;
  heroImage: string;
}

export function MenuExperience({ data, initialTable, heroImage }: Props) {
  const [cart, setCart] = useState<Record<number, number>>({});
  const [table, setTable] = useState<string | null>(initialTable);
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [trackedId, setTrackedId] = useState<number | null>(null);
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeSlug, setActiveSlug] = useState(data[0]?.category.slug ?? "");
  const railRef = useRef<HTMLDivElement>(null);

  const t = (ar: string, en: string) => (lang === "ar" ? ar : en);

  // ---- persistence ----
  useEffect(() => {
    try {
      const c = localStorage.getItem("noor-cart");
      if (c) setCart(JSON.parse(c));
      const t = localStorage.getItem("noor-table");
      if (!initialTable && t) setTable(t);
      // Removed auto showTablePicker
      const o = localStorage.getItem("noor-active-order");
      if (o) setTrackedId(Number(o));
    } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try { localStorage.setItem("noor-cart", JSON.stringify(cart)); } catch { /* noop */ }
  }, [cart]);

  const updateTable = (t: string) => {
    setTable(t);
    try { localStorage.setItem("noor-table", t); } catch { /* noop */ }
  };

  // ---- cart ops ----
  const inc = useCallback((id: number) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 })), []);
  const dec = useCallback(
    (id: number) =>
      setCart((c) => {
        const n = { ...c };
        const q = (n[id] ?? 0) - 1;
        if (q <= 0) delete n[id];
        else n[id] = q;
        return n;
      }),
    [],
  );

  const itemsById = useMemo(() => {
    const m = new Map<number, MenuItem>();
    for (const b of data) for (const i of b.items) m.set(i.id, i);
    return m;
  }, [data]);

  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0);
  const cartTotal = Object.entries(cart).reduce((s, [id, q]) => s + (itemsById.get(Number(id))?.price ?? 0) * q, 0);

  const featured = useMemo(
    () => data.flatMap((b) => b.items).filter((i) => i.featured && i.available),
    [data],
  );

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return data
      .flatMap((b) => b.items)
      .filter((i) => i.available && (i.nameAr.includes(query.trim()) || i.nameEn.toLowerCase().includes(q)));
  }, [data, query]);

  // ---- scroll spy ----
  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>("[data-cat-section]");
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActiveSlug(e.target.getAttribute("data-cat-section") ?? "");
          }
        }
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [query]);

  // keep active chip visible in the rail
  useEffect(() => {
    const chip = railRef.current?.querySelector<HTMLElement>(`[data-slug="${activeSlug}"]`);
    chip?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeSlug]);

  const scrollTo = (slug: string) => {
    setActiveSlug(slug);
    document.getElementById(`cat-${slug}`)?.scrollIntoView({ behavior: "smooth" });
  };

  // ---- submit order ----
  const submit = async ({ table: finalTable, name, notes }: { table: string; name: string; notes: string }) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNumber: finalTable,
          customerName: name,
          notes,
          items: Object.entries(cart).map(([id, qty]) => ({ id: Number(id), qty })),
        }),
      });
      const payload = await res.json().catch(() => null);
      if (res.ok) {
        setCart({});
        setDrawerOpen(false);
        setTrackedId(payload.order.id);
        setTrackerOpen(true);
        if (finalTable) updateTable(finalTable);
        try { localStorage.setItem("noor-active-order", String(payload.order.id)); } catch { /* noop */ }
      } else {
        alert(payload?.error ?? "تعذر إرسال الطلب، حاول مجدداً");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const finishTracking = () => {
    setTrackedId(null);
    setTrackerOpen(false);
    try { localStorage.removeItem("noor-active-order"); } catch { /* noop */ }
  };

  return (
    <div className="relative min-h-screen">
      {/* ================= fixed header ================= */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] glass">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2.5">
            <span className="font-display text-lg font-bold leading-none text-cream">{t("فندق نور لاند", "Noor Land Hotel")}</span>
          </button>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-gold hover:bg-white/10 transition"
            >
              {lang === "ar" ? "English" : "عربي"}
            </button>
            <div className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-bold text-gold-2">
              <MapPin className="h-3.5 w-3.5" />
              {table ? `${t("طاولة", "Table")} ${table}` : t("الطلب المباشر", "Direct Order")}
            </div>
          </div>
        </div>

        {/* category rail */}
        <div ref={railRef} className="no-scrollbar flex gap-1.5 overflow-x-auto px-3 pb-2.5 pt-1">
          {data.map(({ category }) => {
            const Icon = CATEGORY_ICONS[category.slug] ?? UtensilsCrossed;
            const active = activeSlug === category.slug && !searchResults;
            return (
              <button
                key={category.id}
                data-slug={category.slug}
                onClick={() => { setQuery(""); scrollTo(category.slug); }}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-300 ${
                  active
                    ? "border-gold/60 bg-gradient-to-l from-gold/30 to-gold/10 text-gold-2 shadow-lg shadow-gold/10"
                    : "border-white/[0.07] bg-white/[0.02] text-sand hover:border-gold/30 hover:text-cream"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {lang === "ar" ? category.nameAr : category.nameEn}
              </button>
            );
          })}
        </div>
      </header>

      {/* ================= hero ================= */}
      <section className="relative flex min-h-[68vh] flex-col items-center justify-center overflow-hidden px-4 pb-16 pt-32">
        <div className="absolute inset-0">
          <img src={heroImage} alt="" className="h-full w-full object-cover opacity-45" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/40 to-ink" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(8,12,11,0.55)_75%)]" />
        </div>

        {/* floating gold orbs */}
        <div className="pointer-events-none absolute -right-16 top-24 h-56 w-56 animate-float rounded-full bg-gold/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-20 h-64 w-64 animate-float rounded-full bg-forest/40 blur-3xl [animation-delay:2s]" />

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex flex-col items-center text-center"
          >
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 120 }}
              className="grid h-20 w-20 rotate-45 place-items-center rounded-3xl border-2 border-gold/50 bg-gradient-to-br from-gold/25 via-gold/5 to-transparent shadow-2xl shadow-gold/20"
            >
              <span className="-rotate-45 font-display text-4xl font-bold text-gold-2">NL</span>
            </motion.span>
            
            <h1 className="gold-text mt-5 font-display text-6xl font-bold leading-tight sm:text-7xl">
              {t("فندق نور لاند", "Noor Land Hotel")}
            </h1>
            <p className="mt-2 text-sm font-medium tracking-[0.35em] text-sand">
              {t("مطعم المرجان", "AL MURJAN RESTAURANT")}
            </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {(lang === "ar"
              ? ["مأكولات شرقية وعالمية", "مشروبات فاخرة", "شيشة"]
              : ["Oriental & International Cuisine", "Premium Beverages", "Shisha"]
            ).map((label) => (
              <span key={label} className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-medium text-cream/85 backdrop-blur">
                {label}
              </span>
            ))}
          </div>

          {/* search */}
          <div className="mt-7 flex w-full max-w-md items-center gap-2 rounded-2xl border border-white/10 bg-ink/60 px-4 py-3 backdrop-blur-xl transition focus-within:border-gold/40">
            <Search className="h-4 w-4 shrink-0 text-gold" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("ابحث عن طبق أو مشروب…", "Search for a dish or drink…")}
              className="w-full bg-transparent text-sm text-cream placeholder:text-sand/60 focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-xs font-bold text-sand hover:text-cream">{t("مسح", "Clear")}</button>
            )}
          </div>

          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="mt-8 text-gold/70"
          >
            <ChevronDown className="h-5 w-5" />
          </motion.div>
        </motion.div>

        {/* marquee */}
        <div className="absolute inset-x-0 bottom-0 z-10 overflow-hidden border-t border-white/[0.06] bg-ink/50 py-2.5 backdrop-blur-sm">
          <div className="flex w-max animate-marquee gap-8 whitespace-nowrap [direction:ltr]">
            {[...data, ...data].map(({ category }, i) => (
              <span key={i} className="flex items-center gap-8 text-xs font-medium tracking-wide text-sand/70">
                {lang === "ar" ? category.nameAr : category.nameEn} <span className="text-gold/60">✦</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ================= search results ================= */}
      {searchResults ? (
        <main className="mx-auto max-w-6xl px-4 pb-40 pt-4">
          <h2 className="font-display text-2xl font-bold text-cream">
            {t("نتائج البحث", "Search Results")} <span className="text-sm text-sand">({searchResults.length})</span>
          </h2>
          {searchResults.length === 0 && <p className="mt-6 text-sm text-sand">{t("لا توجد نتائج مطابقة — جرّب كلمة أخرى", "No matching results — try another keyword")}</p>}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {searchResults.map((item) => (
              <MenuItemCard key={item.id} item={item} qty={cart[item.id] ?? 0} onInc={inc} onDec={dec} lang={lang} />
            ))}
          </div>
        </main>
      ) : (
        <main className="mx-auto max-w-6xl px-4 pb-40">
          {/* ================= featured ================= */}
          {featured.length > 0 && (
            <section className="pt-8">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-display text-2xl font-bold leading-none text-cream">{t("توقيع فندق نور لاند", "Chef's Signatures")}</h2>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-sand">{t("Chef's Signatures", "توقيع الشيف")}</p>
                </div>
                <div className="ornament-line flex-1" />
              </div>
              <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
                {featured.map((item) => (
                  <FeatureCard key={item.id} item={item} qty={cart[item.id] ?? 0} onInc={inc} onDec={dec} lang={lang} />
                ))}
              </div>
            </section>
          )}

          {/* ================= menu sections ================= */}
          {data.map(({ category, items }) => {
            const visibleItems = items.filter((i) => i.available);
            if (visibleItems.length === 0) return null;
            const Icon = CATEGORY_ICONS[category.slug] ?? UtensilsCrossed;
            return (
              <section
                key={category.id}
                id={`cat-${category.slug}`}
                data-cat-section={category.slug}
                className="scroll-mt-36 pt-10"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="font-display text-2xl font-bold leading-none text-cream">
                      {lang === "ar" ? category.nameAr : category.nameEn}
                    </h2>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-sand">
                      {lang === "ar" ? category.nameEn : category.nameAr}
                    </p>
                  </div>
                  <div className="ornament-line flex-1" />
                  <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[10px] font-bold text-sand">
                    {visibleItems.length} {t("صنف", "Items")}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleItems.map((item) => (
                    <MenuItemCard key={item.id} item={item} qty={cart[item.id] ?? 0} onInc={inc} onDec={dec} lang={lang} />
                  ))}
                </div>
              </section>
            );
          })}
        </main>
      )}

      {/* ================= footer ================= */}
      <footer className="border-t border-white/[0.06] bg-ink-2/60 pb-32 pt-10 text-center">
        <span className="font-display text-3xl font-bold text-cream">{t("فندق نور لاند", "Noor Land Hotel")}</span>
        <p className="mt-1 text-[10px] tracking-[0.4em] text-sand">NOOR LAND HOTEL • AL MURJAN</p>
        <div className="mx-auto mt-5 ornament-line max-w-xs" />
        <p className="mt-5 text-xs text-sand">{t("امسح • اختر • استمتع — نتشرف بخدمتكم", "Scan • Choose • Enjoy — We are honored to serve you")}</p>
        <div className="mx-auto mt-6 ornament-line max-w-[120px]" />
        <p className="mt-4 text-[10px] text-sand/40">{t("تم التصميم بواسطة", "Designed by")}</p>
        <p className="mt-1 text-[11px] font-bold tracking-wide text-gold/60">Eng. Yousef Al Ali</p>
      </footer>

      {/* ================= floating cart bar ================= */}
      <AnimatePresence>
        {cartCount > 0 && !trackerOpen && (
          <motion.div
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
            className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-xl"
          >
            <div className="glass flex items-center gap-3 rounded-2xl border border-gold/25 p-2 shadow-2xl shadow-black/60">
              <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-gold/25 to-gold/5 text-gold">
                <ShoppingBag className="h-5 w-5" />
                <span className="absolute -left-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-gold text-[10px] font-black text-ink">
                  {cartCount}
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-sand">{t("الإجمالي", "Total")}</p>
                <p className="text-sm font-bold text-gold-2">{formatIQD(cartTotal, lang)}</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setDrawerOpen(true)}
                className="shrink-0 rounded-xl bg-gradient-to-l from-gold-3 via-gold to-gold-2 px-6 py-3 text-sm font-bold text-ink shadow-lg shadow-gold/25"
              >
                {t("عرض السلة", "View Cart")}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= active order chip ================= */}
      {trackedId !== null && !trackerOpen && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setTrackerOpen(true)}
          className="ring-new fixed bottom-3 left-3 z-40 flex items-center gap-2 rounded-full border border-gold/40 bg-ink/80 px-4 py-2.5 text-xs font-bold text-gold-2 backdrop-blur-md"
          style={{ bottom: cartCount > 0 ? "5.2rem" : "0.75rem" }}
        >
          <ConciergeBell className="h-4 w-4" />
          {t("طلبك", "Order")} #{trackedId}
        </motion.button>
      )}

      {/* ================= drawers / overlays ================= */}
      <CartDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        cart={cart}
        itemsById={itemsById}
        onInc={inc}
        onDec={dec}
        onClear={() => setCart({})}
        lang={lang}
      />

      <AnimatePresence>
        {trackerOpen && trackedId !== null && (
          <OrderTracker orderId={trackedId} onClose={() => setTrackerOpen(false)} onFinished={finishTracking} />
        )}
      </AnimatePresence>
    </div>
  );
}
