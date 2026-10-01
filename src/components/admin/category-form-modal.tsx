"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FolderPlus, Loader2, Save, Wand2, X } from "lucide-react";
import type { Category } from "@/db/schema";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  category: Category | null; // null → create mode
}

export function CategoryFormModal({ open, onClose, onSaved, category }: Props) {
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setNameAr(category?.nameAr ?? "");
    setNameEn(category?.nameEn ?? "");
    setSlug(category?.slug ?? "");
    setSortOrder(String(category?.sortOrder ?? 0));
  }, [open, category]);

  const suggestSlug = () => {
    const s = nameEn
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s]+/g, "-")
      .replace(/-+/g, "-");
    setSlug(s);
  };

  const submit = async () => {
    setError("");
    if (!nameAr.trim() || !nameEn.trim()) return setError("أدخل الاسم العربي والإنجليزي");
    if (!slug.trim()) return setError("أدخل المعرّف (slug)");

    setSaving(true);
    try {
      const res = await fetch(category ? `/api/categories/${category.id}` : "/api/categories", {
        method: category ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nameAr, nameEn, slug, sortOrder: Number.parseInt(sortOrder) || 0 }),
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
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="fixed inset-x-4 top-1/2 z-[90] mx-auto w-full max-w-md -translate-y-1/2 overflow-hidden rounded-3xl border border-gold/25 bg-ink-2"
          >
            <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-cream">
                <FolderPlus className="h-4 w-4 text-gold" />
                {category ? `تعديل فئة: ${category.nameAr}` : "إضافة فئة جديدة"}
              </h2>
              <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-sand hover:bg-white/10" aria-label="إغلاق">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="space-y-4 px-5 py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold text-sand">الاسم بالعربية *</span>
                  <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="مثال: المشاوي" className={inputCls} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold text-sand">الاسم بالإنجليزية *</span>
                  <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr" placeholder="Grills" className={inputCls} />
                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-sand">المعرّف slug (إنجليزي بدون مسافات) *</span>
                <div className="flex gap-2">
                  <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} dir="ltr" placeholder="grills" className={inputCls} />
                  <button
                    type="button"
                    onClick={suggestSlug}
                    title="توليد من الاسم الإنجليزي"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold/10 text-gold transition hover:bg-gold/20"
                  >
                    <Wand2 className="h-4 w-4" />
                  </button>
                </div>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-sand">ترتيب الظهور في المنيو</span>
                <input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} inputMode="numeric" dir="ltr" className={inputCls} />
              </label>

              {error && <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">{error}</p>}
            </div>

            <footer className="border-t border-white/[0.06] px-5 py-3.5">
              <button
                onClick={submit}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-gold-3 via-gold to-gold-2 py-3 text-sm font-bold text-ink shadow-lg shadow-gold/20 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {category ? "حفظ التعديلات" : "إضافة الفئة"}
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
