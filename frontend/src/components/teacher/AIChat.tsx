import { useEffect, useState, useRef } from 'react';
import client from '../../api/client';

interface Message { role: 'user' | 'model'; content: string }

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    client.get('/teacher/chat').then(({ data }) => setMessages(data.messages ?? []));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setInput('');
    setLoading(true); setError('');
    try {
      const { data } = await client.post('/teacher/chat', { message: msg });
      setMessages(prev => [...prev, { role: 'model', content: data.reply }]);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to get response');
    } finally { setLoading(false); }
  };

  return (
    <div className="card flex flex-col" style={{ height: 'min(520px, 75vh)' }}>
      <h3 className="font-semibold text-white mb-3 text-sm sm:text-base shrink-0">Chat with AI</h3>

      <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 mb-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-center text-gray-500 text-xs sm:text-sm py-6">
            Ask the AI about your student feedback, ratings, or teaching tips.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-brand-600 text-white rounded-tr-sm'
                : 'bg-gray-800 text-gray-200 rounded-tl-sm'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 px-4 py-3 rounded-2xl rounded-tl-sm">
              <span className="flex gap-1 items-center">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-red-400 text-xs mb-2 shrink-0">{error}</p>}

      <div className="flex gap-2 shrink-0">
        <input id="chat-input" type="text" value={input} disabled={loading}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask something..."
          className="input flex-1 text-xs sm:text-sm" />
        <button id="chat-send-btn" onClick={send}
          disabled={loading || !input.trim()}
          className="btn-primary px-3 sm:px-4 shrink-0">➤</button>
      </div>
    </div>
  );
}
