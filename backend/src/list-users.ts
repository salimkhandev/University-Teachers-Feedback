import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from './models/User';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const listUsers = async () => {
  try {
    const uri = process.env.MONGO_URI || '';
    if (!uri) {
      throw new Error('MONGO_URI not found in .env');
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected');

    console.log('\n📋 All Users in Database:\n');
    const users = await User.find().lean();
    
    if (users.length === 0) {
      console.log('No users found in database');
    } else {
      console.log('Username'.padEnd(20) + 'Role'.padEnd(15) + 'Name');
      console.log('─'.repeat(50));
      users.forEach(user => {
        console.log(
          user.username.padEnd(20) + 
          user.role.padEnd(15) + 
          user.name
        );
      });
      console.log('\n📝 Note: You need to know the passwords for these users.');
      console.log('💡 If you don\'t know the password, you can reset it using a script.');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
};

listUsers();
