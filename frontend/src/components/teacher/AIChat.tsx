import { useEffect, useState, useRef } from 'react';
import client from '../../api/client';
import FormattedMessage from '../common/FormattedMessage';

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
    setMessages(prev => [
      ...prev,
      { role: 'user', content: msg },
      { role: 'model', content: '' }
    ]);
    setInput('');
    setLoading(true); setError('');

    try {
      const apiBase = client.defaults.baseURL || '/api';
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${apiBase}/teacher/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: msg }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed with status ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          
          let parsed;
          try {
            parsed = JSON.parse(trimmed.slice(6));
          } catch (e) {
            console.error('Failed to parse SSE line:', trimmed, e);
            continue;
          }

          if (parsed.error) {
            throw new Error(parsed.error);
          }

          if (parsed.chunk) {
            setMessages(prev => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === 'model') {
                last.content += parsed.chunk;
              }
              return updated;
            });
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get response');
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'model' && last.content === '') {
          return updated.slice(0, -1);
        }
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card flex flex-col w-full h-[68vh] min-h-[380px] sm:h-[70vh] sm:min-h-[420px] lg:h-[72vh] lg:max-h-[680px]">
      <h3 className="font-semibold text-primary mb-2 sm:mb-3 text-sm sm:text-base shrink-0">Chat with AI</h3>

      <div className="flex-1 overflow-y-auto space-y-2.5 sm:space-y-3 pr-1 mb-2 sm:mb-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-center text-secondary text-xs sm:text-sm py-5 sm:py-6 px-2">
            Ask the AI about your student feedback, ratings, or teaching tips.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[92%] sm:max-w-[85%] md:max-w-[80%] px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed break-words shadow-sm transition-colors ${
              m.role === 'user'
                ? 'bg-indigo-600 text-white rounded-tr-sm'
                : 'bg-gray-500/10 text-primary border border-base rounded-tl-sm'
            }`}>
              {m.role === 'model' ? <FormattedMessage content={m.content} /> : m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-500/10 px-3 py-2.5 sm:px-4 sm:py-3 rounded-2xl border border-base rounded-tl-sm">
              <span className="flex gap-1 items-center">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 bg-gray-500/40 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-red-400 text-xs mb-2 shrink-0">{error}</p>}

      <div className="flex items-center gap-2 shrink-0 pt-1">
        <input id="chat-input" type="text" value={input} disabled={loading}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask something..."
          className="input flex-1 text-xs sm:text-sm min-h-[42px] sm:min-h-[44px]" />
        <button id="chat-send-btn" onClick={send}
          disabled={loading || !input.trim()}
          className="btn-primary h-[42px] sm:h-[44px] px-3 sm:px-4 shrink-0 text-sm">➤</button>
      </div>
    </div>
  );
}
