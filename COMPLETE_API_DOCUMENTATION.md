╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║              📚 API Documentation - جميع الـ Endpoints             ║
║                                                                    ║
║                   Complete API Reference Guide                   ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# 🔐 USERS ENDPOINTS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1️⃣ تسجيل مستخدم جديد
**POST** `/api/users/register`

### البيانات المرسلة (Request Body):
```json
{
  "firstname": "string",           // ✅ مطلوب
  "lastname": "string",            // ❌ اختياري
  "email": "string",               // ✅ مطلوب
  "password": "string",            // ✅ مطلوب
  "role": "admin|user",            // ❌ اختياري (default: user)
  "phone": "string",               // ❌ اختياري
  "dob": "string",                 // ❌ اختياري (YYYY-MM-DD)
  "address": "string",             // ✅ مطلوب
  "latitude": "number",            // ❌ اختياري (من Geolocation)
  "longitude": "number",           // ❌ اختياري (من Geolocation)
  "avatar": "file"                 // ❌ اختياري (صورة)
}
```

### الاستجابة (Response):
```json
{
  "status": "success",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "_id": "user_id",
      "firstname": "أحمد",
      "lastname": "محمد",
      "email": "admin@test.com",
      "role": "admin",
      "address": "الرياض",
      "position": {
        "lat": 24.7136,
        "lng": 46.6753
      },
      "pharmacyId": "pharmacy_id"   // ✅ إذا كان admin
    }
  }
}
```

### ملاحظات مهمة:
- ✅ إذا `role` = "admin" → تُنشأ صيدلية تلقائياً
- ✅ الموقع يأتي من Geolocation أولاً، ثم من العنوان
- ✅ Avatar يُرفع كـ multipart/form-data

---

## 2️⃣ تسجيل الدخول
**POST** `/api/users/login`

### البيانات المرسلة:
```json
{
  "email": "string",              // ✅ مطلوب
  "password": "string"            // ✅ مطلوب
}
```

### الاستجابة:
```json
{
  "status": "success",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "_id": "user_id",
      "firstname": "أحمد",
      "email": "admin@test.com",
      "role": "admin",
      "avatar": "uploads/user-123.png"
    }
  }
}
```

### رموز الخطأ:
- 400: Email و Password مطلوبة
- 404: User غير موجود
- 401: Password خاطئ

---

## 3️⃣ الحصول على الملف الشخصي
**GET** `/api/users/profile`

### Headers المطلوبة:
```
Authorization: Bearer jwt_token_here
```

### الاستجابة:
```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "user_id",
      "firstname": "أحمد",
      "lastname": "محمد",
      "fullName": "أحمد محمد",
      "email": "admin@test.com",
      "phone": "0501234567",
      "address": "الرياض",
      "position": {
        "lat": 24.7136,
        "lng": 46.6753
      },
      "avatar": "uploads/user-123.png"
    }
  }
}
```

---

## 4️⃣ تحديث الملف الشخصي
**PUT** `/api/users/profile`

### Headers:
```
Authorization: Bearer jwt_token_here
Content-Type: multipart/form-data
```

### البيانات المرسلة:
```json
{
  "firstname": "string",           // ❌ اختياري
  "lastname": "string",            // ❌ اختياري
  "phone": "string",               // ❌ اختياري
  "address": "string",             // ❌ اختياري
  "latitude": "number",            // ❌ اختياري
  "longitude": "number",           // ❌ اختياري
  "avatar": "file"                 // ❌ اختياري
}
```

### الاستجابة:
```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "user_id",
      "firstname": "أحمد",
      "address": "جدة",
      "position": {
        "lat": 21.5431,
        "lng": 39.1728
      }
    }
  }
}
```

---

## 5️⃣ الحصول على جميع المستخدمين
**GET** `/api/users?limit=10&page=1`

### Headers:
```
Authorization: Bearer jwt_token_here
```

### معاملات Query:
```
?limit=10        // ❌ اختياري (default: 10)
&page=1          // ❌ اختياري (default: 1)
```

### الاستجابة:
```json
{
  "status": "success",
  "data": {
    "users": [
      {
        "_id": "user_id_1",
        "firstname": "أحمد",
        "email": "admin@test.com",
        "role": "admin"
      },
      {
        "_id": "user_id_2",
        "firstname": "محمد",
        "email": "user@test.com",
        "role": "user"
      }
    ]
  }
}
```

---

## 6️⃣ الحصول على مستخدم بـ ID
**GET** `/api/users/:id`

### Headers:
```
Authorization: Bearer jwt_token_here
```

### الاستجابة:
```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "user_id",
      "firstname": "أحمد",
      "lastname": "محمد",
      "email": "admin@test.com",
      "role": "admin"
    }
  }
}
```

---

## 7️⃣ تحديث مستخدم بـ ID
**PUT** `/api/users/:id`

### Headers:
```
Authorization: Bearer jwt_token_here
Content-Type: multipart/form-data
```

### البيانات المرسلة:
```json
{
  "firstname": "string",      // ❌ اختياري
  "lastname": "string",       // ❌ اختياري
  "phone": "string",          // ❌ اختياري
  "avatar": "file"            // ❌ اختياري
}
```

---

## 8️⃣ حذف مستخدم
**DELETE** `/api/users/:id`

### Headers:
```
Authorization: Bearer jwt_token_here
```

### الاستجابة:
```json
{
  "status": "success",
  "message": "User deleted successfully"
}
```

---

## 9️⃣ إضافة محادثة
**POST** `/api/users/:id/conversations`

### Headers:
```
Authorization: Bearer jwt_token_here
```

### البيانات المرسلة:
```json
{
  "message": "string",             // ✅ مطلوب
  "timestamp": "string"            // ❌ اختياري
}
```

---

## 🔟 تحديث التفضيلات
**PUT** `/api/users/:id/preferences`

### Headers:
```
Authorization: Bearer jwt_token_here
```

### البيانات المرسلة:
```json
{
  "newsletter": "boolean",         // ❌ اختياري
  "smsAlerts": "boolean"           // ❌ اختياري
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# 💊 MEDICINES ENDPOINTS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1️⃣ إنشاء دواء جديد
**POST** `/api/medicines`

### Headers:
```
Authorization: Bearer jwt_token_here
Content-Type: multipart/form-data
```

### البيانات المرسلة:
```json
{
  "name": "string",                // ✅ مطلوب
  "scientificName": "string",      // ❌ اختياري
  "description": "string",         // ❌ اختياري
  "price": "number",               // ✅ مطلوب
  "quantity": "number",            // ✅ مطلوب
  "category": "string",            // ✅ مطلوب
  "pharmacy": "pharmacyId",        // ✅ مطلوب
  "medicineImage": "file"          // ❌ اختياري
}
```

### الاستجابة:
```json
{
  "status": "success",
  "data": {
    "medicine": {
      "_id": "medicine_id",
      "name": "أسبرين",
      "price": 10,
      "quantity": 100,
      "category": "مسكنات",
      "pharmacy": "pharmacy_id"
    }
  }
}
```

---

## 2️⃣ الحصول على جميع الأدوية
**GET** `/api/medicines`

### Headers:
```
Authorization: Bearer jwt_token_here
```

### الاستجابة:
```json
{
  "status": "success",
  "data": {
    "medicines": [
      {
        "_id": "medicine_id_1",
        "name": "أسبرين",
        "price": 10,
        "quantity": 100,
        "category": "مسكنات",
        "pharmacy": "pharmacy_id"
      }
    ]
  }
}
```

---

## 3️⃣ الحصول على دواء بـ ID
**GET** `/api/medicines/:id`

### Headers:
```
Authorization: Bearer jwt_token_here
```

### الاستجابة:
```json
{
  "status": "success",
  "data": {
    "medicine": {
      "_id": "medicine_id",
      "name": "أسبرين",
      "scientificName": "Acetylsalicylic acid",
      "price": 10,
      "quantity": 100
    }
  }
}
```

---

## 4️⃣ البحث عن أدوية بالاسم
**GET** `/api/medicines/search?name=أسبرين`

### Headers:
```
Authorization: Bearer jwt_token_here
```

### معاملات Query:
```
?name=string     // ✅ مطلوب
```

---

## 5️⃣ الحصول على أدوية منخفضة المخزون
**GET** `/api/medicines/low-stock`

### Headers:
```
Authorization: Bearer jwt_token_here
```

---

## 6️⃣ الحصول على أدوية صيدلية معينة
**GET** `/api/medicines/pharmacy/:pharmacyId`

### Headers:
```
Authorization: Bearer jwt_token_here
```

---

## 7️⃣ تحديث دواء
**PUT** `/api/medicines/:id`

### Headers:
```
Authorization: Bearer jwt_token_here
Content-Type: multipart/form-data
```

### البيانات المرسلة:
```json
{
  "name": "string",                // ❌ اختياري
  "price": "number",               // ❌ اختياري
  "quantity": "number",            // ❌ اختياري
  "category": "string",            // ❌ اختياري
  "medicineImage": "file"          // ❌ اختياري
}
```

---

## 8️⃣ حذف دواء
**DELETE** `/api/medicines/:id`

### Headers:
```
Authorization: Bearer jwt_token_here
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# 🏥 PHARMACIES ENDPOINTS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1️⃣ إنشاء صيدلية جديدة
**POST** `/api/pharmacies`

### Headers:
```
Authorization: Bearer jwt_token_here
Content-Type: multipart/form-data
```

### البيانات المرسلة:
```json
{
  "name": "string",                // ✅ مطلوب
  "license": "string",             // ❌ اختياري
  "contact": "string",             // ❌ اختياري
  "email": "string",               // ❌ اختياري
  "address": "string",             // ❌ اختياري
  "latitude": "number",            // ❌ اختياري
  "longitude": "number",           // ❌ اختياري
  "description": "string",         // ❌ اختياري
  "img": "file"                    // ❌ اختياري (صورة)
}
```

### الاستجابة:
```json
{
  "status": "success",
  "data": {
    "pharmacy": {
      "_id": "pharmacy_id",
      "name": "صيدلية النور",
      "address": "الرياض - حي الملز",
      "position": {
        "lat": 24.7136,
        "lng": 46.6753
      },
      "status": "inactive"
    }
  }
}
```

---

## 2️⃣ الحصول على جميع الصيدليات
**GET** `/api/pharmacies`

### Headers:
```
Authorization: Bearer jwt_token_here
```

### الاستجابة:
```json
{
  "status": "success",
  "data": {
    "pharmacies": [
      {
        "_id": "pharmacy_id_1",
        "name": "صيدلية النور",
        "address": "الرياض",
        "position": {
          "lat": 24.7136,
          "lng": 46.6753
        },
        "status": "active"
      }
    ]
  }
}
```

---

## 3️⃣ الحصول على صيدلية بـ ID
**GET** `/api/pharmacies/:id`

### Headers:
```
Authorization: Bearer jwt_token_here
```

---

## 4️⃣ الحصول على أدوية الصيدلية
**GET** `/api/pharmacies/:id/medicines`

### Headers:
```
Authorization: Bearer jwt_token_here
```

---

## 5️⃣ الحصول على لوحة تحكم الصيدلية
**GET** `/api/pharmacies/:id/dashboard`

### Headers:
```
Authorization: Bearer jwt_token_here
```

### الاستجابة:
```json
{
  "status": "success",
  "data": {
    "dashboard": {
      "totalSales": 5000,
      "totalOrders": 25,
      "totalProducts": 100,
      "totalCustomers": 50
    }
  }
}
```

---

## 6️⃣ الحصول على أفضل الأدوية
**GET** `/api/pharmacies/:id/top-medicines`

### Headers:
```
Authorization: Bearer jwt_token_here
```

---

## 7️⃣ الحصول على المبيعات حسب الفئة
**GET** `/api/pharmacies/:id/sales-by-category`

### Headers:
```
Authorization: Bearer jwt_token_here
```

---

## 8️⃣ الحصول على تنبيهات المخزون المنخفض
**GET** `/api/pharmacies/:id/low-stock-alerts`

### Headers:
```
Authorization: Bearer jwt_token_here
```

---

## 9️⃣ الحصول على تحليلات المستخدمين
**GET** `/api/pharmacies/:id/customer-analytics`

### Headers:
```
Authorization: Bearer jwt_token_here
```

---

## 🔟 تحديث صيدلية
**PUT** `/api/pharmacies/:id`

### Headers:
```
Authorization: Bearer jwt_token_here
Content-Type: multipart/form-data
```

### البيانات المرسلة:
```json
{
  "name": "string",                // ❌ اختياري
  "address": "string",             // ❌ اختياري
  "contact": "string",             // ❌ اختياري
  "latitude": "number",            // ❌ اختياري
  "longitude": "number",           // ❌ اختياري
  "img": "file"                    // ❌ اختياري
}
```

---

## 1️⃣1️⃣ حذف صيدلية
**DELETE** `/api/pharmacies/:id`

### Headers:
```
Authorization: Bearer jwt_token_here
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# 📦 ORDERS ENDPOINTS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1️⃣ إنشاء طلب جديد
**POST** `/api/orders`

### Headers:
```
Authorization: Bearer jwt_token_here
```

### البيانات المرسلة:
```json
{
  "user": "userId",                // ✅ مطلوب
  "pharmacy": "pharmacyId",        // ✅ مطلوب
  "items": [
    {
      "medicine": "medicineId",    // ✅ مطلوب
      "quantity": "number"         // ✅ مطلوب
    }
  ],
  "totalPrice": "number",          // ✅ مطلوب
  "status": "pending"              // ❌ اختياري (default: pending)
}
```

### الاستجابة:
```json
{
  "status": "success",
  "data": {
    "order": {
      "_id": "order_id",
      "user": "user_id",
      "pharmacy": "pharmacy_id",
      "items": [...],
      "totalPrice": 150,
      "status": "pending"
    }
  }
}
```

---

## 2️⃣ الحصول على جميع الطلبات
**GET** `/api/orders`

### Headers:
```
Authorization: Bearer jwt_token_here
```

---

## 3️⃣ الحصول على طلب بـ ID
**GET** `/api/orders/:id`

### Headers:
```
Authorization: Bearer jwt_token_here
```

---

## 4️⃣ الحصول على طلبات المستخدم
**GET** `/api/orders/user/:userId`

### Headers:
```
Authorization: Bearer jwt_token_here
```

---

## 5️⃣ الحصول على طلبات الصيدلية
**GET** `/api/orders/pharmacy/:pharmacyId`

### Headers:
```
Authorization: Bearer jwt_token_here
```

---

## 6️⃣ تحديث حالة الطلب
**PUT** `/api/orders/:id/status`

### Headers:
```
Authorization: Bearer jwt_token_here
```

### البيانات المرسلة:
```json
{
  "status": "pending|processing|shipped|delivered|cancelled"  // ✅ مطلوب
}
```

---

## 7️⃣ حذف طلب
**DELETE** `/api/orders/:id`

### Headers:
```
Authorization: Bearer jwt_token_here
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# 🔑 ملخص الحقول المطلوبة vs الاختيارية

## Legend:
- ✅ **مطلوب**: يجب إرساله دائماً
- ❌ **اختياري**: قد يُرسل أو لا

## الحقول المتكررة:

### Authentication:
```
Authorization: Bearer {token}  // ✅ مطلوب في معظم الـ endpoints
```

### File Upload:
```
Content-Type: multipart/form-data  // ✅ عند رفع صور
```

### Pagination:
```
?limit=10      // ❌ اختياري
&page=1        // ❌ اختياري
```

---

# 🎯 Error Codes المتوقعة:

| Code | المعنى |
|------|--------|
| 200 | نجاح |
| 201 | تم الإنشاء بنجاح |
| 400 | بيانات خاطئة |
| 401 | غير مصرح (بدون Token) |
| 403 | ممنوع الوصول |
| 404 | لم يتم العثور عليه |
| 500 | خطأ في الخادم |

---

# 💡 نصائح عملية:

1️⃣ **دائماً أضف Token** في الـ Header لـ endpoints المحمية
2️⃣ **استخدم Multipart** عند رفع الملفات
3️⃣ **تحقق من الخطأ** إذا كانت الاستجابة غير متوقعة
4️⃣ **استخدم Pagination** للـ GET requests الضخمة
5️⃣ **حفظ الـ IDs** بعد الإنشاء للاستخدام لاحقاً

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
