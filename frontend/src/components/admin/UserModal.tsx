import { useState } from 'react';
import client from '../../api/client';

export default function UserModal({ user, onClose, onSave }: { user: any, onClose: () => void, onSave: () => void }) {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email || '',
    username: user.username,
    rollNumber: user.rollNumber || '',
  });
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await client.put(`/admin/users/${user._id}`, formData);
      if (password) {
        await client.put(`/admin/users/${user._id}/password`, { password });
      }
      onSave();
    } catch (err) {
      console.error('Failed to update user', err);
      alert('Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) return;
    try {
      await client.delete(`/admin/users/${user._id}`);
      onSave();
    } catch (err) {
      console.error('Failed to delete user', err);
      alert('Failed to delete user');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="card w-full max-w-md overflow-hidden p-0">
        <div className="p-4 border-b border-base flex justify-between items-center bg-gray-500/5">
          <h3 className="font-semibold text-primary">Edit {user.role === 'student' ? 'Student' : 'Teacher'}</h3>
          <button onClick={onClose} className="text-secondary hover:text-primary transition-colors text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5 uppercase tracking-wider">Name</label>
            <input type="text" className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5 uppercase tracking-wider">Username</label>
            <input type="text" className="input" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5 uppercase tracking-wider">Email</label>
            <input type="email" className="input" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          </div>
          {user.role === 'student' && (
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5 uppercase tracking-wider">Roll Number</label>
              <input type="text" className="input" value={formData.rollNumber} onChange={e => setFormData({ ...formData, rollNumber: e.target.value })} />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5 uppercase tracking-wider">New Password (optional)</label>
            <input type="password" placeholder="••••••••" className="input" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          
          <div className="pt-6 border-t border-base flex justify-between items-center mt-6">
            <button type="button" onClick={handleDelete} className="text-xs text-red-500 hover:text-red-400 font-semibold transition-colors">Delete Account</button>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="btn-secondary px-6">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 min-w-[120px]">{loading ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
