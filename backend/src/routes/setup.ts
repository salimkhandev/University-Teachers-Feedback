import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole }  from '../middleware/rbac';
import { upload }       from '../middleware/upload';
import Department       from '../models/Department';
import Semester         from '../models/Semester';
import Section          from '../models/Section';
import Subject          from '../models/Subject';
import User             from '../models/User';
import TeacherAssignment from '../models/TeacherAssignment';
import Student          from '../models/Student';
import { hashPassword } from '../utils/hash';
import { generateRollNumber } from '../utils/rollNumber';
import { parseCsvBuffer } from '../services/csv';

const router = Router();
// All setup routes require admin role
router.use(authenticate, requireRole('admin'));

// GET /api/setup/departments — list all for wizard dropdowns
router.get('/departments', async (req: Request, res: Response): Promise<void> => {
  try { 
    const depts = await Department.find().lean();
    console.log(`[GET /setup/departments] Found ${depts.length} departments.`);
    res.json(depts); 
  }
  catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

// GET /api/setup/semesters?departmentId=...
router.get('/semesters', async (req: Request, res: Response): Promise<void> => {
  try {
    const filter = req.query.departmentId ? { departmentId: String(req.query.departmentId) } : {};
    const semesters = await Semester.find(filter).lean();
    console.log(`[GET /setup/semesters] Query:`, filter, `=> Found ${semesters.length} semesters.`);
    res.json(semesters);
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

// GET /api/setup/sections?semesterId=...
router.get('/sections', async (req: Request, res: Response): Promise<void> => {
  try {
    const filter = req.query.semesterId ? { semesterId: String(req.query.semesterId) } : {};
    const sections = await Section.find(filter).lean();
    console.log(`[GET /setup/sections] Query:`, filter, `=> Found ${sections.length} sections.`);
    res.json(sections);
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

// GET /api/setup/subjects?sectionId=...
router.get('/subjects', async (req: Request, res: Response): Promise<void> => {
  try {
    const filter = req.query.sectionId ? { sectionId: String(req.query.sectionId) } : {};
    const subjects = await Subject.find(filter).lean();
    console.log(`[GET /setup/subjects] Query:`, filter, `=> Found ${subjects.length} subjects.`);
    res.json(subjects);
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

// POST /api/setup/departments
router.post('/departments', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, code } = req.body;
    if (!name || !code) { res.status(400).json({ error: 'name and code required' }); return; }
    const dept = await Department.create({ name, code });
    console.log(`[POST /setup/departments] Created department: ${dept.name} (${dept.code})`);
    res.status(201).json({ message: 'Department created successfully', department: dept });
  } catch (err: any) {
    if (err.code === 11000) { res.status(409).json({ error: 'Department code already exists' }); return; }
    console.error('[setup/departments]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/setup/semesters
router.post('/semesters', async (req: Request, res: Response): Promise<void> => {
  try {
    const { departmentId, number } = req.body;
    if (!departmentId || !number) { res.status(400).json({ error: 'departmentId and number required' }); return; }
    
    const count = parseInt(number, 10);
    const semestersToInsert = [];
    
    for (let i = 1; i <= count; i++) {
       const existing = await Semester.findOne({ departmentId, number: i });
       if (!existing) {
         semestersToInsert.push({ departmentId, number: i, label: `Semester ${i}` });
       }
    }
    
    if (semestersToInsert.length > 0) {
       await Semester.insertMany(semestersToInsert);
       console.log(`[POST /setup/semesters] Created ${semestersToInsert.length} semesters`);
    } else {
       console.log(`[POST /setup/semesters] No new semesters needed`);
    }
    
    res.status(201).json({ message: `Created ${semestersToInsert.length} distinct semesters for the department.` });
  } catch (err) {
    console.error('[setup/semesters]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/setup/sections
router.post('/sections', async (req: Request, res: Response): Promise<void> => {
  try {
    const { semesterId, count } = req.body;
    if (!semesterId || !count) { res.status(400).json({ error: 'semesterId and count required' }); return; }
    
    const num = parseInt(count, 10);
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const sectionsToInsert = [];
    
    for (let i = 0; i < num; i++) {
      const name = alphabet[i] || `Sec ${i+1}`;
      const existing = await Section.findOne({ semesterId, name });
      if (!existing) {
        sectionsToInsert.push({ semesterId, name });
      }
    }
    
    if (sectionsToInsert.length > 0) {
      await Section.insertMany(sectionsToInsert);
      console.log(`[POST /setup/sections] Created ${sectionsToInsert.length} sections`);
    } else {
      console.log(`[POST /setup/sections] No new sections needed`);
    }
    
    res.status(201).json({ message: `Created ${sectionsToInsert.length} sections for the semester.` });
  } catch (err) {
    console.error('[setup/sections]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/setup/subjects
router.post('/subjects', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sectionId, subjects } = req.body;
    if (!sectionId || !subjects || !Array.isArray(subjects)) { 
      res.status(400).json({ error: 'sectionId and subjects array required' }); 
      return; 
    }
    
    let inserted = 0;
    for (const sub of subjects) {
      if (!sub.name || !sub.code) continue;
      const existing = await Subject.findOne({ sectionId, code: sub.code });
      if (!existing) {
        await Subject.create({ sectionId, name: sub.name, code: sub.code });
        inserted++;
      }
    }
    
    console.log(`[POST /setup/subjects] Created ${inserted} subjects`);
    res.status(201).json({ message: `Successfully created ${inserted} subjects` });
  } catch (err) {
    console.error('[setup/subjects]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/setup/teachers
router.post('/teachers', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, username, password, email } = req.body;
    if (!name || !username || !password) { res.status(400).json({ error: 'name, username, password required' }); return; }
    const hashed = await hashPassword(password);
    const user   = await User.create({ name, username, password: hashed, role: 'teacher', email });
    res.status(201).json({ id: user._id, name: user.name, username: user.username });
  } catch (err: any) {
    if (err.code === 11000) { res.status(409).json({ error: 'Username already exists' }); return; }
    console.error('[setup/teachers]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/setup/assignments
router.post('/assignments', async (req: Request, res: Response): Promise<void> => {
  try {
    const { teacherId, subjectId, sectionId, semesterId } = req.body;
    if (!teacherId || !subjectId || !sectionId || !semesterId) {
      res.status(400).json({ error: 'teacherId, subjectId, sectionId, semesterId required' }); return;
    }
    const assignment = await TeacherAssignment.create({ teacherId, subjectId, sectionId, semesterId });
    res.status(201).json(assignment);
  } catch (err: any) {
    if (err.code === 11000) { res.status(409).json({ error: 'A teacher is already assigned to this subject in the selected section.' }); return; }
    console.error('[setup/assignments]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/setup/students (single)
router.post('/students', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, username, password, email, sectionId, semesterId, cnic, phone } = req.body;
    if (!name || !username || !password || !email || !sectionId || !semesterId) {
      res.status(400).json({ error: 'name, username, password, email, sectionId, semesterId required' }); return;
    }
    const hashed     = await hashPassword(password);
    const user       = await User.create({ name, username, password: hashed, email, role: 'student' });
    const rollNumber = await generateRollNumber(sectionId);
    const student    = await Student.create({ userId: user._id, sectionId, semesterId, rollNumber, cnic, phone });
    res.status(201).json({ student, user: { id: user._id, name, username, email } });
  } catch (err: any) {
    if (err.code === 11000) { res.status(409).json({ error: 'Username or CNIC already exists' }); return; }
    console.error('[setup/students]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/setup/students/bulk-csv
router.post('/students/bulk-csv', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ error: 'CSV file is required' }); return; }

    const rows = parseCsvBuffer(req.file.buffer);
    let inserted  = 0;
    const conflicts: { row: number; reason: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.name || !row.username || !row.password || !row.email || !row.sectionId || !row.semesterId) {
          conflicts.push({ row: i + 2, reason: 'Missing required fields (email is required)' });
          continue;
        }
        const hashed = await hashPassword(row.password);
        let username = row.username;
        let cnic = row.cnic;
        let email = row.email;
        let name = row.name;

        // Auto-resolve duplicate username by appending random suffix
        let existingUser = await User.findOne({ username });
        if (existingUser) {
          let uniqueUsername = username;
          let isUnique = false;
          while (!isUnique) {
            const suffix = Math.floor(100 + Math.random() * 900);
            uniqueUsername = `${row.username}.${suffix}`;
            const check = await User.findOne({ username: uniqueUsername });
            if (!check) isUnique = true;
          }
          username = uniqueUsername;
          
          const suffixParts = username.split('.');
          const suffix = suffixParts[suffixParts.length - 1];
          name = `${row.name} (${suffix})`;
          
          if (email) {
            const emailParts = email.split('@');
            if (emailParts.length === 2) {
              email = `${emailParts[0]}.${suffix}@${emailParts[1]}`;
            }
          }
        }

        // Auto-resolve duplicate CNIC by modifying middle digits
        if (cnic) {
          let existingCnic = await Student.findOne({ cnic });
          if (existingCnic) {
            let uniqueCnic = cnic;
            let isUnique = false;
            while (!isUnique) {
              const parts = cnic.split('-');
              if (parts.length === 3) {
                const middle = Math.floor(1000000 + Math.random() * 9000000);
                uniqueCnic = `${parts[0]}-${middle}-${parts[2]}`;
              } else {
                uniqueCnic = `${cnic}-${Math.floor(10 + Math.random() * 90)}`;
              }
              const check = await Student.findOne({ cnic: uniqueCnic });
              if (!check) isUnique = true;
            }
            cnic = uniqueCnic;
          }
        }

        // Create new records for the resolved student details
        const user = await User.create({ name, username, password: hashed, role: 'student', email });
        const rollNumber = await generateRollNumber(row.sectionId);
        await Student.create({ userId: user._id, sectionId: row.sectionId, semesterId: row.semesterId, rollNumber, cnic, phone: row.phone });
        inserted++;
      } catch (rowErr: any) {
        const reason = rowErr.code === 11000 ? 'Duplicate CNIC or username' : rowErr.message;
        conflicts.push({ row: i + 2, reason });
      }
    }

    res.json({ inserted, conflicts });
  } catch (err) {
    console.error('[setup/students/bulk-csv]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
