import React, { useState, useRef, useEffect } from 'react';
import client from '../../api/client';

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
    } catch (err) {
      alert('Failed to generate report for this teacher.');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleChatSend = async (teacherId: string) => {
    const text = chatInputs[teacherId]?.trim();
    if (!text) return;

    // Appending locally first for instantaneous UI update
    setChatInputs(prev => ({ ...prev, [teacherId]: '' }));
    setChatHistories(prev => {
      const h = prev[teacherId] || [];
      return { ...prev, [teacherId]: [...h, { role: 'user', content: text }] };
    });
    setChatLoading(prev => ({ ...prev, [teacherId]: true }));

    try {
      const historyToSend = backendHistories[teacherId] || chatHistories[teacherId] || [];
      const res = await client.post(`/admin/report/chat/${teacherId}`, {
        message: text,
        history: historyToSend
      });
      
      setChatHistories(prev => {
        const h = prev[teacherId] || [];
        return { ...prev, [teacherId]: [...h, { role: 'model', content: res.data.reply }] };
      });

      // Update the invisible backend history array (handling potential compaction)
      setBackendHistories(prev => {
        const base = res.data.compactedHistory || historyToSend;
        return { ...prev, [teacherId]: [...base, { role: 'user', content: text }, { role: 'model', content: res.data.reply }] };
      });

    } catch (err) {
      alert('Failed to send message to AI.');
      // Rollback last message optionally
    } finally {
      setChatLoading(prev => ({ ...prev, [teacherId]: false }));
    }
  };

  return (
    <div className="card">
      <h3 className="font-semibold text-white mb-4 text-sm sm:text-base">Teacher Rankings</h3>
      {rankings.length === 0 ? (
        <p className="text-gray-500 text-sm">No teacher data available.</p>
      ) : (
        <div className="table-wrap">
          <table className="w-full text-sm min-w-[320px]">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="pb-3 text-gray-400 font-medium w-10">#</th>
                <th className="pb-3 text-gray-400 font-medium">Teacher</th>
                <th className="pb-3 text-gray-400 font-medium text-right">Avg</th>
                <th className="pb-3 text-gray-400 font-medium text-right hidden sm:table-cell">Feedback</th>
                <th className="pb-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
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
                        : <span className="text-gray-500 text-xs font-mono pl-1">#{i + 1}</span>}
                    </td>
                    <td className="py-3">
                      <div className="font-medium text-white text-xs sm:text-sm">{r.name}</div>
                      {r.email && <div className="text-xs text-gray-500 hidden sm:block">{r.email}</div>}
                    </td>
                    <td className="py-3 text-right">
                      <span className={`font-bold ${
                        r.averageRating >= 7 ? 'text-emerald-400' :
                        r.averageRating >= 5 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {r.averageRating > 0 ? `${r.averageRating}/10` : '—'}
                      </span>
                    </td>
                    <td className="py-3 text-right text-gray-400 hidden sm:table-cell">{r.totalFeedback}</td>
                    <td className="py-3 text-right pr-2">
                       <span className={`text-xs transition-transform inline-block ${expanded === r.teacherId ? 'rotate-180' : ''}`}>
                         ▼
                       </span>
                    </td>
                  </tr>
                  
                  {expanded === r.teacherId && (
                    <tr>
                      <td colSpan={5} className="py-4 px-4 bg-gray-900/50 rounded-lg">
                        <div className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                          AI Intelligence Report
                        </div>
                        {localSummaries[r.teacherId] ? (
                          <div className="flex flex-col gap-4">
                            <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line border-l-2 border-brand-500/30 pl-4 py-1">
                              {localSummaries[r.teacherId]}
                            </div>
                            
                            {/* Intelligent Chat Section */}
                            <div className="bg-gray-800/20 rounded-md p-4 border border-gray-800">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-xs font-semibold text-gray-300 flex items-center gap-2">
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
                              
                              <div className="space-y-4 mb-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar flex flex-col">
                                {history.length === 0 ? (
                                  <div className="flex flex-col gap-2 my-2">
                                    <span className="text-xs text-gray-500 mb-1">Suggested questions:</span>
                                    {['What are the core strengths mentioned?', 'List the top 3 areas for improvement.', 'Summarize student sentiment in one sentence.'].map(suggestion => (
                                      <button 
                                        key={suggestion}
                                        onClick={() => {
                                          setChatInputs(prev => ({ ...prev, [r.teacherId]: suggestion }));
                                          // Note: React state is async, so we manually trigger it or let the user click send
                                        }}
                                        className="text-left text-sm bg-gray-800/50 hover:bg-gray-700 hover:text-white border border-gray-700/50 text-gray-300 py-2 px-3 rounded-xl transition-all"
                                      >
                                        {suggestion}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  history.map((msg, idx) => (
                                    <div key={idx} className={`text-sm flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                      <div className={`px-4 py-2.5 rounded-2xl max-w-[90%] md:max-w-[80%] shadow-md whitespace-pre-wrap leading-relaxed ${msg.role === 'user' ? 'bg-brand-600 text-white rounded-br-sm' : 'bg-gray-800 text-gray-200 rounded-bl-sm border border-gray-700/60'}`}>
                                        {msg.content}
                                      </div>
                                    </div>
                                  ))
                                )}
                                {isLoading && (
                                  <div className="text-sm flex justify-start">
                                    <div className="px-4 py-3 rounded-2xl max-w-[85%] bg-gray-800 text-gray-400 rounded-bl-sm border border-gray-700/60 flex items-center gap-2 w-16 h-10 shadow-md">
                                      <span className="w-1.5 h-1.5 bg-brand-400/80 rounded-full animate-bounce" />
                                      <span className="w-1.5 h-1.5 bg-brand-400/80 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                      <span className="w-1.5 h-1.5 bg-brand-400/80 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    </div>
                                  </div>
                                )}
                                <div ref={chatEndRef} />
                              </div>
                              
                              <div className="flex gap-2 relative">
                                <input 
                                  type="text" 
                                  maxLength={600}
                                  placeholder="E.g. What specific topics do students say they struggle with?" 
                                  className="input flex-1 py-2.5 pr-20 text-sm md:text-base !bg-gray-900 border-gray-700 focus:!bg-gray-800 focus:border-brand-500 shadow-inner rounded-xl"
                                  value={chatInputs[r.teacherId] || ''}
                                  onChange={(e) => setChatInputs(prev => ({ ...prev, [r.teacherId]: e.target.value }))}
                                  onKeyDown={(e) => e.key === 'Enter' && handleChatSend(r.teacherId)}
                                  disabled={isLoading}
                                />
                                <button 
                                  className="absolute right-1 top-1 bottom-1 btn-primary py-1 px-4 text-sm rounded-lg shadow-sm" 
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
                            <p className="text-gray-500 italic text-sm mb-3">No summary generated yet.</p>
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


