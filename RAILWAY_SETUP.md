# 🚂 Railway Setup Guide - Chatwoot Worker

## ✅ ما تم إنجازه تلقائياً

1. ✅ **إنشاء Railway Redis Project** - Project منفصل للـ Redis/Valkey
2. ✅ **إنشاء Railway Worker Project** - Project منفصل للـ Chatwoot Worker
3. ✅ **ربط GitHub Repo** - محاولة ربط الريبو تلقائياً
4. ✅ **إعداد Environment Variables** - جميع المتغيرات المطلوبة
5. ✅ **إنشاء railway.toml** - ملف الإعدادات

## 🔗 Railway Projects

بعد تشغيل السكريبت، ستحصل على:

- **Redis Project ID**: `chatwoot-redis` - يحتوي على Valkey service
- **Worker Project ID**: `chatwoot-worker` - يحتوي على Chatwoot Worker service

## 📋 الخطوات اليدوية (إذا لزم الأمر)

### 1. ربط GitHub مع Railway Worker

إذا لم يتم الربط تلقائياً:

1. اذهب إلى [Railway Dashboard](https://railway.app)
2. افتح Project: `chatwoot-worker`
3. اضغط **Settings** → **Connect GitHub**
4. اختر الريبو من القائمة
5. اختر Branch: `main` أو `master`

### 2. التحقق من Environment Variables

في Railway Worker Project:

1. افتح **Variables** tab
2. تأكد من وجود:
   - `DATABASE_URL` - من Supabase
   - `REDIS_URL` - من Railway Redis Project
   - `SECRET_KEY_BASE` - تم توليده تلقائياً
   - `FRONTEND_URL` - رابط الواجهة
   - `RAILS_ENV=production`
   - `NODE_ENV=production`

### 3. ربط Redis مع Worker

**الطريقة 1: عبر Environment Variables (موصى بها)**

- `REDIS_URL` موجود بالفعل في Variables
- Worker سيستخدمه تلقائياً

**الطريقة 2: عبر Railway Service Linking**

1. في Worker Project → **Settings** → **Service Connections**
2. اضغط **Connect Service**
3. اختر Redis Project
4. Railway سيربطه تلقائياً

### 4. إعداد Start Command

في Railway Worker Service:

1. افتح **Settings** → **Deploy**
2. **Start Command**:
   ```bash
   bundle exec sidekiq -C config/sidekiq.yml
   ```

### 5. التحقق من النشر

بعد ربط GitHub:

1. Railway سيبدأ Build تلقائياً
2. انتظر حتى يكتمل Build (5-10 دقائق)
3. تحقق من **Logs** tab
4. يجب أن ترى: `Sidekiq starting...`

## 🔍 Troubleshooting

### Worker لا يبدأ

**التحقق:**
1. Logs → ابحث عن أخطاء
2. Variables → تأكد من `REDIS_URL` صحيح
3. Start Command → تأكد من الصيغة الصحيحة

**الحل:**
```bash
# في Railway Shell
bundle exec sidekiq -C config/sidekiq.yml
```

### Redis Connection Failed

**التحقق:**
1. Redis Project → Variables → `RAILWAY_PRIVATE_DOMAIN`
2. Redis Project → Variables → `VALKEY_PASSWORD`
3. Worker Project → Variables → `REDIS_URL`

**الحل:**
- تأكد من أن `REDIS_URL` بصيغة: `redis://default:password@host:6379`
- جرب الاتصال يدوياً من Worker Shell

### Build Fails

**التحقق:**
1. Logs → Build logs
2. تأكد من وجود `Gemfile` و `package.json`
3. تأكد من Node.js و Ruby versions

**الحل:**
- أضف `runtime.txt` للـ Ruby version
- أضف `.nvmrc` للـ Node.js version

## 📊 Monitoring

### Worker Health

في Railway Dashboard:
- **Metrics** → CPU, Memory usage
- **Logs** → Real-time logs
- **Deployments** → Deployment history

### Sidekiq Dashboard (اختياري)

يمكنك إضافة Sidekiq Web UI:

1. أضف route في Rails:
```ruby
# config/routes.rb
require 'sidekiq/web'
mount Sidekiq::Web => '/sidekiq'
```

2. أضف authentication (مهم!)
3. افتح: `https://your-frontend-url.com/sidekiq`

## 🎯 Best Practices

1. **Environment Variables**: استخدم Railway Variables (ليس hardcoded)
2. **Secrets**: لا تضع secrets في الكود
3. **Logging**: استخدم `RAILS_LOG_TO_STDOUT=true`
4. **Monitoring**: راقب Logs بانتظام
5. **Scaling**: يمكنك scale Worker حسب الحاجة

## ✅ Checklist

- [ ] Railway Redis Project موجود ويعمل
- [ ] Railway Worker Project موجود
- [ ] GitHub repo مربوط
- [ ] Environment Variables مُعدّة
- [ ] Start Command صحيح
- [ ] Worker يبدأ بنجاح
- [ ] Logs تظهر Sidekiq running
- [ ] Redis connection يعمل

---

**جاهز! Worker يجب أن يعمل الآن 🚀**

