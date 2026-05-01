import React from 'react';
import { Star, Clock, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CourseCardProps {
  id?: number;
  title: string;
  description: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  rating: number;
  reviews: string;
  price: string;
  image: string;
  badge?: string;
  accessibilityTags?: string[];
  teacherName?: string;
  progress?: number;
  isEnrolled?: boolean;
  onEnroll?: () => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({ 
  id, title, description, category, difficulty, rating, reviews, price, image, badge, accessibilityTags, teacherName, progress, isEnrolled, onEnroll
}) => {
  const navigate = useNavigate();
  
  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Beginner': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Intermediate': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Advanced': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  return (
    <div className="card-premium group cursor-pointer overflow-hidden h-full flex flex-col" onClick={() => navigate(id ? `/courses/${id}` : '/courses')}>
      <div className="relative h-48 overflow-hidden">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        {badge && (
          <span className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg ${
            badge === 'Popular' ? 'bg-emerald-500' : badge === 'Trending' ? 'bg-blue-500' : 'bg-orange-500'
          }`}>
            {badge}
          </span>
        )}
      </div>
      
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
            {category}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${getDifficultyColor(difficulty)}`}>
            {difficulty}
          </span>
        </div>
        
        <h3 className="font-display font-bold mb-2 line-clamp-2 hover:text-emerald-600 transition-colors" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>

        <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed">
          {description}
        </p>

        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Teacher</p>
          <p className="text-xs font-bold mt-1 truncate" style={{ color: 'var(--text-primary)' }}>{teacherName || 'Teacher'}</p>
        </div>

        {typeof progress === 'number' && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
              <span>Progress</span>
              <span>{Math.max(0, Math.min(100, Math.round(progress)))}%</span>
            </div>
            <div className="h-2 mt-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
              <div className="h-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, Math.round(progress)))}%` }} />
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-1 mb-4 mt-auto">
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
          <span className="text-xs font-bold text-gray-700">{rating}</span>
          <span className="text-[10px] text-gray-400">({reviews})</span>
          
          <div className="ml-auto flex gap-1">
            {accessibilityTags?.map((tag, idx) => (
              <span key={idx} className="w-5 h-5 bg-gray-50 rounded-md flex items-center justify-center text-[10px] text-gray-400 border border-gray-100" title={tag}>
                {tag === 'TTS' ? '🔊' : tag === 'Captions' ? 'CC' : '♿'}
              </span>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t" style={{ borderTopColor: 'var(--border-color)' }}>
          <span className="text-lg font-bold text-emerald-600 font-display">{price}</span>
          <div className="flex items-center gap-2">
            {!isEnrolled && onEnroll && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEnroll();
                }}
                className="px-2.5 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-sm text-[10px] font-black uppercase tracking-widest"
                title="Enroll in this course"
              >
                Enroll
              </button>
            )}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                navigate('/messages');
              }}
              className="p-2 bg-emerald-50 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm group/msg"
              title="Ask a Doubt"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(id ? `/courses/${id}` : '/courses');
              }}
              className="text-sm font-bold flex items-center gap-1 group-hover/btn:text-emerald-500 transition-colors group/btn"
              style={{ color: 'var(--text-primary)' }}
            >
              View
              <Clock className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
