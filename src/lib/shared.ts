// Shared types & helpers used across customer / captain / admin UIs

export interface OrderItemDTO {
  id: number;
  nameAr: string;
  nameEn: string;
  price: number;
  quantity: number;
  itemId: number | null;
}

export interface OrderDTO {
  id: number;
  tableNumber: string;
  customerName: string | null;
  notes: string | null;
  status: "pending" | "accepted" | "served" | "completed" | "rejected";
  total: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItemDTO[];
}

export const STATUS_META: Record<
  OrderDTO["status"],
  { ar: string; en: string; tone: "gold" | "mint" | "sky" | "zinc" | "red" }
> = {
  pending: { ar: "بانتظار الموافقة", en: "Pending", tone: "gold" },
  accepted: { ar: "قيد التحضير", en: "Preparing", tone: "sky" },
  served: { ar: "تم التقديم", en: "Served", tone: "mint" },
  completed: { ar: "مكتمل", en: "Completed", tone: "zinc" },
  rejected: { ar: "مرفوض", en: "Rejected", tone: "red" },
};

export function formatIQD(n: number, lang: "ar" | "en" = "ar"): string {
  if (lang === "en") return `${n.toLocaleString("en-US")} IQD`;
  return `${n.toLocaleString("en-US")} د.ع`;
}

export function timeAgoAr(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m === 1) return "منذ دقيقة";
  if (m === 2) return "منذ دقيقتين";
  if (m <= 10) return `منذ ${m} دقائق`;
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h === 1) return "منذ ساعة";
  if (h === 2) return "منذ ساعتين";
  return `منذ ${h} ساعات`;
}
