import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  Code, 
  CheckCircle2, 
  Share2, 
  Flag,
  Send,
  Zap,
  Plus,
  Trash2,
  Paperclip,
  FileText,
  ExternalLink,
  Circle
} from 'lucide-react';

import { cn } from '../../utils/cn';
import { api, resolveAssetUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

export const QuestionDetail: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { socket } = useSocket();
    const [question, setQuestion] = useState<any>(null);
    const [answers, setAnswers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPostAnswer, setShowPostAnswer] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [newAnswer, setNewAnswer] = useState({ 
        content: '', 
        explanation: '', 
        codeSnippet: '', 
        isStepByStep: false,
        attachmentUrl: '',
        attachmentName: ''
    });

    const loadQuestion = async () => {
        if (!id) return;
        try {
            const res = await api.getCommunityQuestionDetail(id);
            if (res.success) {
                setQuestion(res.data);
                setAnswers(res.data.answers);
            }
        } catch (err) {
            console.error('Failed to load thread', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadQuestion();
        if (socket && id) {
            socket.emit('join_question', id);
            socket.on('new_answer', (answer: any) => {
                setAnswers(prev => [answer, ...prev]);
            });
            return () => {
                socket.off('new_answer');
            };
        }
    }, [id, socket]);

    const handlePostAnswer = async () => {
        if (!id || !user || !newAnswer.content) return;
        try {
            const res = await api.postCommunityAnswer({
                questionId: parseInt(id),
                studentEmail: user.email,
                studentName: user.name,
                ...newAnswer
            });
            if (res.data.success) {
                setShowPostAnswer(false);
                setNewAnswer({ 
                    content: '', 
                    explanation: '', 
                    codeSnippet: '', 
                    isStepByStep: false,
                    attachmentUrl: '',
                    attachmentName: ''
                });
                if (socket) socket.emit('post_answer', res.data.data);
                setAnswers(prev => [res.data.data, ...prev]);
            }
        } catch (err) {
            console.error('Answer post error', err);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = reader.result as string;
                const res = await api.uploadLectureDocument(file.name, base64);
                if (res.data.success) {
                    setNewAnswer(prev => ({ 
                        ...prev, 
                        attachmentUrl: res.data.fileUrl, 
                        attachmentName: file.name 
                    }));
                }
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error('Upload failed', err);
        } finally {
            setIsUploading(false);
        }
    };

    const handleVote = async (type: 'question' | 'answer', targetId: number, voteType: 'up' | 'down') => {
        if (!user) return;
        try {
            const res = await api.voteOnCommunity({
                type,
                targetId,
                studentEmail: user.email,
                voteType
            });
            if (res.success) {
                if (type === 'question' && question) {
                    setQuestion({ ...question, upvotes: new Array(res.upvotes), downvotes: new Array(res.downvotes) });
                } else {
                    setAnswers(prev => prev.map(a => a.id === targetId ? { ...a, upvotes: new Array(res.upvotes), downvotes: new Array(res.downvotes) } : a));
                }
            }
        } catch (err) {
            console.error('Vote error', err);
        }
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse uppercase text-xs tracking-widest text-emerald-500">Loading discussion...</div>;
    if (!question) return <div className="p-20 text-center">Question not found.</div>;

    const hasUpvotedQuestion = question.upvotes?.includes(user?.email || '');
    const hasDownvotedQuestion = question.downvotes?.includes(user?.email || '');

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-in slide-in-from-bottom-4 duration-700">
            {/* Navigation */}
            <button 
                onClick={() => navigate('/community')}
                className="flex items-center gap-2 text-gray-400 hover:text-emerald-500 font-black text-[10px] uppercase tracking-widest mb-8 transition-all px-4 py-2 hover:bg-emerald-50 rounded-xl w-fit"
            >
                <ChevronLeft className="w-4 h-4" /> Back to Discussions
            </button>

            {/* Question Card */}
            <div className="card-premium p-10 rounded-[3rem] mb-12 shadow-premium bg-white border border-gray-100">
                <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-emerald-500/20">
                            {question.studentName.split(' ').map((p: any) => p[0]).join('')}
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-gray-900">{question.studentName}</h4>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{question.collegeName} • {new Date(question.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {question.tags?.map((t: string) => (
                            <span key={t} className="px-4 py-1.5 bg-emerald-50 text-[10px] font-black text-emerald-600 uppercase rounded-xl border border-emerald-100">{t}</span>
                        ))}
                    </div>
                </div>

                <h1 className="text-3xl font-black text-gray-900 mb-6 tracking-tight leading-tight">{question.title}</h1>
                <p className="text-lg font-bold text-gray-600 leading-relaxed mb-6">{question.content}</p>

                {question.codeSnippet && (
                    <div className="rounded-[2rem] overflow-hidden shadow-2xl my-8 relative group">
                        <div className="bg-gray-800 px-6 py-3 flex items-center justify-between border-b border-gray-700">
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                            </div>
                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Question Code</span>
                        </div>
                        <button 
                            onClick={() => navigator.clipboard.writeText(question.codeSnippet)}
                            className="absolute top-12 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all text-[10px] font-black uppercase"
                        >
                            Copy
                        </button>
                        <SyntaxHighlighter 
                            language="javascript" 
                            style={atomDark}
                            customStyle={{ margin: 0, padding: '2rem', fontSize: '13px', lineHeight: '1.6' }}
                        >
                            {question.codeSnippet}
                        </SyntaxHighlighter>
                    </div>
                )}

                <div className="flex items-center justify-between pt-10 border-t border-gray-50">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <button 
                              onClick={() => handleVote('question', question.id, 'up')}
                              className={cn("flex flex-col items-center gap-1 p-3 rounded-2xl transition-all", hasUpvotedQuestion ? "bg-emerald-500 text-white shadow-lg" : "bg-gray-50 text-gray-400 hover:bg-emerald-50 hover:text-emerald-500")}
                            >
                                <ThumbsUp className="w-5 h-5" />
                                <span className={cn("text-[9px] font-black uppercase", hasUpvotedQuestion ? "text-white" : "text-gray-400")}>Helpful</span>
                            </button>
                            <span className="text-sm font-black text-gray-900 px-2">{ (question.upvotes?.length || 0) - (question.downvotes?.length || 0) }</span>
                            <button 
                              onClick={() => handleVote('question', question.id, 'down')}
                              className={cn("p-3 rounded-2xl transition-all", hasDownvotedQuestion ? "bg-rose-500 text-white shadow-lg" : "bg-gray-50 text-gray-400 hover:bg-rose-50 hover:text-rose-500")}
                            >
                                <ThumbsDown className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-3 bg-gray-50 text-gray-400 rounded-2xl border border-gray-100 hover:text-gray-900 transition-all"><Share2 className="w-5 h-5" /></button>
                        <button className="p-3 bg-gray-50 text-gray-400 rounded-2xl border border-gray-100 hover:text-rose-500 transition-all"><Flag className="w-5 h-5" /></button>
                    </div>
                </div>
            </div>

            {/* Response Section */}
            <div className="mb-8 flex justify-between items-center">
                <h3 className="text-xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                    <MessageSquare className="text-emerald-500" /> Responses ({answers.length})
                </h3>
                <button 
                  onClick={() => setShowPostAnswer(true)}
                  className="px-6 py-3 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Share My Solution
                </button>
            </div>

            {/* Answer Box */}
            {showPostAnswer && (
                <div className="card-premium p-8 rounded-[3rem] mb-12 bg-white border-2 border-emerald-500 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em] mb-2 block font-display">Core Answer</label>
                            <textarea 
                              rows={4}
                              placeholder="Describe your solution briefly..."
                              value={newAnswer.content}
                              onChange={(e) => setNewAnswer(prev => ({ ...prev, content: e.target.value }))}
                              className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-gray-300 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none resize-none"
                            />
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em] mb-2 block font-display">Detailed Explanation</label>
                                <textarea 
                                  rows={6}
                                  placeholder="Go deeper into why this works..."
                                  value={newAnswer.explanation}
                                  onChange={(e) => setNewAnswer(prev => ({ ...prev, explanation: e.target.value }))}
                                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-gray-300 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none resize-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em] mb-2 block font-display">Code Snippet (Optional)</label>
                                <textarea 
                                  rows={6}
                                  placeholder="Paste your code here..."
                                  value={newAnswer.codeSnippet}
                                  onChange={(e) => setNewAnswer(prev => ({ ...prev, codeSnippet: e.target.value }))}
                                  className="w-full bg-emerald-950 text-emerald-400 font-mono border-none rounded-2xl px-6 py-4 text-xs placeholder:text-emerald-900/50 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none resize-none"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                   <input 
                                     type="checkbox" 
                                     checked={newAnswer.isStepByStep}
                                     onChange={(e) => setNewAnswer(prev => ({ ...prev, isStepByStep: e.target.checked }))}
                                     className="w-5 h-5 rounded-lg border-2 border-gray-200 text-emerald-500 focus:ring-emerald-500/20 transition-all cursor-pointer"
                                   />
                                   <span className="text-[10px] font-black uppercase text-gray-400 group-hover:text-emerald-600 transition-colors tracking-widest">Step-by-Step Solution</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className={cn(
                                        "p-2.5 rounded-xl border border-dashed transition-all flex items-center gap-2",
                                        newAnswer.attachmentUrl ? "bg-emerald-50 border-emerald-500 text-emerald-600" : "bg-gray-50 border-gray-200 text-gray-400 hover:border-emerald-500 hover:text-emerald-500"
                                    )}>
                                        {isUploading ? <Circle className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                            {isUploading ? 'Uploading...' : newAnswer.attachmentName || 'Attach PDF/Doc'}
                                        </span>
                                    </div>
                                    <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.ppt,.pptx" />
                                </label>
                            </div>
                        </div>
                            <div className="flex gap-4">
                                <button onClick={() => setShowPostAnswer(false)} className="px-6 py-3 bg-gray-50 text-gray-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all">Cancel</button>
                                <button onClick={handlePostAnswer} className="px-8 py-3 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all flex items-center gap-2">
                                    <Send className="w-4 h-4" /> Publish Answer
                                </button>
                            </div>
                        </div>
                    </div>
            )}

            {/* Answers List */}
            <div className="space-y-8 pb-20">
                {answers.map((answer) => {
                    const hasUpvoted = answer.upvotes?.includes(user?.email || '');
                    return (
                        <div key={answer.id} className="card-premium p-10 rounded-[3rem] bg-white border border-gray-100 hover:shadow-premium-hover transition-all animate-in fade-in slide-in-from-bottom-4 delay-100">
                             <div className="flex justify-between items-center mb-8 pb-8 border-b border-gray-50">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 font-black text-[10px] border border-gray-100">
                                        {answer.studentName.split(' ').map((p: any) => p[0]).join('')}
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-gray-900">{answer.studentName}</h4>
                                        <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em]">{answer.collegeName} • {new Date(answer.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                {answer.isStepByStep && (
                                    <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 text-[10px] font-black uppercase tracking-widest">
                                        <Zap className="w-3 h-3 fill-indigo-500" /> Step-by-Step
                                    </div>
                                )}
                             </div>

                             <div className="prose max-w-none mb-10">
                                <p className="text-lg font-bold text-gray-800 mb-6">{answer.content}</p>
                                {answer.explanation && (
                                    <div className="p-6 bg-gray-50 rounded-2xl border-l-4 border-emerald-500 mb-6 italic text-gray-600 font-medium">
                                        {answer.explanation}
                                    </div>
                                )}
                                 {answer.codeSnippet && (
                                    <div className="rounded-[2rem] overflow-hidden shadow-2xl my-8 relative group">
                                        <div className="bg-gray-800 px-6 py-3 flex items-center justify-between border-b border-gray-700">
                                            <div className="flex gap-1.5">
                                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                                            </div>
                                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Solution Code</span>
                                        </div>
                                        <button 
                                            onClick={() => navigator.clipboard.writeText(answer.codeSnippet)}
                                            className="absolute top-12 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all text-[10px] font-black uppercase"
                                        >
                                            Copy
                                        </button>
                                        <SyntaxHighlighter 
                                          language="javascript" 
                                          style={atomDark}
                                          customStyle={{ margin: 0, padding: '2rem', fontSize: '13px', lineHeight: '1.6' }}
                                        >
                                            {answer.codeSnippet}
                                        </SyntaxHighlighter>
                                    </div>
                                )}

                                {answer.attachmentUrl && (
                                    <div className="my-8 p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100 flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-white rounded-2xl text-emerald-600 shadow-sm">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">Attached Resource</p>
                                                <p className="text-sm font-bold text-gray-600 truncate max-w-[200px] md:max-w-md">{answer.attachmentName || 'Download Resource'}</p>
                                            </div>
                                        </div>
                                        <a 
                                            href={resolveAssetUrl(answer.attachmentUrl)} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-6 py-3 bg-white text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                                        >
                                            View PDF <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                )}
                             </div>

                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <button 
                                          onClick={() => handleVote('answer', answer.id, 'up')}
                                          className={cn("flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-black text-[10px] uppercase", hasUpvoted ? "bg-emerald-500 text-white shadow-lg" : "bg-gray-50 text-gray-400 hover:bg-emerald-50")}
                                        >
                                            <ThumbsUp className="w-4 h-4" />
                                            {hasUpvoted ? 'Helpful' : 'Mark Helpful'}
                                        </button>
                                        <span className="text-xs font-black text-gray-900 ml-2">{(answer.upvotes?.length || 0) - (answer.downvotes?.length || 0)}</span>
                                    </div>
                                    <button className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:text-rose-500 transition-all border border-gray-100">
                                        <Flag className="w-4 h-4" />
                                    </button>
                                </div>
                                { (answer.upvotes?.length || 0) > 5 && (
                                    <div className="flex items-center gap-2 text-amber-500 font-black text-[10px] uppercase tracking-widest bg-amber-50 px-4 py-1.5 rounded-full border border-amber-100">
                                        <Zap className="w-4 h-4 fill-amber-500" /> Community Choice
                                    </div>
                                )}
                             </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
