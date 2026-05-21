import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from './models/User';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const checkPasswords = async () => {
  try {
    const uri = process.env.MONGO_URI || '';
    if (!uri) {
      throw new Error('MONGO_URI not found in .env');
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected');

    console.log('\n📋 User Passwords Check:\n');
    const users = await User.find();
    
    console.log('Username'.padEnd(20) + 'Role'.padEnd(15) + 'Password Hash (first 50 chars)');
    console.log('─'.repeat(80));
    
    users.forEach(user => {
      const passwordHash = user.password;
      const isBcrypt = passwordHash.startsWith('$2a$') || passwordHash.startsWith('$2b$');
      const status = isBcrypt ? '✅ BCRYPT' : '❌ NOT BCRYPT';
      
      console.log(
        user.username.padEnd(20) + 
        user.role.padEnd(15) + 
        passwordHash.substring(0, 50) + '... ' + status
      );
    });

    console.log('\n📝 Summary:');
    console.log('✅ Bcrypt hashes start with $2a$ or $2b$');
    console.log('❌ Plain text passwords will show the actual password');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
};

checkPasswords();
