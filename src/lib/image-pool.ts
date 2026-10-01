// Curated stock photography pool for the admin image picker
export const px = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200`;

export const IMAGE_POOL: { label: string; url: string }[] = [
  { label: "شوربات", url: px(14774457) },
  { label: "سلطات", url: px(7462816) },
  { label: "مقبلات", url: px(14930656) },
  { label: "مقبلات ساخنة", url: px(38947729) },
  { label: "باستا", url: px(546945) },
  { label: "أرز شرقي", url: px(28674660) },
  { label: "ستيك", url: px(35546723) },
  { label: "مأكولات بحرية", url: px(8696533) },
  { label: "برغر", url: px(13163534) },
  { label: "شاورما", url: px(5779364) },
  { label: "مشاوي", url: px(12738462) },
  { label: "بيتزا", url: px(34380267) },
  { label: "حلويات", url: px(26838690) },
  { label: "قهوة ساخنة", url: px(11385490) },
  { label: "شاي", url: px(1417945) },
  { label: "قهوة مثلجة", url: px(20485617) },
  { label: "عصائر", url: px(158053).replace("pexels-photo-158053", "fresh-orange-juice-squeezed-refreshing-citrus-158053") },
  { label: "موهيتو", url: px(4051220) },
  { label: "ميلك شيك", url: px(11410548) },
  { label: "سلطة فواكه", url: px(23948068) },
  { label: "كوكتيل", url: px(605408) },
  { label: "كريب", url: px(3225499) },
  { label: "وافل", url: px(9501440) },
  { label: "بان كيك", url: px(11871161) },
  { label: "مشروبات غازية", url: px(4113653) },
  { label: "شيشة", url: px(7518765) },
];
