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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
          <h3 className="font-semibold text-white">Edit {user.role === 'student' ? 'Student' : 'Teacher'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Name</label>
            <input type="text" className="input-field w-full bg-gray-800 text-gray-100 placeholder:text-gray-500 border-gray-700 focus:border-brand-500" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Username</label>
            <input type="text" className="input-field w-full bg-gray-800 text-gray-100 placeholder:text-gray-500 border-gray-700 focus:border-brand-500" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
            <input type="email" className="input-field w-full bg-gray-800 text-gray-100 placeholder:text-gray-500 border-gray-700 focus:border-brand-500" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          </div>
          {user.role === 'student' && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Roll Number</label>
              <input type="text" className="input-field w-full bg-gray-800 text-gray-100 placeholder:text-gray-500 border-gray-700 focus:border-brand-500" value={formData.rollNumber} onChange={e => setFormData({ ...formData, rollNumber: e.target.value })} />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">New Password (leave blank to keep current)</label>
            <input type="password" className="input-field w-full bg-gray-800 text-gray-100 placeholder:text-gray-500 border-gray-700 focus:border-brand-500" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          
          <div className="pt-4 border-t border-gray-800 flex justify-between items-center">
            <button type="button" onClick={handleDelete} className="text-xs text-red-500 hover:text-red-400 font-medium">Delete Account</button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary text-sm">{loading ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
