"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Save, UserPlus, X } from "lucide-react";
import type { User } from "@/db/schema";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  user: User | null;
}

export function UserFormModal({ open, onClose, onSaved, user }: Props) {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("captain");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (user) {
      setUsername(user.username);
      setFullName(user.fullName);
      setRole(user.role);
      setActive(user.active);
    } else {
      setUsername("");
      setFullName("");
      setRole("captain");
      setActive(true);
    }
  }, [open, user]);

  const submit = async () => {
    setError("");
    if (!username.trim() || !fullName.trim()) return setError("يرجى ملء جميع الحقول");

    setSaving(true);
    try {
      const res = await fetch(user ? `/api/users/${user.id}` : "/api/users", {
        method: user ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, fullName, role, active }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return setError(data?.error || "حدث خطأ ما");
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="fixed inset-x-4 top-1/2 z-[90] mx-auto max-w-md -translate-y-1/2 overflow-hidden rounded-3xl border border-gold/25 bg-ink-2">
            <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-cream">
                <UserPlus className="h-4 w-4 text-gold" />
                {user ? "تعديل مستخدم" : "إضافة مستخدم جديد"}
              </h2>
              <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-sand hover:bg-white/10"><X className="h-4 w-4" /></button>
            </header>
            <div className="space-y-4 px-5 py-4">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-sand">اسم المستخدم (للدخول)</span>
                <input value={username} onChange={(e) => setUsername(e.target.value)} disabled={!!user} className="w-full rounded-xl border border-white/10 bg-ink px-3 py-2.5 text-sm text-cream focus:border-gold/40 focus:outline-none" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-sand">الاسم الكامل</span>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-xl border border-white/10 bg-ink px-3 py-2.5 text-sm text-cream focus:border-gold/40 focus:outline-none" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-sand">الصلاحية</span>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-xl border border-white/10 bg-ink px-3 py-2.5 text-sm text-cream focus:border-gold/40 focus:outline-none">
                  <option value="captain">كابتن صالة</option>
                  <option value="admin">مدير نظام</option>
                </select>
              </label>
              <button type="button" onClick={() => setActive(!active)} className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs font-bold transition ${active ? "border-gold/40 bg-gold/10 text-gold-2" : "border-white/10 text-sand"}`}>
                الحالة: {active ? "نشط" : "معطل"}
                <span className={`relative h-5 w-9 rounded-full transition-colors ${active ? "bg-gold" : "bg-white/10"}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${active ? "left-0.5" : "left-[18px]"}`} />
                </span>
              </button>
              {error && <p className="text-xs font-bold text-red-300">{error}</p>}
            </div>
            <footer className="border-t border-white/[0.06] px-5 py-3.5">
              <button onClick={submit} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-gold-3 via-gold to-gold-2 py-3 text-sm font-bold text-ink disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                حفظ البيانات
              </button>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
