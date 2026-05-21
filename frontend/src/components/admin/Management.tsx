import { useState, useEffect } from 'react';
import client from '../../api/client';
import UserModal from './UserModal';

export default function Management() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<'teacher' | 'student'>('student');
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [depts, setDepts] = useState<any[]>([]);
  const [sems, setSems] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedSem, setSelectedSem] = useState('');

  useEffect(() => {
    loadDepts();
  }, []);

  useEffect(() => {
    if (selectedDept) {
      loadSemesters(selectedDept);
    } else {
      setSems([]);
      setSelectedSem('');
    }
  }, [selectedDept]);

  useEffect(() => {
    loadUsers();
  }, [roleFilter, selectedSem]);

  const loadDepts = async () => {
    try {
      const res = await client.get('/setup/departments');
      setDepts(res.data);
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  };

  const loadSemesters = async (deptId: string) => {
    try {
      const res = await client.get(`/setup/semesters?departmentId=${deptId}`);
      const sortedSems = res.data.sort((a: any, b: any) => (a.number || 0) - (b.number || 0));
      setSems(sortedSems);
    } catch (err) {
      console.error('Failed to load semesters', err);
    }
  };

  const loadUsers = async () => {
    if (roleFilter === 'student' && !selectedSem) {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const url = roleFilter === 'student' 
        ? `/admin/users?role=student&semesterId=${selectedSem}&limit=50`
        : `/admin/users?role=teacher`;
      const res = await client.get(url);
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users;

  return (
    <div className="card h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="font-semibold text-primary">System Management</h3>
          <p className="text-xs text-secondary">Manage teacher and student accounts</p>
        </div>
        
        <div className="flex items-center gap-2">
          {roleFilter === 'student' && (
            <>
              <select 
                className="bg-[var(--input-bg)] text-primary border border-base rounded-lg text-xs py-1.5 px-3 min-w-[140px] focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value);
                  setSelectedSem('');
                }}
              >
                <option value="" className="bg-[var(--bg-card)]">Select Dept</option>
                {depts.map(d => <option key={d._id} value={d._id} className="bg-[var(--bg-card)]">{d.name}</option>)}
              </select>

              {selectedDept && (
                <select 
                  className="bg-[var(--input-bg)] text-primary border border-base rounded-lg text-xs py-1.5 px-3 min-w-[140px] focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  value={selectedSem}
                  onChange={(e) => setSelectedSem(e.target.value)}
                >
                  <option value="" className="bg-[var(--bg-card)]">Select Semester</option>
                  {sems.map(s => <option key={s._id} value={s._id} className="bg-[var(--bg-card)]">{s.label || `Semester ${s.number}`}</option>)}
                </select>
              )}
            </>
          )}

          <div className="flex bg-gray-500/5 rounded p-1 border border-base ml-2">
            <button 
              className={`px-4 py-1.5 text-xs font-medium rounded transition-colors ${roleFilter === 'student' ? 'bg-indigo-600 text-white' : 'text-secondary hover:text-primary'}`}
              onClick={() => setRoleFilter('student')}
            >
              Students
            </button>
            <button 
              className={`px-4 py-1.5 text-xs font-medium rounded transition-colors ${roleFilter === 'teacher' ? 'bg-indigo-600 text-white' : 'text-secondary hover:text-primary'}`}
              onClick={() => setRoleFilter('teacher')}
            >
              Teachers
            </button>
          </div>
        </div>
      </div>

      <div className="table-wrap flex-1 hidden md:block">
        <table className="w-full text-sm placeholder-table min-w-[640px]">
          <thead>
            <tr className="border-b border-base text-left">
              <th className="pb-3 text-secondary font-medium pl-4">Name</th>
              <th className="pb-3 text-secondary font-medium">Username</th>
              <th className="pb-3 text-secondary font-medium">Email</th>
              {roleFilter === 'student' && <th className="pb-3 text-secondary font-medium">Roll Number</th>}
              <th className="pb-3 text-secondary font-medium text-right pr-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y border-base">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-secondary">Loading accounts...</td>
              </tr>
            ) : roleFilter === 'student' && !selectedSem ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-secondary">Please select a department and semester to view students.</td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <p className="text-secondary">No {roleFilter}s found.</p>
                  {roleFilter === 'student' && <p className="text-xs text-secondary/60 mt-1">Showing up to 50 students per semester.</p>}
                </td>
              </tr>
            ) : (
              filteredUsers.map((u, idx) => (
                <tr key={u._id || idx} className="hover:bg-gray-500/5 group transition-colors">
                  <td className="py-3 pl-4">
                    <span className="font-medium text-primary">{u.name}</span>
                  </td>
                  <td className="py-3 text-secondary">@{u.username}</td>
                  <td className="py-3 text-secondary">{u.email || <span className="text-secondary italic">No email</span>}</td>
                  {roleFilter === 'student' && (
                    <td className="py-3 text-secondary">
                      {u.rollNumber || <span className="text-secondary italic">N/A</span>}
                    </td>
                  )}
                  <td className="py-3 text-right pr-4">
                    <button 
                      onClick={() => setEditingUser(u)}
                      className="text-xs text-brand-400 hover:text-brand-300 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 font-medium"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3 flex-1">
        {loading ? (
          <div className="py-8 text-center text-secondary">Loading accounts...</div>
        ) : roleFilter === 'student' && !selectedSem ? (
          <div className="py-8 text-center text-secondary">Please select a department and semester to view students.</div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-8 text-center text-secondary text-sm">
            <p>No {roleFilter}s found.</p>
            {roleFilter === 'student' && <p className="text-[10px] opacity-60 mt-1">Showing up to 50 students per semester.</p>}
          </div>
        ) : (
          filteredUsers.map((u, idx) => (
            <div key={u._id || idx} className="rounded-lg border border-base bg-gray-500/5 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-primary">{u.name}</p>
                  <p className="text-xs text-secondary">@{u.username}</p>
                </div>
                <button
                  onClick={() => setEditingUser(u)}
                  className="text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium"
                >
                  Edit
                </button>
              </div>
              <p className="mt-2 text-xs text-secondary break-all">{u.email || 'No email'}</p>
              {roleFilter === 'student' && (
                <p className="mt-1 text-xs text-secondary">
                  Roll Number: <span className="text-primary font-medium">{u.rollNumber || 'N/A'}</span>
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {editingUser && (
        <UserModal 
          user={editingUser} 
          onClose={() => setEditingUser(null)} 
          onSave={() => {
            setEditingUser(null);
            loadUsers();
          }} 
        />
      )}
    </div>
  );
}
