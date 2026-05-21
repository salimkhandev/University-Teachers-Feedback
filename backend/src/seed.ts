import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../src/models/User';
import { hashPassword } from '../src/utils/hash';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const seedDatabase = async () => {
  try {
    const uri = process.env.MONGO_URI || '';
    if (!uri) {
      throw new Error('MONGO_URI not found in .env');
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(uri);

    console.log('🌱 Starting database seed...');

    // Default users to create
    const defaultUsers = [
      {
        username: 'admin',
        password: 'admin123',
        role: 'admin' as const,
        name: 'System Administrator',
        email: 'admin@university.edu'
      },
      {
        username: 'teacher1',
        password: 'teacher123',
        role: 'teacher' as const,
        name: 'Dr. John Smith',
        email: 'john.smith@university.edu'
      },
      {
        username: 'teacher2',
        password: 'teacher123',
        role: 'teacher' as const,
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@university.edu'
      },
      {
        username: 'student1',
        password: 'student123',
        role: 'student' as const,
        name: 'Alice Williams',
        email: 'alice.williams@student.university.edu'
      },
      {
        username: 'student2',
        password: 'student123',
        role: 'student' as const,
        name: 'Bob Brown',
        email: 'bob.brown@student.university.edu'
      }
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (const user of defaultUsers) {
      const existing = await User.findOne({ username: user.username });
      
      if (existing) {
        console.log(`⏭️  Skipping ${user.role} '${user.username}' - already exists`);
        skippedCount++;
      } else {
        const hashedPassword = await hashPassword(user.password);
        await User.create({
          ...user,
          password: hashedPassword
        });
        console.log(`✅ Created ${user.role} '${user.username}'`);
        createdCount++;
      }
    }

    console.log(`\n📊 Seed complete: ${createdCount} users created, ${skippedCount} skipped`);
    
    if (createdCount > 0) {
      console.log('\n🔑 Default credentials:');
      console.log('  Admin: admin / admin123');
      console.log('  Teacher: teacher1 / teacher123');
      console.log('  Teacher: teacher2 / teacher123');
      console.log('  Student: student1 / student123');
      console.log('  Student: student2 / student123');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to seed database:', err);
    process.exit(1);
  }
};

// Run seed if called directly, export function if imported
if (require.main === module) {
  seedDatabase();
}

export { seedDatabase };
