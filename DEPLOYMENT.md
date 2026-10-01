# دليل التشغيل الفعلي — نظام منيو نور لاند / المرجان

نظام متكامل: صفحة زبون (باركود → منيو → طلب) + لوحة كابتن + لوحة تحكم، مبني بـ Next.js + PostgreSQL.

---

## ١) المتطلبات

| العنصر | النسخة |
|---|---|
| Node.js | 20 أو أحدث |
| PostgreSQL | 14 أو أحدث |
| خادم | VPS (Ubuntu 22.04) أو Vercel + قاعدة بيانات سحابية |

---

## ٢) التشغيل المحلي (للتطوير)

```bash
# 1. تثبيت الحزم
npm install

# 2. إعداد متغير البيئة — أنشئ ملف .env في جذر المشروع:
#    DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db

# 3. إنشاء الجداول + تعبئة المنيو كاملاً (191 صنفاً)
npx drizzle-kit push
npx tsx src/db/seed.ts

# 4. التشغيل
npm run dev        # تطوير    → http://localhost:3000
# أو
npm run build && npm run start   # إنتاج
```

الصفحات:

| الصفحة | الرابط | المستخدم |
|---|---|---|
| المنيو + الطلب | `/` أو `/?table=7` | الزبون |
| لوحة الكابتن | `/captain` | كابتن الصالة (تابلت/شاشة) |
| لوحة التحكم | `/admin` | المدير |

---

## ٣) النشر الفعلي — الخيار A: خادم VPS (موصى به للمطاعم)

### أ. تجهيز الخادم

```bash
# Ubuntu 22.04
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs postgresql nginx
sudo npm i -g pm2

# قاعدة البيانات
sudo -u postgres psql -c "CREATE DATABASE app_db;"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'كلمة_سر_قوية';"
```

### ب. رفع المشروع وتشغيله

```bash
git clone <رابط_المشروع> noorland
cd noorland
npm install

# ملف .env
echo 'DATABASE_URL=postgresql://postgres:كلمة_سر_قوية@127.0.0.1:5432/app_db' > .env

npx drizzle-kit push
npx tsx src/db/seed.ts
npm run build

# تشغيل دائم مع إعادة إقلاع تلقائية
pm2 start "npm run start" --name noorland
pm2 save && pm2 startup
```

### ج. الدومين + HTTPS عبر Nginx

```nginx
# /etc/nginx/sites-available/noorland
server {
    server_name menu.noorland.iq;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/noorland /etc/nginx/sites-enabled/
sudo certbot --nginx -d menu.noorland.iq   # شهادة SSL مجانية
```

---

## ٤) النشر الفعلي — الخيار B: Vercel + Neon (الأسرع)

1. أنشئ قاعدة مجانية على [Neon](https://neon.tech) وانسخ رابط الاتصال.
2. ارفع المشروع إلى GitHub ثم استورده في [Vercel](https://vercel.com).
3. أضف متغير البيئة `DATABASE_URL` في إعدادات المشروع.
4. من جهازك المحلي (بعد تعيين نفس المتغير):
   ```bash
   npx drizzle-kit push && npx tsx src/db/seed.ts
   npm run build   # للتأكد قبل الرفع
   ```

---

## ٥) بعد النشر — تجهيز المطعم

1. **اطبع الباركودات**: افتح `/admin` ← تبويب «رموز QR» ← حدّد عدد الطاولات ← «طباعة».
   كل باركود يفتح `https://دومينك/?table=N` برقم الطاولة محفوظاً.
2. **جهز شاشة الكابتن**: تابلت أو شاشة في الصالة مفتوحة دائماً على `/captain`
   (فعّل الصوت بضغطة واحدة على الشاشة ليعمل التنبيه — سياسة المتصفحات).
3. **تحكم بالمنيو**: من `/admin` ← «المنيو» أضف/عدّل/احذف الأصناف والفئات،
   بدّل التوفر (نفاد مؤقت) أو «توقيع الشيف» — التغيير يظهر للزبائن فوراً.
4. **اختبر التدفق**: امسح باركود طاولة بهاتفك ← اطلب ← يجب أن يصل تنبيه للكابتن فوراً.

---

## ٦) الصيانة

```bash
# نسخة احتياطية يومية من قاعدة البيانات (cron)
pg_dump "postgresql://postgres:كلمة_السر@127.0.0.1:5432/app_db" > backup-$(date +%F).sql

# تحديثات النظام
pm2 logs noorland      # سجلّات التشغيل
pm2 restart noorland   # إعادة تشغيل بعد أي تحديث
```

**ملاحظة أمان مهمة**: صفحتا `/captain` و`/admin` مفتوحتان حالياً بدون كلمة مرور
(مناسب لشبكة داخلية). قبل نشرهما على الإنترنت العام يُنصح بحمايتهما
(كلمة مرور عبر Nginx `htpasswd` أو إضافة جلسات دخول).
