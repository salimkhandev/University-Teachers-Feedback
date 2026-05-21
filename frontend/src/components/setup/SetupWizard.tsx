import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import ThemeToggle from '../common/ThemeToggle';

/**
 * Multi-step setup wizard: Dept → Semester → Section → Subject → Teacher → Assignment → Student → CSV
 * Each step posts to the relevant /api/setup endpoint.
 */

type Step = 'dept' | 'semester' | 'section' | 'subject' | 'teacher' | 'assignment' | 'student' | 'csv';

const STEPS: { key: Step; label: string }[] = [
  { key: 'dept',       label: 'Department'  },
  { key: 'semester',   label: 'Semester'    },
  { key: 'section',    label: 'Section'     },
  { key: 'subject',    label: 'Subject'     },
  { key: 'teacher',    label: 'Teacher'     },
  { key: 'assignment', label: 'Assignment'  },
  { key: 'student',    label: 'Student'     },
  { key: 'csv',        label: 'Bulk CSV'    },
];

function Field({ label, id, type = 'text', value, onChange, disabled = false, placeholder = '' }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-secondary mb-1.5">{label}</label>
      <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)}
        disabled={disabled} placeholder={placeholder} className="input" />
    </div>
  );
}

function SelectField({ label, id, value, onChange, options }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-secondary mb-1.5">{label}</label>
      <select id={id} value={value} onChange={e => onChange(e.target.value)}
        className="input">
        <option value="">— Select —</option>
        {options.map((o: any) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export default function SetupWizard() {
  const [step,    setStep]    = useState<Step>('dept');
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Dropdown data
  const [depts,    setDepts]    = useState<any[]>([]);
  const [semesters,setSemesters]= useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  // Form fields
  const [f, setF] = useState<Record<string, string>>({});
  const set = (k: string) => (v: string) => setF(prev => ({ ...prev, [k]: v }));

  // Dynamic subjects input for bulk creation
  const [subjectInputs, setSubjectInputs] = useState<{name: string, code: string}[]>([{name: '', code: ''}]);

  // CSV
  const [csvFile,    setCsvFile]    = useState<File | null>(null);
  const [csvResult,  setCsvResult]  = useState<any>(null);

  const loadDepartments = async () => {
    const r = await client.get('/setup/departments').catch(() => null);
    if (r) setDepts(r.data ?? []);
  };

  // Load dropdown data
  useEffect(() => {
    loadDepartments();
    if (step === 'assignment') {
      loadTeachers();
    }
  }, [step]);

  const loadSemesters = async (deptId: string) => {
    const r = await client.get(`/setup/semesters?departmentId=${deptId}`).catch(() => null);
    const sems = r?.data ?? [];
    setSemesters(sems.sort((a: any, b: any) => (a.number || 0) - (b.number || 0)));
  };
  const loadSections = async (semId: string) => {
    const r = await client.get(`/setup/sections?semesterId=${semId}`).catch(() => null);
    setSections(r?.data ?? []);
  };
  const loadSubjects = async (secId: string) => {
    const r = await client.get(`/setup/subjects?sectionId=${secId}`).catch(() => null);
    setSubjects(r?.data ?? []);
  };
  const loadTeachers = async () => {
    const r = await client.get('/admin/teachers/rankings').catch(() => null);
    setTeachers(r?.data ?? []);
  };

  const submit = async (body: object, endpoint: string) => {
    setLoading(true); setMsg(null);
    try {
      const res = await client.post(endpoint, body);
      setMsg({ type: 'ok', text: res.data.message || 'Created successfully!' });
      // We don't wipe the entire form state here anymore so dropdowns stay selected
    } catch (err: any) {
      setMsg({ type: 'err', text: err.response?.data?.error ?? 'Error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const submitCsv = async () => {
    if (!csvFile) return;
    setLoading(true); setMsg(null); setCsvResult(null);
    const form = new FormData();
    form.append('file', csvFile);
    try {
      const { data } = await client.post('/setup/students/bulk-csv', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCsvResult(data);
      setMsg({ type: 'ok', text: `Inserted: ${data.inserted} | Conflicts: ${data.conflicts.length}` });
    } catch (err: any) {
      setMsg({ type: 'err', text: err.response?.data?.error ?? 'Upload failed' });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'dept':
        return (
          <div className="space-y-4">
            <Field label="Department Name" id="dept-name" value={f.name ?? ''} onChange={set('name')} placeholder="Computer Science" />
            <Field label="Code"            id="dept-code" value={f.code ?? ''} onChange={set('code')} placeholder="CS" />
            <button className="btn-primary" disabled={loading}
              onClick={() => submit({ name: f.name, code: f.code }, '/setup/departments').then(loadDepartments)}>
              {loading ? 'Creating...' : 'Create Department'}
            </button>
            {depts.length > 0 && (
              <div className="mt-4 p-4 rounded-xl border border-base bg-gray-500/5">
                <p className="text-xs font-semibold text-secondary mb-2 uppercase tracking-wide">Already Saved Departments:</p>
                <div className="flex flex-wrap gap-2">
                  {depts.map(d => <span key={d._id} className="px-2 py-1.5 bg-brand-500/10 text-brand-300 text-xs rounded-lg border border-brand-500/20 font-medium">{d.name} ({d.code})</span>)}
                </div>
              </div>
            )}
          </div>
        );
      case 'semester':
        return (
          <div className="space-y-4">
            <SelectField label="Department" id="sem-dept" value={f.departmentId ?? ''} onChange={(v: string) => { set('departmentId')(v); loadSemesters(v); }}
              options={depts.map((d: any) => ({ value: d._id, label: `${d.name} (${d.code})` }))} />
            <Field label="Total Semesters to Create" id="sem-num" type="number" value={f.number ?? ''} onChange={set('number')} placeholder="8" />
            <p className="text-xs text-gray-500">This will automatically generate all semesters from 1 up to the number provided.</p>
            <button className="btn-primary" disabled={loading}
              onClick={() => submit({ departmentId: f.departmentId, number: Number(f.number) }, '/setup/semesters').then(() => { if (f.departmentId) loadSemesters(f.departmentId); })}>
              {loading ? 'Creating...' : `Create ${f.number || 'N'} Semesters`}
            </button>
            {f.departmentId && semesters.length > 0 && (
              <div className="mt-4 p-4 rounded-xl border border-base bg-gray-500/5">
                <p className="text-xs font-semibold text-secondary mb-2 uppercase tracking-wide">Already Saved Semesters:</p>
                <div className="flex flex-wrap gap-2">
                  {semesters.map(s => <span key={s._id} className="px-2 py-1.5 bg-brand-500/10 text-brand-300 text-xs rounded-lg border border-brand-500/20 font-medium">{s.label ?? `Semester ${s.number}`}</span>)}
                </div>
              </div>
            )}
          </div>
        );
      case 'section':
        return (
          <div className="space-y-4">
            <SelectField label="Department" id="sec-dept" value={f.deptId ?? ''} onChange={(v: string) => { set('deptId')(v); loadSemesters(v); }}
              options={depts.map((d: any) => ({ value: d._id, label: d.name }))} />
            <SelectField label="Semester" id="sec-sem" value={f.semesterId ?? ''} onChange={(v: string) => { set('semesterId')(v); loadSections(v); }}
              options={semesters.map((s: any) => ({ value: s._id, label: s.label ?? `Semester ${s.number}` }))} />
            <Field label="Total Sections to Create" id="sec-count" type="number" value={f.count ?? ''} onChange={set('count')} placeholder="2" />
            <p className="text-xs text-gray-500">This will automatically generate sections named A, B, C... up to the number provided.</p>
            <button className="btn-primary" disabled={loading}
              onClick={() => submit({ semesterId: f.semesterId, count: Number(f.count) }, '/setup/sections').then(() => { if (f.semesterId) loadSections(f.semesterId); })}>
              {loading ? 'Creating...' : `Create ${f.count || 'N'} Sections`}
            </button>
            {f.semesterId && sections.length > 0 && (
              <div className="mt-4 p-4 rounded-xl border border-base bg-gray-500/5">
                <p className="text-xs font-semibold text-secondary mb-2 uppercase tracking-wide">Already Saved Sections:</p>
                <div className="flex flex-wrap gap-2">
                  {sections.map(s => <span key={s._id} className="px-2 py-1.5 bg-brand-500/10 text-brand-300 text-xs rounded-lg border border-brand-500/20 font-medium">Section {s.name}</span>)}
                </div>
              </div>
            )}
          </div>
        );
      case 'subject':
        return (
          <div className="space-y-4">
            <SelectField label="Department" id="subj-dept" value={f.deptId ?? ''} onChange={(v: string) => { set('deptId')(v); loadSemesters(v); }}
              options={depts.map((d: any) => ({ value: d._id, label: d.name }))} />
            <SelectField label="Semester" id="subj-sem" value={f.semId ?? ''} onChange={(v: string) => { set('semId')(v); loadSections(v); }}
              options={semesters.map((s: any) => ({ value: s._id, label: s.label ?? `Semester ${s.number}` }))} />
            <SelectField label="Section" id="subj-sec" value={f.sectionId ?? ''} onChange={(v: string) => { set('sectionId')(v); loadSubjects(v); }}
              options={sections.map((s: any) => ({ value: s._id, label: `Section ${s.name}` }))} />
            
            <div className="space-y-3">
              <label className="block text-sm font-medium text-secondary">Subjects</label>
              {subjectInputs.map((input, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-start">
                  <div className="flex-1">
                    <input className="input w-full" placeholder="Subject Name (e.g. Biology)" value={input.name} 
                      onChange={e => { const updated = [...subjectInputs]; updated[idx].name = e.target.value; setSubjectInputs(updated); }} />
                  </div>
                  <div className="w-full sm:w-1/3">
                    <input className="input w-full" placeholder="Code (e.g. BIO)" value={input.code} 
                      onChange={e => { const updated = [...subjectInputs]; updated[idx].code = e.target.value; setSubjectInputs(updated); }} />
                  </div>
                  {subjectInputs.length > 1 && (
                    <button className="p-2 text-red-500 hover:text-red-400 mt-0 sm:mt-1 self-end sm:self-auto" onClick={() => setSubjectInputs(subjectInputs.filter((_, i) => i !== idx))}>✕</button>
                  )}
                </div>
              ))}
              <div className="pt-2">
                <button className="text-sm font-medium text-brand-400 hover:text-brand-300 flex items-center gap-1"
                  onClick={() => setSubjectInputs([...subjectInputs, {name: '', code: ''}])}>
                  + Add another subject
                </button>
              </div>
            </div>

            <button className="btn-primary w-full mt-4" disabled={loading || subjectInputs.some(s => !s.name || !s.code)}
              onClick={() => submit({ sectionId: f.sectionId, subjects: subjectInputs }, '/setup/subjects').then(() => {
                if (f.sectionId) loadSubjects(f.sectionId);
                setSubjectInputs([{name: '', code: ''}]);
              })}>
              {loading ? 'Creating...' : `Create ${subjectInputs.length} Subject${subjectInputs.length > 1 ? 's' : ''}`}
            </button>
            {f.sectionId && subjects.length > 0 && (
              <div className="mt-4 p-4 rounded-xl border border-base bg-gray-500/5">
                <p className="text-xs font-semibold text-secondary mb-2 uppercase tracking-wide">Already Saved Subjects:</p>
                <div className="flex flex-wrap gap-2">
                  {subjects.map(s => <span key={s._id} className="px-2 py-1.5 bg-brand-500/10 text-brand-300 text-xs rounded-lg border border-brand-500/20 font-medium">{s.name} ({s.code})</span>)}
                </div>
              </div>
            )}
          </div>
        );
      case 'teacher':
        return (
          <div className="space-y-4">
            <Field label="Full Name" id="t-name"     value={f.name ?? ''}     onChange={set('name')}     placeholder="Dr. Jane Smith" />
            <Field label="Username"  id="t-username" value={f.username ?? ''} onChange={set('username')} placeholder="jane.smith" />
            <Field label="Password"  id="t-password" type="password" value={f.password ?? ''} onChange={set('password')} />
            <Field label="Email"     id="t-email"    value={f.email ?? ''}    onChange={set('email')}    placeholder="jane@uni.edu" />
            <button className="btn-primary" disabled={loading}
              onClick={() => submit({ name: f.name, username: f.username, password: f.password, email: f.email }, '/setup/teachers')}>
              {loading ? 'Creating...' : 'Create Teacher'}
            </button>
          </div>
        );
      case 'assignment':
        return (
          <div className="space-y-4">
            <SelectField label="Teacher"   id="a-teacher" value={f.teacherId ?? ''} onChange={set('teacherId')}
              options={teachers.map((t: any) => ({ value: t.teacherId, label: t.name }))} />
            <SelectField label="Department" id="a-dept" value={f.deptId ?? ''} onChange={(v: string) => { set('deptId')(v); loadSemesters(v); }}
              options={depts.map((d: any) => ({ value: d._id, label: d.name }))} />
            <SelectField label="Semester"  id="a-sem" value={f.semesterId ?? ''} onChange={(v: string) => { set('semesterId')(v); loadSections(v); }}
              options={semesters.map((s: any) => ({ value: s._id, label: s.label ?? `Semester ${s.number}` }))} />
            <SelectField label="Section"   id="a-sec" value={f.sectionId ?? ''} onChange={(v: string) => { set('sectionId')(v); loadSubjects(v); }}
              options={sections.map((s: any) => ({ value: s._id, label: s.name }))} />
            <SelectField label="Subject"   id="a-subj" value={f.subjectId ?? ''} onChange={set('subjectId')}
              options={subjects.map((s: any) => ({ value: s._id, label: s.name }))} />
            <button className="btn-primary" disabled={loading}
              onClick={() => submit({ teacherId: f.teacherId, subjectId: f.subjectId, sectionId: f.sectionId, semesterId: f.semesterId }, '/setup/assignments')}>
              {loading ? 'Creating...' : 'Create Assignment'}
            </button>
          </div>
        );
      case 'student':
        return (
          <div className="space-y-4">
            <Field label="Full Name" id="s-name"     value={f.name ?? ''}     onChange={set('name')} />
            <Field label="Username"  id="s-username" value={f.username ?? ''} onChange={set('username')} />
            <Field label="Password"  id="s-password" type="password" value={f.password ?? ''} onChange={set('password')} />
            <Field label="Email"     id="s-email"    type="email" value={f.email ?? ''} onChange={set('email')} />
            <SelectField label="Department" id="s-dept" value={f.deptId ?? ''} onChange={(v: string) => { set('deptId')(v); loadSemesters(v); }}
              options={depts.map((d: any) => ({ value: d._id, label: d.name }))} />
            <SelectField label="Semester"   id="s-sem" value={f.semesterId ?? ''} onChange={(v: string) => { set('semesterId')(v); loadSections(v); }}
              options={semesters.map((s: any) => ({ value: s._id, label: s.label ?? `Semester ${s.number}` }))} />
            <SelectField label="Section"    id="s-sec" value={f.sectionId ?? ''} onChange={set('sectionId')}
              options={sections.map((s: any) => ({ value: s._id, label: s.name }))} />
            <Field label="CNIC (optional)" id="s-cnic"  value={f.cnic ?? ''}  onChange={set('cnic')} />
            <Field label="Phone (optional)" id="s-phone" value={f.phone ?? ''} onChange={set('phone')} />
            <button className="btn-primary" disabled={loading}
              onClick={() => submit({ name: f.name, username: f.username, password: f.password, email: f.email, sectionId: f.sectionId, semesterId: f.semesterId, cnic: f.cnic, phone: f.phone }, '/setup/students')}>
              {loading ? 'Creating...' : 'Create Student'}
            </button>
          </div>
        );
      case 'csv':
        return (
          <div className="space-y-4">
            <p className="text-sm text-secondary">
              CSV columns: <code className="text-brand-600 dark:text-brand-400">name, username, password, sectionId, semesterId, email, cnic, phone</code>
            </p>
            <div className="border-2 border-dashed border-base rounded-xl p-6 text-center">
              <input id="csv-file-input" type="file" accept=".csv"
                onChange={e => setCsvFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-brand-600 file:text-white hover:file:bg-brand-700 cursor-pointer" />
              {csvFile && <p className="text-xs text-gray-500 mt-2">{csvFile.name}</p>}
            </div>
            <button id="upload-csv-btn" className="btn-primary" disabled={loading || !csvFile} onClick={submitCsv}>
              {loading ? 'Uploading...' : '⬆ Upload CSV'}
            </button>
            {csvResult && (
              <div className="mt-4">
                <p className="text-emerald-400 text-sm mb-2">✅ Inserted: {csvResult.inserted}</p>
                {csvResult.conflicts.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-base text-secondary">
                        <th className="pb-2 text-left">Row</th><th className="pb-2 text-left">Reason</th>
                      </tr></thead>
                      <tbody className="divide-y border-base">
                        {csvResult.conflicts.map((c: any, i: number) => (
                          <tr key={i}><td className="py-1.5 text-secondary">{c.row}</td><td className="py-1.5 text-red-500">{c.reason}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        );
    }
  };

  const currentIndex = STEPS.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-page px-3 py-4 sm:p-6 transition-colors duration-200">
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <Link to="/admin" className="inline-flex items-center gap-1.5 text-secondary hover:text-brand-500 transition-colors text-xs font-medium uppercase tracking-wider mb-2 group">
              <span className="group-hover:-translate-x-0.5 transition-transform">←</span>Go Back
            </Link>
            <h2 className="text-xl sm:text-2xl font-bold text-primary">System Setup</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-secondary bg-gray-500/10 px-2 py-1 rounded-md border border-base">
              Step {currentIndex + 1} of {STEPS.length}
            </span>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1.5 mb-5 sm:mb-6 overflow-x-auto pb-1 scrollbar-none">
          {STEPS.map((s, i) => (
            <button key={s.key} onClick={() => { setStep(s.key); setMsg(null); }}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
                s.key === step ? 'bg-indigo-600 text-white shadow-md' :
                i < currentIndex ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 
                'bg-gray-500/5 text-secondary border border-base'
              }`}>
              {i < currentIndex ? '✓ ' : ''}{s.label}
            </button>
          ))}
        </div>

        <div className="card">
          <h3 className="text-base sm:text-lg font-semibold text-primary mb-4 sm:mb-5">{STEPS[currentIndex].label}</h3>
          {msg && (
            <div className={`mb-4 text-sm px-4 py-3 rounded-xl ${
              msg.type === 'ok' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' :
                                  'bg-red-900/30 text-red-400 border border-red-800'
            }`}>{msg.text}</div>
          )}
          {renderStep()}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between mt-4">
          <button className="btn-secondary text-sm w-full sm:w-auto" disabled={currentIndex === 0}
            onClick={() => { setStep(STEPS[currentIndex - 1].key); setMsg(null); }}>← Back</button>
          <button className="btn-secondary text-sm w-full sm:w-auto" disabled={currentIndex === STEPS.length - 1}
            onClick={() => { setStep(STEPS[currentIndex + 1].key); setMsg(null); }}>Next →</button>
        </div>
      </div>
    </div>
  );
}
