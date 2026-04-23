// Resources.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { FileText, Download, Search, Link as LinkIcon, Video, FileQuestion, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../../services/api';
import type { ResourceRecord } from '../../types/api';

const typeIcons = {
  document: <FileText className="w-6 h-6" />,
  video: <Video className="w-6 h-6" />,
  link: <LinkIcon className="w-6 h-6" />,
  other: <FileQuestion className="w-6 h-6" />,
};

const ResourceCard: React.FC<{ resource: ResourceRecord, index: number }> = ({ resource, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="card-premium p-8 group border-t-4 border-t-emerald-500 hover:shadow-premium transition-all"
    >
      <div className="flex items-start justify-between mb-6">
        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-emerald-500 border border-gray-100 group-hover:bg-white transition-all group-hover:scale-110">
          {typeIcons[resource.type]}
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
          {resource.course === 'All' ? 'General' : resource.course}
        </span>
      </div>

      <h3 className="text-xl font-black text-gray-900 mb-2 group-hover:text-emerald-500 transition-colors leading-tight">
        {resource.title}
      </h3>
      <p className="text-xs text-gray-500 font-medium mb-6 line-clamp-2 min-h-[32px]">
        {resource.description || 'No description provided'}
      </p>

      <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Added On</span>
          <span className="text-xs font-bold text-gray-700">
            {resource.createdAt ? new Date(resource.createdAt).toLocaleDateString() : 'N/A'}
          </span>
        </div>
        <a 
          href={resource.type === 'link' || resource.type === 'video' ? resource.linkUrl : resource.fileUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="p-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
        >
          {resource.type === 'link' || resource.type === 'video' ? <ExternalLink className="w-4 h-4" /> : <Download className="w-4 h-4" />}
        </a>
      </div>
    </motion.div>
  );
};

export const Resources: React.FC = () => {
  const [resources, setResources] = useState<ResourceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadResources = async () => {
      try {
        setLoading(true);
        // In a real app, we'd get the student's course and pass it here
        const response = await api.getResources();
        setResources(response.data);
      } catch (error) {
        console.error('Failed to load resources', error);
      } finally {
        setLoading(false);
      }
    };
    void loadResources();
  }, []);

  const filteredResources = useMemo(() => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return resources;
    return resources.filter(r => 
      r.title.toLowerCase().includes(term) || 
      r.course.toLowerCase().includes(term) ||
      r.type.toLowerCase().includes(term)
    );
  }, [resources, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
        <div>
          <h1 className="text-4xl font-black text-gray-900 font-display tracking-tight uppercase mb-2">Resource Library</h1>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest bg-gray-50 inline-block px-3 py-1 rounded-lg">
            Access study materials, lecture notes, and templates
          </p>
        </div>
        <div className="relative group w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search library..." 
            className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold shadow-soft focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none"
          />
        </div>
      </header>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-gray-50 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="card-premium p-20 text-center flex flex-col items-center gap-6">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
            <Search className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight">No resources found</h3>
            <p className="text-sm text-gray-400 font-medium">Try broadening your search or check back later</p>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredResources.map((res, idx) => (
            <ResourceCard key={res.id} resource={res} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
};
