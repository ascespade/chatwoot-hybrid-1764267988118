# 🚀 Chatwoot Hybrid MCP - Auto Deploy Tool

أداة MCP تلقائية للنشر الهجين لـ Chatwoot باستخدام **Render + Supabase + Railway**.

## 📋 المميزات

- ✅ إنشاء Supabase Project تلقائياً
- ✅ إنشاء Railway Redis (Valkey) تلقائياً
- ✅ تجهيز `.env` كامل
- ✅ تعديل `render.yaml` تلقائياً
- ✅ رفع الكود إلى GitHub
- ✅ تشغيل Migrations
- ✅ إعداد Admin User

## 🛠️ التثبيت

### 1. تثبيت الاعتمادات

```bash
npm install
```

### 2. إعداد MCP في Cursor

ضع الملفات في:
```
.cursor/mcp/chatwoot_hybrid_auto/
```

أو استخدم الملفات مباشرة من المجلد الحالي.

## 📝 الاستخدام

### عبر Cursor MCP

1. افتح Cursor
2. اكتب: `/chatwootDeployer`
3. أدخل المعلومات المطلوبة:
   - **GitHub Repo**: رابط الريبو (مثال: `https://github.com/username/repo.git`)
   - **Supabase URL**: رابط قاعدة البيانات من Supabase
   - **Supabase Key**: Service Role Key من Supabase
   - **Railway Token**: Railway API Token
   - **Render API Key**: Render API Key
   - **Frontend URL**: رابط الواجهة الأمامية

### عبر Command Line

```bash
node run.js
```

## 🔑 الحصول على المفاتيح المطلوبة

### Supabase
1. اذهب إلى [Supabase Dashboard](https://app.supabase.com)
2. اختر Project
3. Settings → API
4. انسخ:
   - **Database URL** (Connection string)
   - **Service Role Key**

### Railway
1. اذهب إلى [Railway Dashboard](https://railway.app)
2. Settings → Tokens
3. أنشئ New Token
4. انسخ الـ Token

### Render
1. اذهب إلى [Render Dashboard](https://dashboard.render.com)
2. Account Settings → API Keys
3. أنشئ New API Key
4. انسخ الـ Key

## 📁 الملفات المُنشأة

بعد التشغيل، سيتم إنشاء:

- `.env.deploy` - ملف البيئة الكامل
- `render.yaml` - إعدادات Render
- الملفات المرفوعة إلى GitHub

## 🎯 الخطوات التالية بعد النشر

1. **ربط GitHub مع Render**:
   - اذهب إلى Render Dashboard
   - New → Web Service
   - اختر الريبو من GitHub
   - Render سيكتشف `render.yaml` تلقائياً

2. **تشغيل Migrations**:
   - Migrations ستعمل تلقائياً في أول deployment
   - أو شغّلها يدوياً عبر Render Shell

3. **إنشاء Admin User**:
   ```bash
   bundle exec rails console
   User.create!(email: 'admin@example.com', password: 'secure_password', role: 'administrator')
   ```

## ⚠️ ملاحظات مهمة

- تأكد من أن GitHub repo موجود ومتاح
- Railway قد يستغرق 10-30 ثانية لإنشاء Redis
- Render يحتاج ربط الريبو يدوياً (أول مرة)
- تأكد من صحة جميع المفاتيح قبل التشغيل

## 🐛 استكشاف الأخطاء

### خطأ في Railway
- تأكد من صحة Railway Token
- تحقق من أن الحساب لديه credits كافية

### خطأ في Supabase
- تأكد من صحة Database URL
- تحقق من Service Role Key

### خطأ في Git Push
- تأكد من أن الريبو موجود
- تحقق من Git credentials

## 📄 الترخيص

MIT

