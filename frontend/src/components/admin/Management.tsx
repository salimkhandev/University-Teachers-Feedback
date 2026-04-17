import { useState, useEffect } from 'react';
import client from '../../api/client';
import UserModal from './UserModal';

export default function Management() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<'teacher' | 'student'>('student');
  const [editingUser, setEditingUser] = useState<any | null>(null);

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await client.get(`/admin/users?role=${roleFilter}`);
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
        
        <div className="flex bg-gray-500/5 rounded p-1 border border-base">
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
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-secondary">No {roleFilter}s found.</td>
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
        ) : filteredUsers.length === 0 ? (
          <div className="py-8 text-center text-secondary">No {roleFilter}s found.</div>
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
