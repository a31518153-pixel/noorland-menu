"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, Loader2, Save, X } from "lucide-react";
import type { Category, MenuItem } from "@/db/schema";
import { IMAGE_POOL } from "@/lib/image-pool";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: Category[];
  item: MenuItem | null; // null → create mode
  presetCategoryId?: number | null;
}

export function ItemFormModal({ open, onClose, onSaved, categories, item, presetCategoryId }: Props) {
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id ?? 0);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [price, setPrice] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [image, setImage] = useState("");
  const [featured, setFeatured] = useState(false);
  const [available, setAvailable] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (item) {
      setCategoryId(item.categoryId);
      setNameAr(item.nameAr);
      setNameEn(item.nameEn);
      setPrice(String(item.price));
      setDescriptionAr(item.descriptionAr ?? "");
      setDescriptionEn(item.descriptionEn ?? "");
      setImage(item.image ?? "");
      setFeatured(item.featured);
      setAvailable(item.available);
      setSortOrder(String(item.sortOrder));
    } else {
      setCategoryId(presetCategoryId ?? categories[0]?.id ?? 0);
      setNameAr(""); setNameEn(""); setPrice("");
      setDescriptionAr(""); setDescriptionEn(""); setImage("");
      setFeatured(false); setAvailable(true); setSortOrder("0");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item]);

  const submit = async () => {
    setError("");
    if (!nameAr.trim() || !nameEn.trim()) return setError("أدخل الاسم العربي والإنجليزي");
    const p = Number(price);
    if (!Number.isInteger(p) || p < 0) return setError("أدخل سعراً صحيحاً بالدينار (رقم صحيح)");
    if (!categoryId) return setError("اختر الفئة");

    setSaving(true);
    try {
      const payload = {
        categoryId, nameAr, nameEn, price: p,
        descriptionAr: descriptionAr || null, descriptionEn: descriptionEn || null,
        image: image || null, featured, available,
        sortOrder: Number.parseInt(sortOrder) || 0,
      };
      const res = await fetch(item ? `/api/menu-items/${item.id}` : "/api/menu-items", {
        method: item ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return setError(data?.error ?? "حدث خطأ أثناء الحفظ");
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="fixed inset-x-3 bottom-3 top-8 z-[90] mx-auto flex max-w-lg flex-col overflow-hidden rounded-3xl border border-gold/25 bg-ink-2 sm:inset-x-4 sm:top-1/2 sm:bottom-auto sm:max-h-[88vh] sm:-translate-y-1/2"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
              <h2 className="font-display text-lg font-bold text-cream">
                {item ? `تعديل: ${item.nameAr}` : "إضافة صنف جديد"}
              </h2>
              <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-sand hover:bg-white/10" aria-label="إغلاق">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="thin-scroll flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <Field label="الفئة">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-ink px-3 py-2.5 text-sm text-cream focus:border-gold/40 focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.nameAr} — {c.nameEn}</option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="الاسم بالعربية *">
                  <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="مثال: شوربة العدس" className={inputCls} />
                </Field>
                <Field label="الاسم بالإنجليزية *">
                  <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Lentil Soup" dir="ltr" className={inputCls} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="السعر (د.ع) *">
                  <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" placeholder="5000" dir="ltr" className={inputCls} />
                </Field>
                <Field label="الترتيب داخل الفئة">
                  <input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} inputMode="numeric" placeholder="0" dir="ltr" className={inputCls} />
                </Field>
              </div>

              <Field label="الوصف بالعربية">
                <textarea value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} rows={2} placeholder="وصف مختصر وجذاب للطبق…" className={`${inputCls} resize-none`} />
              </Field>
              <Field label="الوصف بالإنجليزية (اختياري)">
                <textarea value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} rows={2} dir="ltr" placeholder="Short English description…" className={`${inputCls} resize-none`} />
              </Field>

              <Field label="رابط الصورة">
                <div className="flex items-center gap-2">
                  <input value={image} onChange={(e) => setImage(e.target.value)} dir="ltr" placeholder="https://…" className={inputCls} />
                  <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-ink">
                    {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-4 w-4 text-sand/50" />}
                  </span>
                </div>
                <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
                  {IMAGE_POOL.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      title={p.label}
                      onClick={() => setImage(p.url)}
                      className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                        image === p.url ? "border-gold" : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={p.url} alt={p.label} loading="lazy" className="h-full w-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[8px] text-white">{p.label}</span>
                    </button>
                  ))}
                </div>
              </Field>

              <div className="flex gap-3">
                <Toggle checked={available} onChange={setAvailable} label="متوفر في المنيو" />
                <Toggle checked={featured} onChange={setFeatured} label="من توقيع الشيف" />
              </div>

              {error && <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">{error}</p>}
            </div>

            <footer className="shrink-0 border-t border-white/[0.06] px-5 py-3.5">
              <button
                onClick={submit}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-gold-3 via-gold to-gold-2 py-3 text-sm font-bold text-ink shadow-lg shadow-gold/20 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {item ? "حفظ التعديلات" : "إضافة الصنف"}
              </button>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-ink px-3 py-2.5 text-sm text-cream placeholder:text-sand/40 focus:border-gold/40 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold text-sand">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex flex-1 items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs font-bold transition ${
        checked ? "border-gold/40 bg-gold/10 text-gold-2" : "border-white/10 text-sand"
      }`}
    >
      {label}
      <span className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-gold" : "bg-white/10"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-0.5" : "left-[18px]"}`} />
      </span>
    </button>
  );
}
