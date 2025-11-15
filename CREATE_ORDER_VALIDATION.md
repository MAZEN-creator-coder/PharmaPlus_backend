╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║              ✅ Create Order with Full Validation                  ║
║                                                                    ║
║        التحقق الشامل عند إنشاء طلب جديد                           ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 📋 ما هو الـ Validation؟

الآن عند إنشاء order جديد، النظام يفحص:

✅ 1️⃣ **User موجود** - نتأكد إن الـ user موجود في الـ database
✅ 2️⃣ **Pharmacy موجودة** - نتأكد إن الصيدلية موجودة
✅ 3️⃣ **Medicine موجود** - نتأكد إن كل دواء في الطلب موجود
✅ 4️⃣ **Medicine ينتمي للصيدلية** - نتأكد إن الأدوية خاصة بالصيدلية اللي في الطلب
✅ 5️⃣ **Stock كافي** - نتأكد إن الكمية المطلوبة موجودة بالمخزون

---

## 🔄 خطوات الـ Validation:

```
┌─────────────────────────────────────────────────────────┐
│ 1. Check if userId is provided                          │
│    ↓ if missing → 400 Bad Request                       │
│                                                         │
│ 2. Check if pharmacyId is provided                      │
│    ↓ if missing → 400 Bad Request                       │
│                                                         │
│ 3. Check if items array exists and not empty           │
│    ↓ if empty → 400 Bad Request                         │
│                                                         │
│ 4. Find User by userId                                 │
│    ↓ if not found → 404 User Not Found                 │
│                                                         │
│ 5. Find Pharmacy by pharmacyId                         │
│    ↓ if not found → 404 Pharmacy Not Found             │
│                                                         │
│ 6. For EACH item in items:                             │
│    └─ Check medicine id exists → 400 if missing        │
│    └─ Check quantity > 0 → 400 if not valid            │
│    └─ Find Medicine by id → 404 if not found           │
│    └─ Check medicine belongs to pharmacy → 400 if not  │
│    └─ Check stock >= requested quantity → 400 if not   │
│                                                         │
│ 7. ✅ All validations pass → Create Order              │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 مثال Request الصحيح:

### **POST** `/api/orders`

```json
{
  "userId": "user_123",
  "pharmacyId": "pharmacy_456",
  "items": [
    {
      "medicine": "medicine_789",
      "quantity": 2
    },
    {
      "medicine": "medicine_101",
      "quantity": 5
    }
  ],
  "address": {
    "street": "شارع النيل",
    "city": "القاهرة",
    "postalCode": "12345",
    "phone": "01234567890",
    "additionalDirections": "بجانب الفندق"
  },
  "paymentMethod": "credit_card",
  "total": "500"
}
```

---

## ❌ Error Messages:

### **1. Missing userId**
```json
{
  "status": "error",
  "data": {
    "msg": "userId is required"
  }
}
```
**Status**: 400 Bad Request

---

### **2. Missing pharmacyId**
```json
{
  "status": "error",
  "data": {
    "msg": "pharmacyId is required"
  }
}
```
**Status**: 400 Bad Request

---

### **3. Empty items array**
```json
{
  "status": "error",
  "data": {
    "msg": "items array is required and cannot be empty"
  }
}
```
**Status**: 400 Bad Request

---

### **4. User not found**
```json
{
  "status": "error",
  "data": {
    "msg": "User not found"
  }
}
```
**Status**: 404 Not Found

---

### **5. Pharmacy not found**
```json
{
  "status": "error",
  "data": {
    "msg": "Pharmacy not found"
  }
}
```
**Status**: 404 Not Found

---

### **6. Medicine not found**
```json
{
  "status": "error",
  "data": {
    "msg": "Medicine with id medicine_xyz not found"
  }
}
```
**Status**: 404 Not Found

---

### **7. Medicine doesn't belong to pharmacy**
```json
{
  "status": "error",
  "data": {
    "msg": "Medicine أسبرين does not belong to this pharmacy"
  }
}
```
**Status**: 400 Bad Request

---

### **8. Not enough stock**
```json
{
  "status": "error",
  "data": {
    "msg": "Not enough stock for medicine أسبرين. Available: 3, Requested: 5"
  }
}
```
**Status**: 400 Bad Request

---

### **9. Invalid quantity**
```json
{
  "status": "error",
  "data": {
    "msg": "quantity must be greater than 0 for all items"
  }
}
```
**Status**: 400 Bad Request

---

### **10. Missing medicine id in item**
```json
{
  "status": "error",
  "data": {
    "msg": "medicine id is required for all items"
  }
}
```
**Status**: 400 Bad Request

---

## ✅ Success Response:

```json
{
  "status": "success",
  "data": {
    "order": {
      "_id": "order_123",
      "userId": "user_123",
      "pharmacyId": "pharmacy_456",
      "items": [
        {
          "medicine": "medicine_789",
          "quantity": 2,
          "_id": "item_1"
        },
        {
          "medicine": "medicine_101",
          "quantity": 5,
          "_id": "item_2"
        }
      ],
      "date": "2025-11-15",
      "status": "Pending",
      "total": "500",
      "paymentMethod": "credit_card",
      "address": {
        "street": "شارع النيل",
        "city": "القاهرة",
        "postalCode": "12345",
        "phone": "01234567890",
        "additionalDirections": "بجانب الفندق"
      },
      "createdAt": "2025-11-15T10:30:00.000Z",
      "updatedAt": "2025-11-15T10:30:00.000Z"
    }
  }
}
```

**Status**: 201 Created

---

## 🧪 أمثلة الاختبار:

### **Test 1: Order صحيح - يجب ينجح**
```bash
curl -X POST "http://localhost:5000/api/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "pharmacyId": "507f1f77bcf86cd799439012",
    "items": [
      {
        "medicine": "507f1f77bcf86cd799439013",
        "quantity": 2
      }
    ],
    "address": {
      "street": "شارع النيل",
      "city": "القاهرة",
      "postalCode": "12345",
      "phone": "01234567890"
    },
    "paymentMethod": "credit_card",
    "total": "200"
  }' | json_pp
```

**النتيجة المتوقعة**: ✅ Order تم إنشاؤه بنجاح - 201 Created

---

### **Test 2: User غير موجود - يجب يفشل**
```bash
curl -X POST "http://localhost:5000/api/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "userId": "invalid_user_id",
    "pharmacyId": "507f1f77bcf86cd799439012",
    "items": [
      {
        "medicine": "507f1f77bcf86cd799439013",
        "quantity": 2
      }
    ],
    "address": {...},
    "paymentMethod": "credit_card",
    "total": "200"
  }' | json_pp
```

**النتيجة المتوقعة**: ❌ 404 User not found

---

### **Test 3: Pharmacy غير موجودة - يجب يفشل**
```bash
curl -X POST "http://localhost:5000/api/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "pharmacyId": "invalid_pharmacy_id",
    "items": [
      {
        "medicine": "507f1f77bcf86cd799439013",
        "quantity": 2
      }
    ],
    "address": {...},
    "paymentMethod": "credit_card",
    "total": "200"
  }' | json_pp
```

**النتيجة المتوقعة**: ❌ 404 Pharmacy not found

---

### **Test 4: Medicine غير موجود - يجب يفشل**
```bash
curl -X POST "http://localhost:5000/api/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "pharmacyId": "507f1f77bcf86cd799439012",
    "items": [
      {
        "medicine": "invalid_medicine_id",
        "quantity": 2
      }
    ],
    "address": {...},
    "paymentMethod": "credit_card",
    "total": "200"
  }' | json_pp
```

**النتيجة المتوقعة**: ❌ 404 Medicine not found

---

### **Test 5: المخزون غير كافي - يجب يفشل**
```bash
curl -X POST "http://localhost:5000/api/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "pharmacyId": "507f1f77bcf86cd799439012",
    "items": [
      {
        "medicine": "507f1f77bcf86cd799439013",
        "quantity": 1000
      }
    ],
    "address": {...},
    "paymentMethod": "credit_card",
    "total": "100000"
  }' | json_pp
```

**النتيجة المتوقعة**: ❌ 400 Not enough stock

---

### **Test 6: Items فارغة - يجب يفشل**
```bash
curl -X POST "http://localhost:5000/api/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "pharmacyId": "507f1f77bcf86cd799439012",
    "items": [],
    "address": {...},
    "paymentMethod": "credit_card",
    "total": "0"
  }' | json_pp
```

**النتيجة المتوقعة**: ❌ 400 items array is required and cannot be empty

---

## 📝 الكود الفعلي:

```javascript
const createOrder = asyncWrapper(async (req, res) => {
  const { userId, pharmacyId, items, address, paymentMethod, total } = req.body;

  // 1. تحقق من وجود userId
  if (!userId) {
    const error = new Error("userId is required");
    error.statusCode = 400;
    throw error;
  }

  // 2. تحقق من وجود pharmacyId
  if (!pharmacyId) {
    const error = new Error("pharmacyId is required");
    error.statusCode = 400;
    throw error;
  }

  // 3. تحقق من وجود items غير فارغة
  if (!items || items.length === 0) {
    const error = new Error("items array is required and cannot be empty");
    error.statusCode = 400;
    throw error;
  }

  // 4. تحقق من وجود User
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  // 5. تحقق من وجود Pharmacy
  const pharmacy = await Pharmacy.findById(pharmacyId);
  if (!pharmacy) {
    const error = new Error("Pharmacy not found");
    error.statusCode = 404;
    throw error;
  }

  // 6. لكل item تحقق من:
  for (let item of items) {
    // 6a. تحقق من وجود medicine id
    if (!item.medicine) {
      const error = new Error("medicine id is required for all items");
      error.statusCode = 400;
      throw error;
    }

    // 6b. تحقق من أن quantity > 0
    if (!item.quantity || item.quantity <= 0) {
      const error = new Error("quantity must be greater than 0 for all items");
      error.statusCode = 400;
      throw error;
    }

    // 6c. تحقق من وجود Medicine
    const medicine = await Medicine.findById(item.medicine);
    if (!medicine) {
      const error = new Error(`Medicine with id ${item.medicine} not found`);
      error.statusCode = 404;
      throw error;
    }

    // 6d. تحقق من أن Medicine ينتمي لهذه الصيدلية
    if (medicine.pharmacy.toString() !== pharmacyId) {
      const error = new Error(`Medicine ${medicine.name} does not belong to this pharmacy`);
      error.statusCode = 400;
      throw error;
    }

    // 6e. تحقق من أن الكمية متوفرة
    if (medicine.stock < item.quantity) {
      const error = new Error(`Not enough stock for medicine ${medicine.name}. Available: ${medicine.stock}, Requested: ${item.quantity}`);
      error.statusCode = 400;
      throw error;
    }
  }

  // 7. إنشاء الـ order
  const orderData = {
    userId,
    pharmacyId,
    items,
    address,
    paymentMethod,
    total,
    date: new Date().toISOString().split('T')[0],
    status: "Pending"
  };

  const newOrder = await Order.create(orderData);

  res.status(201).json({
    status: httpStatus.success,
    data: { order: newOrder },
  });
});
```

---

## 🎯 الخلاصة:

الآن `createOrder` بيتحقق من:
✅ وجود User
✅ وجود Pharmacy  
✅ وجود كل Medicine
✅ انتماء الأدوية للصيدلية
✅ توفر الكمية المطلوبة

إذا أي حاجة غير تمام → ترجع error مباشرة ❌
إذا كل حاجة تمام → ينشئ الـ Order ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
