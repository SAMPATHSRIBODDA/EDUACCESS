import React, { useState } from 'react';
import { 
  ChevronLeft, Play, FileText, Copy, Check, Star, 
  Bookmark, Share2, ThumbsUp, ThumbsDown, 
  Send, AlertCircle, Headphones
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccessibility } from '../../context/AccessibilityContext';
import { Link } from 'react-router-dom';

export const GuideView: React.FC = () => {
  const { speak } = useAccessibility();
  const [activeTab, setActiveTab] = useState<'text' | 'video' | 'audio'>('text');
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [comment, setComment] = useState('');
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [comments, setComments] = useState([
    { id: 1, user: 'Priya D.', text: 'Is wireframing absolutely necessary for small projects?', likes: 12, time: '2h ago' },
    { id: 2, user: 'Rahul S.', text: 'Great explanation on accessibility. Very clear!', likes: 5, time: '5h ago' }
  ]);

  const guide = {
    title: "UI/UX Design Fundamentals",
    description: "Learn the core principles of user interface and experience design, focusing on accessibility and modern aesthetics. This guide covers everything from empathy mapping to high-fidelity prototypes.",
    category: "Design",
    difficulty: "Beginner",
    steps: [
      {
        title: "Empathy Mapping",
        content: "Empathy maps are used to help design teams gain context. They allow us to articulate what we know about a particular type of user. It creates a shared understanding of user needs and aids in decision-making.",
        image: "https://images.unsplash.com/photo-1531403001835-4c07fc7692ed?w=800",
        alt: "A person brainstorming with colorful sticky notes on a glass wall.",
        code: "// Empathy Map Data Structure\n{\n  says: 'I want it to be fast',\n  thinks: 'Is this secure?',\n  does: 'Click multiple times',\n  feels: 'Frustrated'\n}"
      },
      {
        title: "Information Architecture",
        content: "Information architecture (IA) is the structural design of shared information environments; the art and science of organizing and labeling websites, intranets, online communities, and software to support usability and findability.",
        image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800",
        alt: "A digital diagram showing interconnected circles and lines.",
      }
    ]
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRating = (val: number) => {
    setRating(val);
  };

  const addComment = () => {
    if (!comment.trim()) return;
    setComments([{ id: Date.now(), user: 'Aarav Sharma', text: comment, likes: 0, time: 'Just now' }, ...comments]);
    setComment('');
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Breadcrumbs / Back */}
        <Link to="/dashboard" className="inline-flex items-center text-sm font-bold text-emerald-600 hover:bg-emerald-50 px-4 py-2 rounded-xl mb-8 transition-all group">
          <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </Link>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Main Content Area */}
          <div className="flex-1 space-y-10">
            {/* Guide Header */}
            <div className="card-premium p-10 relative overflow-hidden bg-white">
              <div className="flex flex-col md:flex-row justify-between items-start gap-8 z-10 relative">
                <div className="space-y-4 flex-1">
                  <div className="flex gap-2">
                    <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">{guide.category}</span>
                    <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100">{guide.difficulty}</span>
                  </div>
                  <h1 className="text-3xl lg:text-5xl font-black text-gray-900 font-display leading-[1.1] tracking-tight">{guide.title}</h1>
                  <p className="text-gray-500 max-w-2xl text-lg leading-relaxed">{guide.description}</p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button 
                    onClick={() => setIsBookmarked(!isBookmarked)}
                    className={`w-14 h-14 flex items-center justify-center rounded-2xl shadow-soft transition-all border ${isBookmarked ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-white border-gray-100 text-gray-400 hover:border-emerald-200 hover:text-emerald-500'}`}
                  >
                    <Bookmark className={`w-6 h-6 ${isBookmarked ? 'fill-current' : ''}`} />
                  </button>
                  <button className="w-14 h-14 flex items-center justify-center bg-white border border-gray-100 rounded-2xl shadow-soft hover:border-blue-200 hover:text-blue-500 text-gray-400 transition-all">
                    <Share2 className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* Media Tabs */}
            <div className="bg-white rounded-premium border border-gray-100 shadow-soft overflow-hidden">
              <div className="flex p-2 bg-gray-50/50 border-b border-gray-100 overflow-x-auto">
                {[
                  { id: 'text', label: 'Step-by-Step Guide', icon: FileText },
                  { id: 'video', label: 'Video Lecture', icon: Play },
                  { id: 'audio', label: 'Audio Narration', icon: Headphones }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === tab.id ? 'bg-white shadow-soft text-emerald-500 border border-emerald-50' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <tab.icon className="w-4 h-4" /> {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-8 lg:p-12">
                <AnimatePresence mode="wait">
                  {activeTab === 'text' && (
                    <motion.div 
                      key="text-tab"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-16"
                    >
                      {guide.steps.map((step, idx) => (
                        <div key={idx} className="relative pl-12">
                          <span className="absolute left-0 top-0 w-8 h-8 bg-emerald-500 text-white rounded-xl flex items-center justify-center text-xs font-black shadow-lg shadow-emerald-500/20">
                            {idx + 1}
                          </span>
                          <div className="flex flex-col lg:flex-row gap-10">
                            <div className="flex-1 space-y-6">
                              <h2 className="text-2xl font-black text-gray-900 font-display tracking-tight uppercase">
                                {step.title}
                              </h2>
                              <p className="text-gray-600 leading-relaxed text-lg bg-gray-50/50 p-6 rounded-2xl border border-gray-100 italic relative">
                                <span className="absolute -left-2 top-4 w-1 h-8 bg-emerald-300 rounded-full"></span>
                                {step.content}
                              </p>
                              <button 
                                onClick={() => speak(step.content)}
                                className="flex items-center gap-2 text-xs font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700 transition-all border border-emerald-100 px-4 py-2 rounded-lg bg-emerald-50/30"
                              >
                                🔊 Hear Step Content
                              </button>
                              
                              {step.code && (
                                <div className="relative group">
                                  <pre className="bg-[#0f172a] text-emerald-400 p-8 rounded-premium overflow-x-auto font-mono text-sm leading-relaxed shadow-xl mt-6 border border-slate-800">
                                    {step.code}
                                  </pre>
                                  <button 
                                    onClick={() => copyToClipboard(step.code!)}
                                    className={`absolute top-12 right-6 p-3 rounded-2xl transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                                  >
                                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            {step.image && (
                              <div className="w-full lg:w-80 shrink-0">
                                <div className="rounded-premium overflow-hidden border-4 border-white shadow-premium">
                                  <img src={step.image} alt={step.alt} className="w-full h-auto object-cover" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}

                  {activeTab === 'video' && (
                    <motion.div 
                      key="video-tab"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="space-y-8"
                    >
                      <div className="aspect-video bg-gray-900 rounded-premium flex items-center justify-center overflow-hidden relative group shadow-2xl">
                        <iframe 
                          className="w-full h-full"
                          src="https://www.youtube.com/embed/rfscVS0vtbw" 
                          title="Guide Video"
                          frameBorder="0" 
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                          allowFullScreen
                        ></iframe>
                        {showSubtitles && (
                          <div className="absolute bottom-16 left-0 right-0 px-8">
                            <p className="bg-black/80 text-white px-4 py-2 rounded-xl text-center text-xs font-bold animate-pulse">
                              [Subtitles Active: User personas represent the different user types that might use your service...]
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <button 
                          onClick={() => setShowSubtitles(!showSubtitles)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${showSubtitles ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'}`}
                        >
                          CC: {showSubtitles ? 'Captions On' : 'Captions Off'}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'audio' && (
                    <motion.div 
                      key="audio-tab"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="flex flex-col items-center py-20"
                    >
                       <div className="relative mb-12">
                         <div className="w-40 h-40 bg-emerald-100 rounded-full flex items-center justify-center animate-pulse">
                            <Headphones className="w-16 h-16 text-emerald-500" />
                         </div>
                       </div>
                       <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase mb-2">Listen to Guide</h3>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Interaction Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="card-premium p-10 bg-white shadow-soft">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-display font-black text-xl text-gray-900 uppercase tracking-tight">Rate this resource</h3>
                  <div className="flex items-center gap-1 text-emerald-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm font-black">4.9/5.0</span>
                  </div>
                </div>
                
                <div className="flex justify-center gap-3 mb-10">
                   {[1, 2, 3, 4, 5].map((s) => (
                     <button 
                       key={s}
                       onMouseEnter={() => setHoverRating(s)}
                       onMouseLeave={() => setHoverRating(0)}
                       onClick={() => handleRating(s)}
                       className="p-1 transition-all"
                     >
                       <Star className={`w-10 h-10 transition-all ${s <= (hoverRating || rating) ? 'fill-yellow-400 text-yellow-400 scale-110 shadow-lg shadow-yellow-500/20' : 'text-gray-200'}`} />
                     </button>
                   ))}
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setHelpful(true)}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border transition-all font-black text-xs uppercase tracking-widest ${helpful === true ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-white text-gray-400 border-gray-100 hover:bg-emerald-50'}`}
                  >
                    <ThumbsUp className="w-4 h-4" /> Helpful
                  </button>
                  <button 
                    onClick={() => setHelpful(false)}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border transition-all font-black text-xs uppercase tracking-widest ${helpful === false ? 'bg-rose-500 text-white border-rose-400' : 'bg-white text-gray-400 border-gray-100 hover:bg-rose-50'}`}
                  >
                    <ThumbsDown className="w-4 h-4" /> Not Helpful
                  </button>
                </div>
              </div>

              <div className="card-premium p-10 bg-white shadow-soft flex flex-col">
                <h3 className="font-display font-black text-xl text-gray-900 uppercase tracking-tight mb-8">Discussion</h3>
                
                <div className="flex-1 space-y-6 overflow-y-auto max-h-[180px] mb-8 pr-2 custom-scrollbar">
                   {comments.map((c) => (
                     <div key={c.id} className="flex gap-4 group">
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-black text-gray-900 tracking-tight">{c.user}</span>
                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{c.time}</span>
                          </div>
                          <p className="text-sm text-gray-500 leading-relaxed">{c.text}</p>
                        </div>
                     </div>
                   ))}
                </div>

                <div className="relative mt-auto">
                  <input 
                    type="text" 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Ask a doubt..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-5 pl-6 pr-16 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 text-sm placeholder:text-gray-400 font-medium"
                  />
                  <button 
                    onClick={addComment}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-emerald-500 text-white rounded-xl shadow-lg flex items-center justify-center hover:bg-emerald-400 transition-all active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sticky Sidebar Info */}
          <div className="w-full lg:w-80 space-y-8 h-fit lg:sticky lg:top-28">
             <div className="card-premium p-8 bg-emerald-950 text-white border-none shadow-2xl relative overflow-hidden group text-center">
                <h4 className="text-lg font-black font-display uppercase tracking-tight mb-4">Accessibility</h4>
                <div className="flex items-center justify-center gap-4">
                  <AlertCircle className="w-8 h-8 text-emerald-400" />
                  <p className="text-xs text-emerald-200/50 font-bold uppercase tracking-widest">100% Accessible Resource</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
