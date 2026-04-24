import React, { useEffect, useState } from 'react';
import { 
  Search, 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  ExternalLink, 
  Tag, 
  Users,
  Plus,
  Rocket,
  Circle,
  Trash2
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Link } from 'react-router-dom';

const tags = ['All', 'React', 'Python', 'NodeJS', 'UI/UX', 'Database', 'Career', 'Tips'];

export const Community: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedTag, setSelectedTag] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ title: '', content: '', codeSnippet: '', tags: [] as string[] });
  const [topContributor, setTopContributor] = useState<any>(null);

  const loadTopContributor = async () => {
    try {
      const res = await api.getCommunityTopContributor();
      if (res.success) {
        setTopContributor(res.data);
      }
    } catch (err) {
      console.error('Failed to load top contributor', err);
    }
  };

  const loadQuestions = async () => {
    try {
      const tagParam = selectedTag === 'All' ? undefined : selectedTag;
      const res = await api.getCommunityQuestions(tagParam, searchQuery);
      if (res.success) {
        setQuestions(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load community questions', err);
    }
  };

  useEffect(() => {
    loadQuestions();
    loadTopContributor();
    
    if (socket) {
      socket.emit('join_community');
      socket.on('new_question', (q: any) => {
        setQuestions(prev => {
          if (prev.find(p => p.id === q.id)) return prev;
          return [q, ...prev];
        });
      });
      return () => {
        socket.off('new_question');
      };
    }
  }, [selectedTag, searchQuery, socket]);

  const handleCreateQuestion = async () => {
    if (!newQuestion.title || !newQuestion.content || !user) {
      alert("Please fill in Title and Content. Ensure you are logged in.");
      return;
    }
    
    setIsPosting(true);
    try {
      const res = await api.postCommunityQuestion({
        studentEmail: user.email,
        studentName: user.name,
        collegeEmail: user.collegeEmail || '',
        collegeName: user.course || 'Independent Student', // Using course/branch as college display name if needed, or user.collegeName if added
        title: newQuestion.title,
        content: newQuestion.content,
        codeSnippet: newQuestion.codeSnippet,
        tags: newQuestion.tags
      });
      if (res.success) {
        setIsAsking(false);
        setNewQuestion({ title: '', content: '', codeSnippet: '', tags: [] });
        if (socket) socket.emit('ask_question', res.data);
        setQuestions(prev => {
          if (prev.find(p => p.id === res.data.id)) return prev;
          return [res.data, ...prev];
        });
      } else {
        alert("Failed to post: " + (res.message || "Unknown error"));
      }
    } catch (err: any) {
      console.error('Create error', err);
      alert("Error: " + (err.message || "Connection failed"));
    } finally {
      setIsPosting(false);
    }
  };

  const handleVote = async (e: React.MouseEvent, type: 'question' | 'answer', id: number, voteType: 'up' | 'down') => {
    e.preventDefault();
    if (!user) {
      alert("Please login to vote");
      return;
    }
    try {
      const res = await api.voteOnCommunity({
        type,
        targetId: id,
        studentEmail: user.email,
        voteType
      });
      if (res.success) {
        setQuestions(prev => prev.map(q => {
          if (q.id === id) {
            return { ...q, upvotes: res.upvotes, downvotes: res.downvotes };
          }
          return q;
        }));
      }
    } catch (err) {
      console.error('Vote error', err);
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    try {
      const res = await api.deleteCommunityQuestion(id);
      if (res.success) {
        setQuestions(prev => prev.filter(q => q.id !== id));
      }
    } catch (err) {
      console.error('Delete error', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="relative mb-12 p-10 rounded-[3rem] bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-400 overflow-hidden shadow-premium">
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <Users className="w-64 h-64 text-white rotate-12" />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-[0.2em] mb-4">
            <Circle className="w-2 h-2 fill-emerald-200 animate-pulse" />
            Live Global Community
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tighter">Student Hub</h1>
          <p className="text-emerald-50 font-bold text-lg max-w-2xl leading-relaxed opacity-90">
            Ask technical questions, share code snippets, and grow with students across all registered colleges.
          </p>
          <button 
            onClick={() => setIsAsking(true)}
            className="mt-8 px-8 py-4 bg-white text-emerald-600 rounded-2xl font-black text-sm shadow-xl shadow-emerald-900/10 hover:scale-105 transition-all flex items-center gap-3"
          >
            <Plus className="w-5 h-5" /> Start a Discussion
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Left Sidebar: Filters */}
        <div className="space-y-6">
          <div className="card-premium p-6 rounded-[2rem]">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6">Popular Tags</h3>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <button 
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[11px] font-black transition-all",
                    selectedTag === tag 
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                      : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="card-premium p-6 rounded-[2rem] bg-emerald-50/50 border-emerald-100">
            <div className="flex items-center gap-3 mb-4">
              <Rocket className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-black text-emerald-900">Weekly Top Contributor</h3>
            </div>
            {topContributor ? (
              <div className="flex items-center gap-4 p-3 bg-white rounded-2xl shadow-sm border border-emerald-100 animate-in slide-in-from-right duration-500">
                 <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-lg shadow-indigo-500/20">{topContributor.initials}</div>
                 <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-gray-900 truncate">{topContributor.name}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">{topContributor.college} • {topContributor.postCount} Posts</p>
                 </div>
              </div>
            ) : (
              <div className="p-4 text-center border-2 border-dashed border-emerald-100 rounded-2xl opacity-40">
                <p className="text-[10px] font-black uppercase text-emerald-900 tracking-wider">No contributors yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Feed */}
        <div className="lg:col-span-3 space-y-6">
           {/* Search Bar */}
           <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search across thousands of discussions..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-100 rounded-[2rem] pl-16 pr-8 py-6 text-sm font-bold shadow-soft focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none"
              />
           </div>

           {/* Questions List */}
           <div className="space-y-4">
             {questions.length === 0 ? (
               <div className="py-20 text-center opacity-30">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4" />
                  <p className="font-black uppercase text-xs tracking-widest">No discussions found in {selectedTag}</p>
               </div>
             ) : (
               questions.map((q) => (
                 <Link to={`/community/q/${q.id}`} key={q.id} className="block group">
                   <div className="card-premium p-8 rounded-[2.5rem] hover:shadow-premium-hover transition-all border border-transparent hover:border-emerald-100">
                      <div className="flex justify-between items-start mb-6">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-emerald-500 font-black text-xs border border-gray-100 group-hover:scale-110 transition-transform">
                               {q.studentName.split(' ').map((p: any) => p[0]).join('')}
                            </div>
                            <div>
                               <h4 className="text-xs font-black text-gray-900">{q.studentName}</h4>
                               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{q.collegeName} • {new Date(q.createdAt).toLocaleDateString()}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-3">
                            {user?.email === q.studentEmail && (
                               <button 
                                 onClick={(e) => { e.preventDefault(); handleDeleteQuestion(q.id); }}
                                 className="p-2 text-gray-300 hover:text-rose-500 transition-all hover:bg-rose-50 rounded-lg"
                               >
                                 <Trash2 className="w-4 h-4" />
                               </button>
                            )}
                            <div className="flex gap-1">
                               {q.tags?.slice(0, 2).map((t: string) => (
                                  <span key={t} className="px-3 py-1 bg-gray-50 text-[8px] font-black text-gray-400 uppercase rounded-lg border border-gray-100">{t}</span>
                               ))}
                            </div>
                         </div>
                      </div>

                      <h2 className="text-xl font-black text-gray-900 mb-3 tracking-tight leading-tight group-hover:text-emerald-600 transition-colors">{q.title}</h2>
                      <p className="text-sm font-bold text-gray-500 line-clamp-2 leading-relaxed mb-6">{q.content}</p>

                      <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                         <div className="flex items-center gap-6">
                            <button 
                              onClick={(e) => handleVote(e, 'question', q.id, 'up')}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl active:scale-90 transition-all border",
                                q.upvotes?.includes(user?.email) 
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                  : "bg-gray-50 text-gray-400 border-gray-100 hover:bg-emerald-50 hover:text-emerald-500"
                              )}
                            >
                               <ThumbsUp className="w-3.5 h-3.5" />
                               <span className="text-[10px] font-black">{Array.isArray(q.upvotes) ? q.upvotes.length : (q.upvotes || 0)}</span>
                            </button>
                            <button 
                              onClick={(e) => handleVote(e, 'question', q.id, 'down')}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl active:scale-90 transition-all border",
                                q.downvotes?.includes(user?.email)
                                  ? "bg-rose-50 text-rose-600 border-rose-100"
                                  : "bg-gray-50 text-gray-400 border-gray-100 hover:bg-rose-50 hover:text-rose-500"
                              )}
                            >
                               <ThumbsDown className="w-3.5 h-3.5" />
                               <span className="text-[10px] font-black">{Array.isArray(q.downvotes) ? q.downvotes.length : (q.downvotes || 0)}</span>
                            </button>
                         </div>
                         <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                            View Discussion <ExternalLink className="w-3 h-3" />
                         </div>
                      </div>
                   </div>
                 </Link>
               ))
             )}
           </div>
        </div>
      </div>

      {/* Ask Question Modal */}
       {isAsking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white rounded-[3rem] shadow-premium w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-7 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                 <div>
                    <h2 className="text-xl font-black text-gray-900">Ask a Question</h2>
                    <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wider">Start a new community thread</p>
                 </div>
                 <button onClick={() => setIsAsking(false)} className="p-3 bg-white text-gray-400 rounded-2xl hover:text-rose-500 transition-all border border-gray-100 shadow-sm">✕</button>
              </div>
              <div className="p-7 space-y-5 max-h-[70vh] overflow-y-auto">
                 <div>
                    <label className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em] mb-2 block">Question Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. How to center a div using CSS Grid?"
                      value={newQuestion.title}
                      onChange={(e) => setNewQuestion(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-gray-300 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em] mb-2 block">Content & Details</label>
                    <textarea 
                      rows={5}
                      placeholder="Explain your problem in detail. Include what you've tried..."
                      value={newQuestion.content}
                      onChange={(e) => setNewQuestion(prev => ({ ...prev, content: e.target.value }))}
                      className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-gray-300 focus:ring-4 focus:ring-emerald-500/5 transition-all resize-none"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em] mb-2 block font-display">Code Snippet (Optional)</label>
                    <textarea 
                      rows={5}
                      placeholder="Paste any relevant code here..."
                      value={newQuestion.codeSnippet}
                      onChange={(e) => setNewQuestion(prev => ({ ...prev, codeSnippet: e.target.value }))}
                      className="w-full bg-emerald-950 text-emerald-400 font-mono border-none rounded-2xl px-6 py-4 text-xs placeholder:text-emerald-900/50 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none resize-none"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em] mb-3 block">Related Tags</label>
                    <div className="flex flex-wrap gap-2">
                       {tags.filter(t => t !== 'All').map(t => (
                          <button 
                            key={t}
                            onClick={() => {
                               setNewQuestion(prev => ({
                                  ...prev,
                                  tags: prev.tags.includes(t) ? prev.tags.filter(xt => xt !== t) : [...prev.tags, t]
                               }));
                            }}
                            className={cn(
                               "px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                               newQuestion.tags.includes(t) ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-gray-50 text-gray-400"
                            )}
                          >
                             {t}
                          </button>
                       ))}
                    </div>
                 </div>
              </div>
              <div className="p-7 bg-gray-50/50 border-t border-gray-50 flex gap-4">
                 <button onClick={() => setIsAsking(false)} className="flex-1 py-4 bg-white text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest border border-gray-100 shadow-sm active:scale-95 transition-all">Cancel</button>
                 <button 
                  disabled={isPosting}
                  onClick={handleCreateQuestion} 
                  className={cn(
                    "flex-1 py-4 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2",
                    isPosting ? "bg-emerald-300 cursor-not-allowed" : "bg-emerald-500 shadow-emerald-500/20 hover:bg-emerald-400 active:scale-95"
                  )}
                 >
                    {isPosting ? (
                      <>
                        <Circle className="w-4 h-4 animate-spin text-white" />
                        Posting...
                      </>
                    ) : (
                      "Post Question"
                    )}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
