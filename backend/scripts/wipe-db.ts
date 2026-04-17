import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load the environment variables from the .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const wipeDatabase = async () => {
  try {
    const uri = process.env.MONGO_URI || '';
    if (!uri) {
      throw new Error("MONGO_URI not found in .env");
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(uri);

    console.log('🗑️  Dropping the entire database...');
    // This perfectly clears EVERYTHING: users, feedback, departments, sections, sessions, etc.
    await mongoose.connection.db!.dropDatabase();

    console.log('✅ Database completely wiped clean! You have a perfectly fresh slate.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to wipe database:', err);
    process.exit(1);
  }
};

wipeDatabase();
