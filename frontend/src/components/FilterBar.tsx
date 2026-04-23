import React from 'react';
import { Filter, ChevronDown, Check, X, Accessibility, Tag, Hash } from 'lucide-react';

interface FilterBarProps {
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  activeDifficulty: string;
  setActiveDifficulty: (diff: string) => void;
  activeTopic: string;
  setActiveTopic: (topic: string) => void;
  a11yOnly: boolean;
  setA11yOnly: (val: boolean) => void;
  onClear: () => void;
  categories?: string[];
  topics?: string[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  activeCategory, setActiveCategory,
  activeDifficulty, setActiveDifficulty,
  activeTopic, setActiveTopic,
  a11yOnly, setA11yOnly,
  onClear,
  categories = [],
  topics = []
}) => {
  const allCategories = ['All', ...categories];
  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];
  const allTopics = ['All', ...topics];

  return (
    <div className="flex flex-col gap-4 mb-10 bg-white p-5 rounded-premium border border-gray-100 shadow-soft">
      <div className="flex flex-wrap items-center gap-3">
        {/* Category Filter */}
        <div className="relative group">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 rounded-2xl text-xs font-black text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-transparent hover:border-emerald-100 uppercase tracking-widest">
            <Tag className="w-3.5 h-3.5" />
            {activeCategory === 'All' ? 'Category' : activeCategory}
            <ChevronDown className="w-4 h-4 opacity-50" />
          </button>
          <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-premium border border-gray-100 py-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-40 transform origin-top scale-95 group-hover:scale-100">
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center justify-between w-full px-5 py-2 text-xs font-bold hover:bg-emerald-50 hover:text-emerald-600 transition-all ${activeCategory === cat ? 'text-emerald-600 bg-emerald-50/50' : 'text-gray-500'}`}
              >
                {cat}
                {activeCategory === cat && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>

        {/* Topic Filter */}
        <div className="relative group">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 rounded-2xl text-xs font-black text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-transparent hover:border-emerald-100 uppercase tracking-widest">
            <Hash className="w-3.5 h-3.5" />
            {activeTopic === 'All' ? 'Topic' : activeTopic}
            <ChevronDown className="w-4 h-4 opacity-50" />
          </button>
          <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-premium border border-gray-100 py-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-40 transform origin-top scale-95 group-hover:scale-100">
            {allTopics.map((topic) => (
              <button
                key={topic}
                onClick={() => setActiveTopic(topic)}
                className={`flex items-center justify-between w-full px-5 py-2 text-xs font-bold hover:bg-emerald-50 hover:text-emerald-600 transition-all ${activeTopic === topic ? 'text-emerald-600 bg-emerald-50/50' : 'text-gray-500'}`}
              >
                {topic}
                {activeTopic === topic && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty Filter */}
        <div className="relative group">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 rounded-2xl text-xs font-black text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-transparent hover:border-emerald-100 uppercase tracking-widest">
            <Filter className="w-3.5 h-3.5" />
            {activeDifficulty === 'All' ? 'Difficulty' : activeDifficulty}
            <ChevronDown className="w-4 h-4 opacity-50" />
          </button>
          <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-premium border border-gray-100 py-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-40 transform origin-top scale-95 group-hover:scale-100">
            {difficulties.map((diff) => (
              <button
                key={diff}
                onClick={() => setActiveDifficulty(diff)}
                className={`flex items-center justify-between w-full px-5 py-2 text-xs font-bold hover:bg-emerald-50 hover:text-emerald-600 transition-all ${activeDifficulty === diff ? 'text-emerald-600 bg-emerald-50/50' : 'text-gray-500'}`}
              >
                {diff}
                {activeDifficulty === diff && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>

        <div className="h-6 w-px bg-gray-100 mx-2 hidden sm:block"></div>

        {/* Accessibility Toggle */}
        <button 
          onClick={() => setA11yOnly(!a11yOnly)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all border uppercase tracking-widest ${a11yOnly ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20' : 'bg-gray-50 text-gray-700 border-transparent hover:bg-emerald-50 hover:text-emerald-600'}`}
        >
          <Accessibility className="w-4 h-4" />
          A11y Support
          {a11yOnly && <Check className="w-4 h-4 ml-1" />}
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-gray-50 pt-4 mt-2">
         <div className="flex gap-2">
           {activeCategory !== 'All' && <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-lg border border-emerald-100">{activeCategory}</span>}
           {activeTopic !== 'All' && <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded-lg border border-blue-100">{activeTopic}</span>}
           {activeDifficulty !== 'All' && <span className="px-3 py-1 bg-rose-50 text-rose-600 text-[10px] font-black uppercase rounded-lg border border-rose-100">{activeDifficulty}</span>}
         </div>
         {(activeCategory !== 'All' || activeDifficulty !== 'All' || activeTopic !== 'All' || a11yOnly) && (
            <button 
              onClick={onClear}
              className="text-[10px] font-black text-gray-400 hover:text-rose-500 flex items-center gap-1 transition-all uppercase tracking-widest"
            >
              Clear All <X className="w-3.5 h-3.5" />
            </button>
         )}
      </div>
    </div>
  );
};
