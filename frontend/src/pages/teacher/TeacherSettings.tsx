// TeacherSettings.tsx
import React, { useState, useEffect, useState as useReactState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Bell, Lock, Mail, Camera, Save } from 'lucide-react';
import { cn } from '../../utils/cn';

const tabs = [
  { id: 'profile', icon: User, label: 'Profile Settings' },
  { id: 'security', icon: Lock, label: 'Security & Access' },
  { id: 'notifications', icon: Bell, label: 'Notifications' },
];

export const TeacherSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState('profile');
    const { user } = useAuth();
    const [collegeName, setCollegeName] = useReactState('Your College Name');

    useEffect(() => {
        if (user && user.email) {
            // Try to extract college name from collegeEmail if available
            // Assume collegeEmail is available in user or fallback to email
            const collegeEmail = user.collegeEmail || user.email;
            if (collegeEmail && collegeEmail.includes('@')) {
                const domain = collegeEmail.split('@')[1] || '';
                const name = domain
                    .replace(/\..*$/, '')
                    .replace(/[^a-zA-Z0-9]/g, ' ')
                    .replace(/(^|\s)\S/g, (l) => l.toUpperCase())
                    .trim();
                setCollegeName(name);
            }
        }
    }, [user]);

    return (
        <div className="space-y-12 animate-in fade-in duration-500 max-w-4xl">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display mb-1 uppercase tracking-tight">Account Settings</h1>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Manage your profile, security, and preferences</p>
                </div>
            </header>

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-4 p-2 bg-white border border-gray-100 rounded-3xl shadow-soft">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center gap-3 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
                            activeTab === tab.id ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-gray-400 hover:text-emerald-500 hover:bg-emerald-50"
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Profile Section */}
            {activeTab === 'profile' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col items-center gap-6">
                        <div className="relative group">
                            <div className="w-40 h-40 rounded-[2.5rem] bg-emerald-50 overflow-hidden border-4 border-white shadow-premium group-hover:border-emerald-100 transition-all">
                                <img src={user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop'} alt="Profile" className="w-full h-full object-cover" />
                            </div>
                            <button className="absolute -bottom-4 -right-4 p-4 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20 hover:scale-110 active:scale-90 transition-all border-4 border-[#fcfdfe]">
                                <Camera className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-black text-gray-900 font-display uppercase tracking-tight">{user?.name || 'Teacher Profile'}</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                                {user?.role === 'teacher' ? 'Educator' : user?.role || 'Staff'} • {user?.branch || 'General'}
                            </p>
                        </div>
                    </div>

                    <div className="md:col-span-2 space-y-10">
                        <div className="card-premium p-10 space-y-8">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block ml-1">Full Name</label>
                                    <input type="text" defaultValue={user?.name || ''} className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold shadow-inner focus:ring-4 focus:ring-emerald-500/5 transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block ml-1">Professional Title</label>
                                    <input type="text" defaultValue={user?.branch ? `${user.branch} Faculty` : 'Instructor'} className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold shadow-inner focus:ring-4 focus:ring-emerald-500/5 transition-all" />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block ml-1">College</label>
                                    <input type="text" value={collegeName} readOnly className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold shadow-inner text-gray-600 focus:ring-4 focus:ring-emerald-500/5 transition-all" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block ml-1">Institutional Email</label>
                                <div className="relative group">
                                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-emerald-500 transition-colors" />
                                    <input type="email" defaultValue={user?.email || ''} readOnly className="w-full bg-gray-50 border-none rounded-2xl pl-14 pr-6 py-4 text-sm font-bold shadow-inner focus:ring-4 focus:ring-emerald-500/5 transition-all cursor-not-allowed opacity-70" />
                                </div>
                            </div>
                             <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block ml-1">Bio / About Me</label>
                                <textarea className="w-full bg-gray-50 border-none rounded-[1.5rem] px-6 py-4 text-sm font-bold shadow-inner focus:ring-4 focus:ring-emerald-500/5 transition-all min-h-[120px] resize-none" defaultValue={`Dedicated educator in the ${user?.branch || 'teaching'} department. Community focused and student driven.`}></textarea>
                            </div>
                        </div>

                        <div className="flex justify-end gap-6 pb-20">
                            <button className="text-xs font-black uppercase text-gray-400 hover:text-gray-900 transition-all">Reset Changes</button>
                            <button className="bg-emerald-500 text-white px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group">
                                <Save className="w-4 h-4 group-hover:animate-bounce" />
                                Save Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
