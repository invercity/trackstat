const mongoose = require('mongoose');

const uri = process.env.MONGO_URI || process.argv[2];
if (!uri) {
  console.error('Будь ласка, вкажіть рядок підключення:');
  console.error('node scripts/check-mongo.js "<MONGO_URI>"');
  process.exit(1);
}

const sanitized = uri.replace(/:([^@]+)@/, ':***@');
console.log(`🔍 Перевірка підключення до: ${sanitized} ...`);

async function test() {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log('✅ Успішне підключення до кластера!');
    console.log(`📂 База даних: "${mongoose.connection.name}"`);
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    if (collections.length === 0) {
      console.log('⚠️ База даних порожня (колекцій ще немає).');
    } else {
      console.log('📊 Знайдені колекції та кількість записів:');
      for (const col of collections) {
        const count = await mongoose.connection.db.collection(col.name).countDocuments();
        console.log(`   • ${col.name}: ${count} записів`);
      }
    }
    await mongoose.disconnect();
    console.log('🎉 Цей рядок MONGO_URI повністю працездатний!');
  } catch (err) {
    console.error('\n❌ Помилка підключення:');
    console.error(err.message);
    if (err.message.includes('bad auth')) {
      console.error('\n👉 Причина: Неправильний логін або пароль користувача бази даних в Atlas.');
    } else if (err.message.includes('whitelist') || err.message.includes('selection timed out')) {
      console.error('\n👉 Причина: Кластер Atlas не відповідає (перевірте Network Access або правильність імені кластера).');
    }
    process.exit(1);
  }
}

test();
