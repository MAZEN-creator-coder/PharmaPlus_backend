/**
 * 📍 خدمة حساب الموقع الجغرافي
 * Location Geocoding Service
 */

const axios = require('axios');

/**
 * حساب latitude و longitude من العنوان
 * يستخدم OpenStreetMap Nominatim API (مجاني)
 * 
 * @param {string} address - العنوان بالكامل
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
const geocodeAddress = async (address) => {
  try {
    if (!address || address.trim() === '') {
      console.log('⚠️ لا يوجد عنوان لحساب الموقع');
      return null;
    }

    console.log(`📍 جاري حساب موقع العنوان: ${address}`);

    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: address,
        format: 'json',
        limit: 1,
        language: 'ar', // النتائج بالعربية إن أمكن
      },
      headers: {
        'User-Agent': 'PharmaPlus-App/1.0'
      },
      timeout: 5000 // timeout 5 ثوان
    });

    if (response.data && response.data.length > 0) {
      const location = response.data[0];
      const position = {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lon)
      };

      console.log(`✅ تم حساب الموقع بنجاح: lat=${position.lat}, lng=${position.lng}`);
      return position;
    } else {
      console.log(`⚠️ لم يتم العثور على موقع للعنوان: ${address}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ خطأ في حساب الموقع:`, error.message);
    return null;
  }
};

/**
 * حساب المسافة بين نقطتين جغرافيتين (بالكيلومتر)
 * Using Haversine formula
 * 
 * @param {number} lat1 - latitude النقطة الأولى
 * @param {number} lng1 - longitude النقطة الأولى
 * @param {number} lat2 - latitude النقطة الثانية
 * @param {number} lng2 - longitude النقطة الثانية
 * @returns {number} المسافة بالكيلومتر
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // نصف قطر الأرض بالكيلومتر
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return parseFloat(distance.toFixed(2)); // تقريب إلى منزلتين عشريتين
};

/**
 * جلب الموقع من الـ cache أو حسابه مباشرة
 * @param {string} address - العنوان
 * @returns {Promise<{lat, lng} | null>}
 */
const getPositionForAddress = async (address) => {
  // إذا كان العنوان فارغ، لا تحسب
  if (!address) {
    return null;
  }

  // حاول حساب الموقع
  return await geocodeAddress(address);
};

module.exports = {
  geocodeAddress,
  calculateDistance,
  getPositionForAddress
};
