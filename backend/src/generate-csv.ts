import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/feedback_system';

async function generateCsv() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db!;
    
    // Get a section
    const section = await db.collection('sections').findOne({});
    // Get a semester
    const semester = await db.collection('semesters').findOne({});

    if (!section || !semester) {
      console.log('Could not find a section or semester in the database. Creating dummy IDs.');
    }

    const sectionId = section ? section._id.toString() : new mongoose.Types.ObjectId().toString();
    const semesterId = semester ? semester._id.toString() : new mongoose.Types.ObjectId().toString();

    const rand = Math.floor(1000 + Math.random() * 9000);
    const getCnic = (suffix: number) => {
      const middle = Math.floor(1000000 + Math.random() * 9000000);
      return `12345-${middle}-${suffix}`;
    };
    const getPhone = () => `0300-${Math.floor(1000000 + Math.random() * 9000000)}`;

    const csvContent = `name,username,password,sectionId,semesterId,email,cnic,phone
Alice Smith,alice.smith.${rand},Pass1234!,${sectionId},${semesterId},alice.smith.${rand}@example.com,${getCnic(1)},${getPhone()}
Bob Jones,bob.jones.${rand},Pass1234!,${sectionId},${semesterId},bob.jones.${rand}@example.com,${getCnic(2)},${getPhone()}
Charlie Brown,charlie.brown.${rand},Pass1234!,${sectionId},${semesterId},charlie.brown.${rand}@example.com,${getCnic(3)},${getPhone()}`;

    const filePath = path.join(__dirname, '../../test_students.csv');
    fs.writeFileSync(filePath, csvContent);
    console.log('CSV file created successfully at:', filePath);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

generateCsv();
