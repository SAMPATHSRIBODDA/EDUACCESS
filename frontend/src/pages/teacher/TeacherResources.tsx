// TeacherResources.tsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { FileText, Plus, Search, Trash2, X, CheckCircle2, Link as LinkIcon, Video, FileQuestion, Upload } from 'lucide-react';

import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { ResourceRecord, CourseRecord, ResourceInput } from '../../types/api';

const typeIcons = {
  document: <FileText className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />,
  link: <LinkIcon className="w-4 h-4" />,
  other: <FileQuestion className="w-4 h-4" />,
};

export const TeacherResources: React.FC = () => {
  const { user } = useAuth();
  const teacherEmail = String(user?.email || '').toLowerCase();

  const [resources, setResources] = useState<ResourceRecord[]>([]);
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploader, setShowUploader] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [form, setForm] = useState<ResourceInput>({
    title: '',
    description: '',
    type: 'document',
    fileUrl: '',
    linkUrl: '',
    fileName: '',
    fileSize: '',
    course: 'All',
    status: 'active'
  });

  const loadData = async () => {
    try {
      const [resResponse, courseResponse] = await Promise.all([
        api.getResources(teacherEmail, undefined, user?.collegeEmail),
        api.getCourses('teacher')
      ]);
      setResources(resResponse.data);
      setCourses(courseResponse.data);
    } catch (error) {
      console.error('Failed to load resources', error);
    }
  };

  useEffect(() => {
    void loadData();
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFormError('File size exceeds 5MB limit');
        return;
      }
      setSelectedFile(file);
      setForm(prev => ({ ...prev, title: prev.title || file.name.split('.')[0] }));
      setFormError('');
    }
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.title.trim()) {
      setFormError('Title is required');
      return;
    }

    // Validation based on type
    if (form.type === 'link' || form.type === 'video') {
      if (!form.linkUrl?.trim()) {
        setFormError('Link URL is required');
        return;
      }
    } else {
      if (!selectedFile && !form.fileUrl?.trim()) {
        setFormError('Please select a file or provide a URL');
        return;
      }
    }

    try {
      setSaving(true);
      let finalForm = { 
        ...form, 
        teacherEmail,
        collegeEmail: user?.collegeEmail || ''
      };

      // If a local file is selected, upload it first
      if (selectedFile && (form.type === 'document' || form.type === 'other')) {
        const uploadRes = await api.uploadResourceFile(selectedFile);
        finalForm.fileUrl = uploadRes.data.fileUrl;
        finalForm.fileName = uploadRes.data.fileName;
        finalForm.fileSize = uploadRes.data.fileSize;
      }

      await api.createResource(finalForm);
      await loadData();
      setShowUploader(false);
      resetForm();
    } catch (error) {
      setFormError('Failed to save resource. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      type: 'document',
      fileUrl: '',
      linkUrl: '',
      fileName: '',
      fileSize: '',
      course: 'All',
      status: 'active'
    });
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`Delete resource "${title}"?`)) return;
    try {
      await api.deleteResource(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete resource', error);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display mb-1 uppercase">Resources Hub</h1>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Managing {resources.length} educational assets</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowUploader(true);
          }}
          className="bg-emerald-500 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-center flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Resource
        </button>
      </header>

      <div className="bg-white border border-gray-50 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-soft">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search resources by title, course, or type..."
          className="w-full outline-none bg-transparent text-sm font-semibold"
        />
      </div>

      <div className="card-premium overflow-hidden border-none shadow-premium bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="py-5 px-8 text-[10px] font-black uppercase text-gray-400 tracking-widest">Resource Name</th>
              <th className="py-5 px-8 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Type</th>
              <th className="py-5 px-8 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Course</th>
              <th className="py-5 px-8 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Added On</th>
              <th className="py-5 px-12 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredResources.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400 font-black uppercase text-xs tracking-widest">No resources found</td>
              </tr>
            ) : (
              filteredResources.map((res) => (
                <tr key={res.id} className="group hover:bg-emerald-50/20 transition-all cursor-pointer">
                  <td className="py-5 px-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center border border-gray-100 transition-transform group-hover:scale-105">
                        {typeIcons[res.type]}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-gray-900 group-hover:text-emerald-500 transition-colors">{res.title}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase truncate max-w-[200px]">{res.description || 'No description'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-8 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">{res.type}</td>
                  <td className="py-5 px-8 text-center text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50/50 rounded-lg">{res.course}</td>
                  <td className="py-5 px-8 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {res.createdAt ? new Date(res.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-5 px-12 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDelete(res.id, res.title)}
                        className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-rose-500 transition-all shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showUploader && (
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm overflow-y-auto p-4 md:p-8">
          <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-gray-200 shadow-xl p-5 md:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Add New Resource</h2>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-1">Upload files or share links with your students</p>
              </div>
              <button onClick={() => setShowUploader(false)} className="w-10 h-10 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50">
                <X className="w-5 h-5 mx-auto" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Type</p>
                  <select
                    value={form.type}
                    onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value as any, fileName: '', fileSize: '', fileUrl: '', linkUrl: '' }))}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold"
                  >
                    <option value="document">Document (PDF/DOC)</option>
                    <option value="video">Video Link</option>
                    <option value="link">External Link</option>
                    <option value="other">Other Material</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Visible To</p>
                  <select
                    value={form.course}
                    onChange={(e) => setForm(prev => ({ ...prev, course: e.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold"
                  >
                    <option value="All">All My Students</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.title}>{c.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Resource Title</p>
                <input
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Lecture Notes - Unit 1"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold"
                />
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Description (Optional)</p>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What is this resource about?"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold min-h-[80px]"
                />
              </div>

              {(form.type === 'document' || form.type === 'other') && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">File Upload</p>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-100 rounded-3xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-emerald-500/20 hover:bg-emerald-50/10 transition-all group"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-emerald-500 transition-colors">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black text-gray-900">{selectedFile ? selectedFile.name : 'Click to select file'}</p>
                      <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-1">
                        {selectedFile ? `(${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)` : 'Max file size: 5MB'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {(form.type === 'link' || form.type === 'video') && (
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">URL / Link</p>
                  <div className="relative">
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={form.linkUrl}
                      onChange={(e) => setForm(prev => ({ ...prev, linkUrl: e.target.value }))}
                      placeholder="https://..."
                      className="w-full rounded-2xl border border-gray-200 pl-12 pr-4 py-3 text-sm font-semibold"
                    />
                  </div>
                </div>
              )}
            </div>

            {formError && <p className="text-sm font-semibold text-rose-600 px-1">{formError}</p>}

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setShowUploader(false)}
                className="px-6 py-3 rounded-2xl border border-gray-200 text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all font-display"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-emerald-500 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 font-display"
              >
                {saving ? 'Uploading...' : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Save Resource
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
