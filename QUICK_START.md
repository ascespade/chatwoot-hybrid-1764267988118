# 🚀 Quick Start Guide - Chatwoot Hybrid MCP

## ⚡ البدء السريع

### الخطوة 1: تثبيت الاعتمادات

```bash
npm install
```

### الخطوة 2: استخراج المتغيرات من ملف ENV_VARS_COMPLETE.txt

```bash
node extract-env-vars.js "E:\chatwoot\ENV_VARS_COMPLETE.txt"
```

سيتم استخراج المتغيرات المطلوبة وعرضها.

### الخطوة 3: استخدام MCP Tool في Cursor

#### الطريقة الأولى: عبر Cursor MCP Interface

1. افتح Cursor
2. اضغط `Cmd/Ctrl + Shift + P`
3. ابحث عن: `MCP: Create Tool`
4. اختر `chatwootDeployer`
5. أدخل المتغيرات المطلوبة

#### الطريقة الثانية: عبر Command Line

```bash
node run.js
```

ثم أدخل المتغيرات عند الطلب.

### الخطوة 4: المتغيرات المطلوبة

من ملف `ENV_VARS_COMPLETE.txt`، ستحتاج:

| المتغير | الوصف | مثال |
|---------|-------|------|
| `SUPABASE_URL` | رابط قاعدة البيانات | `postgresql://...` |
| `SUPABASE_KEY` | Service Role Key | `eyJhbGc...` |
| `RAILWAY_TOKEN` | Railway API Token | `railway_xxx...` |
| `RENDER_API_KEY` | Render API Key | `rnd_xxx...` |
| `GITHUB_REPO` | رابط الريبو | `https://github.com/...` |
| `FRONTEND_URL` | رابط الواجهة | `https://chatwoot.example.com` |

## 📋 Checklist قبل التشغيل

- [ ] تم تثبيت `npm install`
- [ ] ملف `ENV_VARS_COMPLETE.txt` موجود
- [ ] جميع المفاتيح صحيحة ومتاحة
- [ ] GitHub repo جاهز (يمكن أن يكون فارغ)
- [ ] Supabase Project موجود
- [ ] Railway account جاهز
- [ ] Render account جاهز

## 🎯 ما سيحدث تلقائياً

1. ✅ إنشاء `.env.deploy` كامل
2. ✅ إنشاء Railway Redis (Valkey) Project
3. ✅ جلب Redis Connection URL
4. ✅ تحديث `.env.deploy` بـ Redis URL
5. ✅ إنشاء `render.yaml` كامل
6. ✅ رفع الكود إلى GitHub
7. ✅ إعداد كل شيء للنشر

## 🔗 الخطوات التالية بعد النشر

### 1. ربط GitHub مع Render

- اذهب إلى [Render Dashboard](https://dashboard.render.com)
- New → Web Service
- اختر الريبو من GitHub
- Render سيكتشف `render.yaml` تلقائياً

### 2. انتظار أول Deployment

- Render سيشغّل Build تلقائياً
- Migrations ستعمل تلقائياً
- Service سيكون جاهز بعد 5-10 دقائق

### 3. إنشاء Admin User

بعد أول deployment ناجح:

```bash
# عبر Render Shell
bundle exec rails console

# في Rails Console
User.create!(
  email: 'admin@example.com',
  password: 'secure_password_123',
  password_confirmation: 'secure_password_123',
  role: 'administrator',
  confirmed_at: Time.current
)
```

## ⚠️ استكشاف الأخطاء

### خطأ: "Failed to create Railway Redis project"

**الحل:**
- تحقق من Railway Token
- تأكد من أن الحساب لديه credits
- جرب Railway Dashboard يدوياً

### خطأ: "Git push failed"

**الحل:**
- تأكد من Git credentials
- تحقق من أن الريبو موجود
- جرب: `git remote -v` للتحقق

### خطأ: "Supabase connection failed"

**الحل:**
- تحقق من Database URL
- تأكد من Service Role Key
- تحقق من Network connectivity

## 📞 الدعم

إذا واجهت مشاكل:
1. تحقق من Logs في `run.js`
2. راجع Railway/Render/Supabase Dashboards
3. تأكد من صحة جميع المفاتيح

---

**جاهز؟ ابدأ الآن! 🚀**

