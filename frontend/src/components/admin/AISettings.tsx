import { useEffect, useState } from 'react';
import client from '../../api/client';

type ModelOption = 'gemini-2.5-flash' | 'gemini-2.5-flash-lite';

interface KeyItem {
  id: string;
  label: string;
  maskedKey: string;
  isActive: boolean;
  lastUsedAt: string | null;
  lastFailedAt: string | null;
  lastError: string;
}

export default function AISettings() {
  const [loading, setLoading] = useState(true);
  const [savingModel, setSavingModel] = useState(false);
  const [addingKey, setAddingKey] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [selectedModel, setSelectedModel] = useState<ModelOption>('gemini-2.5-flash-lite');
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
  ]);
  const [keys, setKeys] = useState<KeyItem[]>([]);

  const [newLabel, setNewLabel] = useState('');
  const [newApiKey, setNewApiKey] = useState('');

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await client.get('/admin/ai/settings');
      setSelectedModel(data.selectedModel);
      setAvailableModels(data.availableModels || ['gemini-2.5-flash-lite', 'gemini-2.5-flash']);
      setKeys(data.keys || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load AI settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const saveModel = async (model: ModelOption) => {
    setSavingModel(true);
    setError('');
    setMessage('');
    try {
      await client.patch('/admin/ai/settings/model', { model });
      setMessage('Model updated.');
      setSelectedModel(model);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update model.');
    } finally {
      setSavingModel(false);
    }
  };

  const addKey = async () => {
    if (!newLabel.trim() || !newApiKey.trim()) return;
    setAddingKey(true);
    setError('');
    setMessage('');
    try {
      await client.post('/admin/ai/settings/keys', { label: newLabel.trim(), apiKey: newApiKey.trim() });
      setNewLabel('');
      setNewApiKey('');
      setMessage('API key added.');
      await loadSettings();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add API key.');
    } finally {
      setAddingKey(false);
    }
  };

  const toggleKey = async (keyId: string) => {
    try {
      await client.patch(`/admin/ai/settings/keys/${keyId}/toggle`);
      await loadSettings();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to toggle key.');
    }
  };

  const renewKey = async (keyId: string, currentLabel: string) => {
    const newKey = window.prompt(`Enter renewed API key for "${currentLabel}"`);
    if (!newKey || !newKey.trim()) return;

    const newLabelValue = window.prompt('Optional: update label (leave blank to keep current)', currentLabel);
    try {
      await client.put(`/admin/ai/settings/keys/${keyId}`, {
        apiKey: newKey.trim(),
        label: (newLabelValue || '').trim() || currentLabel,
        isActive: true,
      });
      setMessage('Key renewed.');
      await loadSettings();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to renew key.');
    }
  };

  const deleteKey = async (keyId: string, label: string) => {
    if (!window.confirm(`Delete API key "${label}"?`)) return;
    try {
      await client.delete(`/admin/ai/settings/keys/${keyId}`);
      setMessage('Key deleted.');
      await loadSettings();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete key.');
    }
  };

  return (
    <div className="card space-y-5">
      <div>
        <h3 className="font-semibold text-primary text-sm sm:text-base">AI Settings</h3>
        <p className="text-secondary text-xs mt-1">
          Manage Gemini models and API keys used by admin/teacher conversations.
        </p>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}
      {message && <p className="text-emerald-400 text-xs">{message}</p>}

      {loading ? (
        <p className="text-secondary text-sm">Loading AI settings...</p>
      ) : (
        <>
          <div className="rounded-lg border border-base p-4 bg-gray-500/5">
            <label className="block text-xs text-secondary mb-2">Conversation model</label>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as ModelOption)}
                className="input max-w-sm"
              >
                {availableModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <button
                className="btn-primary text-sm px-4 py-2 w-full sm:w-auto"
                disabled={savingModel}
                onClick={() => saveModel(selectedModel)}
              >
                {savingModel ? 'Saving...' : 'Save Model'}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-base p-4 bg-gray-500/5">
            <h4 className="text-sm text-primary font-medium mb-3">Add API key</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Key label (e.g. Primary key)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="input"
              />
              <input
                type="password"
                placeholder="AIza..."
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                className="input md:col-span-2"
              />
            </div>
            <button
              onClick={addKey}
              disabled={addingKey || !newLabel.trim() || !newApiKey.trim()}
              className="btn-primary text-sm px-4 py-2 mt-3 w-full sm:w-auto"
            >
              {addingKey ? 'Adding...' : 'Add Key'}
            </button>
          </div>

          <div className="rounded-lg border border-base p-4 bg-gray-500/5">
            <h4 className="text-sm text-primary font-medium mb-3">Configured keys</h4>
            {keys.length === 0 ? (
              <p className="text-xs text-secondary">No stored keys yet. You can still use `.env` key as fallback.</p>
            ) : (
              <div className="space-y-3">
                {keys.map((key) => (
                  <div key={key.id} className="border border-base rounded-lg p-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="text-sm text-primary font-medium">{key.label}</p>
                        <p className="text-xs text-secondary">{key.maskedKey}</p>
                        <p className="text-xs text-secondary mt-1">
                          {key.isActive ? 'Active' : 'Inactive'}
                          {key.lastUsedAt ? ` • Last used: ${new Date(key.lastUsedAt).toLocaleString()}` : ''}
                        </p>
                        {key.lastError && (
                          <p className="text-xs text-red-400 mt-1">Last error: {key.lastError}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => toggleKey(key.id)}>
                          {key.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => renewKey(key.id, key.label)}>
                          Renew Key
                        </button>
                        <button className="text-xs px-3 py-1.5 rounded bg-red-500/15 text-red-400 hover:bg-red-500/25" onClick={() => deleteKey(key.id, key.label)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
