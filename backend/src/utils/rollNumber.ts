import Student from '../models/Student';
import Section from '../models/Section';
import Semester from '../models/Semester';
import Department from '../models/Department';

export const generateRollNumber = async (sectionId: string): Promise<string> => {
  const section = await Section.findById(sectionId).lean();
  if (!section) throw new Error('Section not found');

  const semester = await Semester.findById(section.semesterId).lean();
  if (!semester) throw new Error('Semester not found');

  const department = await Department.findById(semester.departmentId).lean();
  if (!department) throw new Error('Department not found');

  const year = new Date().getFullYear().toString().slice(-2);
  const deptCode = department.code.toUpperCase();

  // Count existing students in this department to produce a sequential number
  const count = await Student.countDocuments({ semesterId: section.semesterId });
  const seq = String(count + 1).padStart(4, '0');

  return `${deptCode}-${year}-${seq}`;
};
