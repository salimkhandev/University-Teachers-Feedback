import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from './models/User';
import { hashPassword } from './utils/hash';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const resetAllPasswords = async () => {
  try {
    const uri = process.env.MONGO_URI || '';
    if (!uri) {
      throw new Error('MONGO_URI not found in .env');
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected');

    const newPassword = '992211sa';
    console.log(`\n🔑 Resetting all passwords to: ${newPassword}`);

    const users = await User.find();
    console.log(`📊 Found ${users.length} users`);

    let updatedCount = 0;
    for (const user of users) {
      const hashedPassword = await hashPassword(newPassword);
      user.password = hashedPassword;
      await user.save();
      console.log(`✅ Updated password for: ${user.username} (${user.role})`);
      updatedCount++;
    }

    console.log(`\n✅ Successfully reset ${updatedCount} user passwords`);
    console.log(`🔑 New password for all users: ${newPassword}`);
    console.log(`\n📝 You can now login with any username using password: ${newPassword}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
};

resetAllPasswords();
