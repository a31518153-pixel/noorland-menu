"use client";

import { motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import type { MenuItem } from "@/db/schema";
import { formatIQD } from "@/lib/shared";

interface Props {
  item: MenuItem;
  qty: number;
  onInc: (id: number) => void;
  onDec: (id: number) => void;
  lang: "ar" | "en";
}

function QtyControl({ item, qty, onInc, onDec }: Props) {
  if (qty === 0) {
    return (
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => onInc(item.id)}
        aria-label={`أضف ${item.nameAr}`}
        className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-gold-2 to-gold text-ink shadow-lg shadow-gold/20 transition hover:shadow-gold/40"
      >
        <Plus className="h-4 w-4" strokeWidth={3} />
      </motion.button>
    );
  }
  return (
    <div className="flex items-center gap-1 rounded-full border border-gold/30 bg-ink/60 p-1">
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => onDec(item.id)}
        className="grid h-7 w-7 place-items-center rounded-full text-gold transition hover:bg-gold/10"
        aria-label="إنقاص"
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={3} />
      </motion.button>
      <span className="min-w-5 text-center text-sm font-bold text-gold-2">{qty}</span>
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => onInc(item.id)}
        className="grid h-7 w-7 place-items-center rounded-full text-gold transition hover:bg-gold/10"
        aria-label="زيادة"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={3} />
      </motion.button>
    </div>
  );
}

export function MenuItemCard(props: Props) {
  const { item } = props;
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="group relative flex gap-3 overflow-hidden rounded-2xl border border-white/[0.06] bg-card/70 p-3 transition-colors duration-300 hover:border-gold/30 hover:bg-card-2/70"
    >
      {item.image && (
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-28">
          <img
            src={item.image}
            alt={item.nameAr}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
          <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
          {item.featured && (
            <span className="absolute right-1 top-1 rounded-full bg-ink/80 px-1.5 py-0.5 text-[9px] font-bold text-gold backdrop-blur">
              {props.lang === "ar" ? "مميز ✦" : "Featured ✦"}
            </span>
          )}
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-bold text-cream">
              {props.lang === "ar" ? item.nameAr : item.nameEn}
            </h3>
            <p className="truncate text-[10px] font-medium uppercase tracking-wider text-sand/70">
              {props.lang === "ar" ? item.nameEn : item.nameAr}
            </p>
          </div>
        </div>
        {((props.lang === "ar" && item.descriptionAr) || (props.lang === "en" && item.descriptionEn)) && (
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-sand">
            {props.lang === "ar" ? item.descriptionAr : item.descriptionEn}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-sm font-bold text-gold-2">{formatIQD(item.price, props.lang)}</span>
          <QtyControl {...props} />
        </div>
      </div>
    </motion.article>
  );
}

export function FeatureCard(props: Props) {
  const { item } = props;
  return (
    <motion.article
      whileHover={{ y: -6 }}
      className="group relative w-44 shrink-0 snap-start overflow-hidden rounded-3xl border border-gold/20 bg-card sm:w-52"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        {item.image && (
          <img
            src={item.image}
            alt={item.nameAr}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/35 to-transparent" />
        <span className="absolute right-2.5 top-2.5 rounded-full border border-gold/40 bg-ink/70 px-2 py-0.5 text-[9px] font-bold tracking-wide text-gold backdrop-blur">
          {props.lang === "ar" ? "توقيع الشيف" : "Chef's Pick"}
        </span>
        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="text-sm font-bold leading-snug text-cream">
            {props.lang === "ar" ? item.nameAr : item.nameEn}
          </h3>
          <p className="mt-0.5 text-[9px] uppercase tracking-widest text-sand">
            {props.lang === "ar" ? item.nameEn : item.nameAr}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[13px] font-bold text-gold-2">{formatIQD(item.price, props.lang)}</span>
            <QtyControl {...props} />
          </div>
        </div>
      </div>
    </motion.article>
  );
}
