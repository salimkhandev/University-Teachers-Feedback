import React, { useState, useRef, useEffect } from 'react';
import client from '../../api/client';
import FormattedMessage from '../common/FormattedMessage';

interface Props { rankings: any[] }

const medals      = ['badge-gold', 'badge-silver', 'badge-bronze'];
const medalLabels = ['🥇', '🥈', '🥉'];

export default function TeacherRankingTable({ rankings }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [localSummaries, setLocalSummaries] = useState<Record<string, string>>({});
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  
  // Chat state
  const [chatInputs, setChatInputs] = useState<Record<string, string>>({});
  const [chatHistories, setChatHistories] = useState<Record<string, { role: string, content: string }[]>>({});
  const [backendHistories, setBackendHistories] = useState<Record<string, { role: string, content: string }[]>>({});
  const [chatLoading, setChatLoading] = useState<Record<string, boolean>>({});
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistories, chatLoading, expanded]);

  const handleGenerate = async (e: React.MouseEvent, teacherId: string) => {
    e.stopPropagation();
    setGeneratingId(teacherId);
    try {
      const res = await client.post(`/admin/report/generate/${teacherId}`);
      setLocalSummaries(prev => ({ ...prev, [teacherId]: res.data.summary }));
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Failed to generate report for this teacher.');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleChatSend = async (teacherId: string) => {
    const text = chatInputs[teacherId]?.trim();
    if (!text) return;

    // Reset input
    setChatInputs(prev => ({ ...prev, [teacherId]: '' }));
    
    // Add user message & empty model placeholder message
    setChatHistories(prev => {
      const h = prev[teacherId] || [];
      return {
        ...prev,
        [teacherId]: [
          ...h,
          { role: 'user', content: text },
          { role: 'model', content: '' }
        ]
      };
    });
    setChatLoading(prev => ({ ...prev, [teacherId]: true }));

    const historyToSend = backendHistories[teacherId] || chatHistories[teacherId] || [];
    let fullReply = '';
    let finalCompacted: { role: string; content: string }[] | null = null;

    try {
      const apiBase = client.defaults.baseURL || '/api';
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${apiBase}/admin/report/chat/${teacherId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          history: historyToSend
        }),
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
            fullReply += parsed.chunk;
            setChatHistories(prev => {
              const h = prev[teacherId] || [];
              const updated = [...h];
              const last = updated[updated.length - 1];
              if (last && last.role === 'model') {
                last.content = fullReply;
              }
              return { ...prev, [teacherId]: updated };
            });
          }

          if (parsed.done) {
            if (parsed.compactedHistory) {
              finalCompacted = parsed.compactedHistory;
            }
          }
        }
      }

      // Update the invisible backend history array (handling potential compaction)
      setBackendHistories(prev => {
        const base = finalCompacted || historyToSend;
        return {
          ...prev,
          [teacherId]: [
            ...base,
            { role: 'user', content: text },
            { role: 'model', content: fullReply }
          ]
        };
      });

    } catch (err: any) {
      alert(err.message || 'Failed to send message to AI.');
      // Rollback last empty model message & user message on total failure
      setChatHistories(prev => {
        const h = prev[teacherId] || [];
        const updated = [...h];
        const last = updated[updated.length - 1];
        if (last && last.role === 'model' && last.content === '') {
          return { ...prev, [teacherId]: updated.slice(0, -2) };
        }
        return prev;
      });
    } finally {
      setChatLoading(prev => ({ ...prev, [teacherId]: false }));
    }
  };

  return (
    <div className="card">
      <h3 className="font-semibold text-primary mb-4 text-sm sm:text-base">Teacher Rankings</h3>
      {rankings.length === 0 ? (
        <p className="text-gray-500 text-sm">No teacher data available.</p>
      ) : (
        <div className="table-wrap overflow-x-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base text-left">
                <th className="pb-3 text-secondary font-medium w-8 sm:w-10">#</th>
                <th className="pb-3 text-secondary font-medium">Teacher</th>
                <th className="pb-3 text-secondary font-medium text-right whitespace-nowrap">Avg</th>
                <th className="pb-3 text-secondary font-medium text-right whitespace-nowrap hidden sm:table-cell">Feedback</th>
                <th className="pb-3 w-8 sm:w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y border-base">
              {rankings.map((r, i) => {
                const history = chatHistories[r.teacherId] || [];
                const isLoading = chatLoading[r.teacherId] || false;
                
                return (
                <React.Fragment key={r.teacherId}>
                  <tr 
                    onClick={() => setExpanded(expanded === r.teacherId ? null : r.teacherId)}
                    className="hover:bg-gray-800/30 transition-colors cursor-pointer group">
                    <td className="py-3">
                      {i < 3
                        ? <span className={medals[i]}>{medalLabels[i]}</span>
                        : <span className="text-secondary text-xs font-mono pl-1">#{i + 1}</span>}
                    </td>
                    <td className="py-3">
                      <div className="font-medium text-primary text-xs sm:text-sm">{r.name}</div>
                      {r.email && <div className="text-xs text-secondary hidden sm:block">{r.email}</div>}
                    </td>
                    <td className="py-3 text-right">
                      <span className={`font-bold ${
                        r.averageRating >= 7 ? 'text-emerald-400' :
                        r.averageRating >= 5 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {r.averageRating > 0 ? `${r.averageRating}/10` : '—'}
                      </span>
                    </td>
                    <td className="py-3 text-right text-secondary hidden sm:table-cell">{r.totalFeedback}</td>
                    <td className="py-3 text-right pr-2">
                       <span className={`text-xs transition-transform inline-block text-secondary ${expanded === r.teacherId ? 'rotate-180' : ''}`}>
                         ▼
                       </span>
                    </td>
                  </tr>
                  
                  {expanded === r.teacherId && (
                    <tr>
                      <td colSpan={5} className="py-4 px-2 sm:px-4 bg-gray-500/5 rounded-lg border-x border-base max-w-0">
                        <div className="w-full overflow-hidden space-y-4">
                        <div className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                          AI Intelligence Report
                        </div>
                        {localSummaries[r.teacherId] ? (
                          <div className="flex flex-col gap-4">
                            <div className="text-secondary text-sm leading-relaxed whitespace-pre-line border-l-2 border-brand-500/30 pl-4 py-1">
                              {localSummaries[r.teacherId]}
                            </div>
                            
                            {/* Intelligent Chat Section */}
                            <div className="bg-gray-500/5 rounded-md p-3 sm:p-4 border border-base">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                                <h4 className="text-xs font-semibold text-primary flex items-center gap-2">
                                  <span className="text-brand-400 text-base">✨</span> Ask AI about this feedback
                                </h4>
                                {history.length > 0 && (
                                  <button
                                    onClick={() => setChatHistories(prev => ({ ...prev, [r.teacherId]: [] }))}
                                    className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                                  >
                                    Clear Chat
                                  </button>
                                )}
                              </div>
                              
                              <div className="space-y-2 mb-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar flex flex-col">
                                {history.length === 0 ? (
                                  <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                                    {[
                                      { label: 'Key strengths?', value: 'What are the core strengths mentioned?' },
                                      { label: 'Top 3 improvements?', value: 'List the top 3 areas for improvement.' },
                                      { label: '1-line sentiment?', value: 'Summarize student sentiment in one sentence.' },
                                    ].map((suggestion) => (
                                      <button 
                                        key={suggestion.value}
                                        onClick={() => {
                                          setChatInputs(prev => ({ ...prev, [r.teacherId]: suggestion.value }));
                                          // Note: React state is async, so we manually trigger it or let the user click send
                                        }}
                                        className="shrink-0 text-[10px] sm:text-[11px] bg-gray-500/5 hover:bg-gray-500/10 hover:text-primary border border-base text-secondary py-0.5 px-1.5 rounded-full transition-all whitespace-nowrap"
                                      >
                                        {suggestion.label}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  history.map((msg, idx) => (
                                    <div key={idx} className={`text-sm flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                      <div className={`px-3 sm:px-4 py-2.5 rounded-2xl max-w-[92%] sm:max-w-[90%] md:max-w-[80%] shadow-md whitespace-pre-wrap leading-relaxed break-words ${msg.role === 'user' ? 'bg-brand-600 text-white rounded-br-sm' : 'bg-gray-500/10 text-primary rounded-bl-sm border border-base'}`}>
                                        {msg.role === 'model' ? <FormattedMessage content={msg.content} /> : msg.content}
                                      </div>
                                    </div>
                                  ))
                                )}
                                {isLoading && (
                                  <div className="text-sm flex justify-start">
                                    <div className="px-4 py-3 rounded-2xl max-w-[85%] bg-gray-500/10 text-secondary rounded-bl-sm border border-base flex items-center gap-2 w-16 h-10 shadow-md">
                                      <span className="w-1.5 h-1.5 bg-brand-400/80 rounded-full animate-bounce" />
                                      <span className="w-1.5 h-1.5 bg-brand-400/80 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                      <span className="w-1.5 h-1.5 bg-brand-400/80 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    </div>
                                  </div>
                                )}
                                <div ref={chatEndRef} />
                              </div>
                              
                              <div className="flex flex-col sm:flex-row gap-2">
                                <input 
                                  type="text" 
                                  maxLength={600}
                                  placeholder="E.g. What specific topics do students say they struggle with?" 
                                  className="input flex-1 py-2.5 text-sm md:text-base border-base focus:border-brand-500 shadow-inner rounded-xl"
                                  value={chatInputs[r.teacherId] || ''}
                                  onChange={(e) => setChatInputs(prev => ({ ...prev, [r.teacherId]: e.target.value }))}
                                  onKeyDown={(e) => e.key === 'Enter' && handleChatSend(r.teacherId)}
                                  disabled={isLoading}
                                />
                                <button 
                                  className="btn-primary py-2 px-4 text-sm rounded-lg shadow-sm sm:w-auto w-full" 
                                  onClick={() => handleChatSend(r.teacherId)}
                                  disabled={isLoading || !chatInputs[r.teacherId]?.trim()}
                                >
                                  Send
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="py-2">
                            <p className="text-secondary italic text-sm mb-3">No summary generated yet.</p>
                            <button 
                               onClick={(e) => handleGenerate(e, r.teacherId)}
                               disabled={generatingId === r.teacherId}
                               className="btn-primary py-1.5 px-3 text-xs flex items-center gap-2"
                            >
                               {generatingId === r.teacherId ? (
                                 <>
                                   <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                                   Generating...
                                 </>
                               ) : '⚡ Generate Report'}
                            </button>
                           </div>
                         )}
                        </div>
                       </td>
                     </tr>
                  )}
                </React.Fragment>
              )})}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


