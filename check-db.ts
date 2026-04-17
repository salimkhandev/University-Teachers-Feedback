import mongoose from 'mongoose';
import Student from './backend/src/models/Student';
import TeacherAssignment from './backend/src/models/TeacherAssignment';
import Feedback from './backend/src/models/Feedback';

async function checkDb() {
  await mongoose.connect('mongodb://localhost:27017/university-teachers-feedback');
  
  const students = await Student.find().populate('userId sectionId semesterId').lean();
  console.log("Students:");
  console.dir(students, { depth: null });

  const assignments = await TeacherAssignment.find().lean();
  console.log("Assignments:", assignments);

  const feedbacks = await Feedback.find().lean();
  console.log("Feedbacks:", feedbacks);

  console.log("Done");
  process.exit(0);
}

checkDb().catch(console.error);
