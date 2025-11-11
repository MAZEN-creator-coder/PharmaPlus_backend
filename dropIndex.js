const mongoose = require('mongoose');

async function dropIndex() {
  try {
    // اتصل بـ MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmacyBase', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // احصل على الـ collection
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // حذف الـ index
    await usersCollection.dropIndex('id_1');
    console.log('✅ Index "id_1" deleted successfully!');

    // أعرض الـ indexes المتبقية
    const indexes = await usersCollection.getIndexes();
    console.log('📋 Remaining indexes:', indexes);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

dropIndex();
