# إدارة خزينة المناوبات

تطبيق داخلي لإدارة خزينة المحل والمناوبات، مبني بنسخة تشغيل حقيقية تركّز على:

- فصل واضح بين واجهة `admin` وواجهة `worker`
- مصادقة فعلية عبر Firebase Authentication
- جلسات آمنة عبر `httpOnly session cookie`
- عمليات حساسة تمر من الخادم فقط
- تخزين أسرار Telegram بشكل مقنّع ومشفّر من جهة الخادم
- دعم Offline queue للعامل ضمن نطاق جلسة العامل فقط

## ما الذي أزيل من المشروع

- جميع بيانات `demo/mock`
- أي حسابات جاهزة داخل الكود
- كلمات مرور ثابتة
- seed users
- mock auth
- المقارنة المحلية لكلمات السر في الواجهة
- fallback غير آمن لـ Telegram
- المتجر المحلي `zustand` كمصدر حقيقة للبيانات

## الهيكل الحالي

```text
app/admin/*                    صفحات الإدارة
app/worker/*                   صفحات العامل
app/setup/*                    التهيئة الأولى للنظام
app/api/auth/*                 تسجيل الدخول والجلسات
app/api/admin/*                عمليات الإدارة الحساسة
app/api/worker/*               عمليات العامل المحمية
app/api/sync/*                 مزامنة طابور العمل بدون إنترنت
app/api/public/*               واجهات عامة محدودة وآمنة
components/admin/*             واجهات الإدارة
components/auth/*              نماذج الدخول والتهيئة الأولى
components/worker/*            واجهات العامل
lib/server/*                   Firebase Admin, sessions, RBAC, crypto, repositories
offline/*                      IndexedDB queue scoped per worker
firestore/*                    Security Rules + Indexes
```

## المصادقة

### الأدمن

- يستخدم Firebase Authentication بصيغة `email + password`
- تسجيل الدخول يتم عبر Route Handler:
  - [`app/api/auth/admin/login/route.ts`](/E:/CODEX/codex/app/api/auth/admin/login/route.ts)
- بعد نجاح التحقق يتم إنشاء `session cookie` آمنة
- التحقق من الدور يتم عبر:
  - custom claims
  - وثيقة `users/{uid}`
  - فحص server-side في الصفحات والـ API

### العامل

تجربة الدخول:

1. العامل يفتح `/worker/login`
2. يختار اسمه من قائمة عامة محدودة
3. يدخل كلمة السر
4. الخادم هو الذي يتحقق من صحة كلمة السر عبر Firebase Auth

التفاصيل الأمنية:

- الواجهة لا تقارن كلمة السر محليًا
- كلمة السر لا تُخزّن كنص صريح في Firestore
- العامل يملك حساب Firebase Auth حقيقيًا في الخلفية
- الـ UI لا يحتاج لإظهار البريد الحقيقي للعامل
- Route الدخول:
  - [`app/api/auth/worker/login/route.ts`](/E:/CODEX/codex/app/api/auth/worker/login/route.ts)

## الإعداد الأول

إذا كانت قاعدة البيانات غير مهيأة، ينتقل التطبيق إلى:

- `/setup`

التهيئة الأولى:

- تنشئ أول مسؤول
- تنشئ وثيقة `system/bootstrap`
- تنشئ إعدادات النظام الأساسية
- تمنع إنشاء مسؤول أول مرة ثانية

يشترط إدخال:

- `SETUP_SECRET`

وهو سر تهيئة أولية يجب ضبطه في البيئة قبل التشغيل.

## إدارة العمال

المسؤول فقط يمكنه:

- إنشاء عامل
- تعديل بياناته
- تعطيله/تفعيله
- إعادة تعيين كلمة السر
- حذفه منطقيًا `soft delete`

العمليات الحساسة تتم عبر:

- [`app/api/admin/workers/route.ts`](/E:/CODEX/codex/app/api/admin/workers/route.ts)
- [`app/api/admin/workers/[workerId]/route.ts`](/E:/CODEX/codex/app/api/admin/workers/[workerId]/route.ts)
- [`app/api/admin/workers/[workerId]/reset-password/route.ts`](/E:/CODEX/codex/app/api/admin/workers/[workerId]/reset-password/route.ts)

## Telegram بشكل آمن

صفحة الإدارة:

- `/admin/settings/telegram`

التصميم الأمني:

- الإعدادات العامة تُحفظ في `settings/app`
- `chatId`, `enabled`, `notifications` تُعرض للإدارة
- `bot token` لا يعود للواجهة كنص خام
- بعد الحفظ يعرض بشكل `Masked` فقط
- السر الحقيقي يُخزّن مشفرًا في:
  - `secrets/telegram`
- التشفير يتم على الخادم باستخدام:
  - `APP_ENCRYPTION_KEY`

الإرسال الفعلي يتم من الخادم فقط عبر:

- [`app/api/admin/settings/telegram/test/route.ts`](/E:/CODEX/codex/app/api/admin/settings/telegram/test/route.ts)

## ما الذي يُخزن في Firebase

### Firestore

- `users`
- `workers`
- `shifts`
- `transactions`
- `settings`
- `secrets`
- `auditLogs`
- `system`

### Firebase Authentication

- حسابات الأدمن
- حسابات العمال
- custom claims للأدوار:
  - `role=admin`
  - `role=worker`
  - `workerId` للعامل

## ما الذي يُخزن محليًا

محليًا في المتصفح:

- طابور عمليات offline فقط
- ضمن IndexedDB (ومع fallback تلقائي إلى LocalStorage إذا IndexedDB غير متاح في المتصفح)
- scoped حسب `workerId`
- يُمسح عند تسجيل الخروج
- لا يحتوي أسرار Telegram
- يحتوي تفعيل الجهاز للعامل، وقد يشمل كلمة السر المحلية اللازمة للدخول الأوفلاين حسب إعداد الإصدار الحالي
- لا يمنح أي صلاحيات إضافية عند الرفع

## Offline Mode

العامل يمكنه عند انقطاع الاتصال:

- فتح مناوبة
- تسجيل عملية
- إغلاق مناوبة

لكن ذلك يُخزن كـ queue محلية فقط، ثم يرفع إلى:

- [`app/api/sync/route.ts`](/E:/CODEX/codex/app/api/sync/route.ts)

التحقق عند المزامنة:

- الجلسة الحالية يجب أن تكون صالحة
- `workerId` في العنصر يجب أن يطابق جلسة العامل
- لا يمكن رفع عنصر باسم عامل آخر
- الخادم يعيد تطبيق نفس validations والصلاحيات

### كيف ينجح التفعيل المحلي/الدخول المحلي 100%

لكي يعمل "فتح العامل محليًا" بدون ظهور رسالة:

> تعذر فتح الدخول المحلي. تحقق من كلمة السر أو أعد التفعيل بالإنترنت.

اتبع الخطوات التالية بالترتيب:

1. **فعّل العامل على نفس الجهاز ونفس المتصفح**
   - افتح `/worker/login` وأنت متصل بالإنترنت.
   - سجل دخول العامل مرة واحدة بنجاح.
   - انتظر رسالة النجاح التي تؤكد تفعيل الجهاز للأوفلاين.
2. **لا تغيّر بيئة التخزين المحلية**
   - يجب أن يكون الدخول الأوفلاين من نفس Browser profile (نفس حساب Chrome/Edge ونفس بيانات المتصفح).
   - إذا استخدمت نافذة خاصة/Incognito فلن ترى بيانات التفعيل المحلية.
3. **إذا غيّرت كلمة السر من الإدارة**
   - ادخل مرة جديدة بالإنترنت بكلمة السر الجديدة لتحديث التفعيل المحلي، ثم جرّب الأوفلاين.

### أسباب الفشل الشائعة (وحل كل سبب)

- **تم تسجيل الدخول محليًا من متصفح مختلف**
  - الحل: أعد التفعيل بالإنترنت من نفس المتصفح الذي ستعمل به.
- **تم مسح بيانات المتصفح (IndexedDB / LocalStorage / Site data)**
  - الحل: أعد الدخول بالإنترنت لتوليد تفعيل جديد.
- **الدخول في وضع Incognito/Private**
  - الحل: استخدم نافذة عادية.
- **تمت إعادة تعيين كلمة مرور العامل**
  - الحل: دخول أونلاين مرة واحدة بعد التغيير.

### Checklist سريع قبل العمل بدون إنترنت

- [ ] دخلت أونلاين مرة واحدة بنجاح من نفس الجهاز.
- [ ] ظهرت رسالة تفعيل الجهاز للأوفلاين.
- [ ] أستعمل نفس المتصفح ونفس الحساب داخله.
- [ ] لا أستخدم Incognito.
- [ ] لم أمسح بيانات الموقع من المتصفح منذ آخر تفعيل.


## سجل التدقيق Audit Log

يسجّل العمليات الحساسة مثل:

- إنشاء عامل
- تحديث عامل
- حذف منطقي
- إعادة تعيين كلمة السر
- تحديث إعدادات Telegram
- اختبار Telegram
- تحديث نسب الفائدة
- فتح وإغلاق المناوبات

والوصول إليه محصور بالإدارة فقط.

## Firestore Security Rules

القواعد الحالية في:

- [`firestore/firestore.rules`](/E:/CODEX/codex/firestore/firestore.rules)

الفكرة الأمنية:

- لا توجد كتابات مباشرة من العميل إلى المستندات الحساسة
- أغلب الكتابات تتم عبر Route Handlers تستخدم Firebase Admin SDK
- العامل يقرأ فقط بياناته أو بيانات مناوبته إذا استُخدمت القراءة المباشرة مستقبلًا
- `settings`, `secrets`, `auditLogs`, `system` محمية بشدة

## التشغيل المحلي الآمن

1. أنشئ ملف البيئة:

```bash
cp .env.example .env.local
```

2. املأ القيم التالية:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `APP_ENCRYPTION_KEY`
- `SETUP_SECRET`

3. شغّل المشروع:

```bash
npm install
npm run dev
```

4. افتح:

```text
http://localhost:3000
```

### تشخيص Firebase Admin أثناء التطوير

- إذا ظهرت شاشة تطلب إعداد `Firebase Admin` رغم أن القيم موجودة في `.env.local`، أوقف `npm run dev` ثم شغله من جديد.
- التطبيق يميز الآن بين:
  - متغيرات ناقصة
  - بيانات اعتماد غير صالحة
  - فشل تهيئة داخلي في الخادم
- في بيئة التطوير فقط يمكنك فتح:
  - `/setup/diagnostics`
- صفحة التشخيص لا تعرض أي أسرار، بل تعرض فقط:
  - هل المتغير موجود أم لا
  - نوع المشكلة العامة
  - تعليمات المراجعة الآمنة

### ملاحظات مهمة على متغيرات البيئة

- يمكن تزويد بيانات `Firebase Admin` بالطريقة المعتادة عبر:
  - `FIREBASE_ADMIN_PROJECT_ID`
  - `FIREBASE_ADMIN_CLIENT_EMAIL`
  - `FIREBASE_ADMIN_PRIVATE_KEY`
- أو لاحقًا عبر متغير JSON واحد:
  - `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON`
- عند استخدام `FIREBASE_ADMIN_PRIVATE_KEY` داخل `.env.local` يجب أن يبقى محفوظًا بصيغة صالحة، وعادة مع `\\n` داخل السطر الواحد.
- وجود المتغير لا يعني وحده أن التهيئة نجحت؛ يجب أن يتمكن الخادم من إنشاء اعتماد Firebase Admin فعليًا.

## قبل النشر Production

يجب عليك:

- استخدام Firebase project حقيقي منفصل للإنتاج
- ضبط Service Account خاص بالإنتاج
- توليد `APP_ENCRYPTION_KEY` بطول 32 bytes
- ضبط `SETUP_SECRET` قوي ثم تغييره/إزالته بعد التهيئة الأولى
- نشر قواعد Firestore والفهارس
- مراجعة النطاقات المسموحة في Firebase Auth
- تفعيل HTTPS فقط
- اختبار صلاحيات admin/worker بدقة
- مراقبة سجلات الدخول والفشل ومحاولات brute force

## ملاحظات أمنية

- المشروع لا يثق بالواجهة
- كل عملية حساسة تتحقق من الجلسة والدور على الخادم
- الرسائل الخطأ لا تعيد أسرارًا حساسة
- token الخاص بـ Telegram لا يُعاد مكشوفًا للمتصفح
- لا توجد حسابات افتراضية داخل الكود
