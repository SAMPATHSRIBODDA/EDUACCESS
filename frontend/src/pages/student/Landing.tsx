import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, ShieldCheck, 
  Users, School, GraduationCap, X, Globe, Sparkles 
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

declare global {
  interface Window {
    google?: any;
  }
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: 'Student' | 'Teacher' | 'University' | null;
}

type CollegeApplicationForm = {
  collegeName: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  website: string;
  city: string;
  state: string;
  country: string;
  affiliation: string;
  programs: string;
  students: string;
  facilities: string;
  summary: string;
};

const defaultCollegeApplicationForm = (): CollegeApplicationForm => ({
  collegeName: '',
  ownerName: '',
  ownerEmail: '',
  phone: '',
  website: '',
  city: '',
  state: '',
  country: 'India',
  affiliation: '',
  programs: '',
  students: '',
  facilities: '',
  summary: '',
});

const resolveApiBase = () => {
  const configured = String(import.meta.env.VITE_API_BASE_URL || '').trim();
  const fallback = 'http://localhost:5000/api';
  const base = configured || fallback;
  const sanitized = base.replace(/\/+$/, '');
  return sanitized.endsWith('/api') ? sanitized : `${sanitized}/api`;
};

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, role }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState('');
  const [universityStep, setUniversityStep] = useState(0);
  const [universityIdentity, setUniversityIdentity] = useState({ name: '', email: '' });
  const [collegeForm, setCollegeForm] = useState<CollegeApplicationForm>(defaultCollegeApplicationForm());
  const [applicationStatus, setApplicationStatus] = useState<{ loading: boolean; message: string; submitted: boolean }>({
    loading: false,
    message: '',
    submitted: false,
  });
  const { login } = useAuth();

  const goToAdminPanel = () => {
    // Open dedicated college admin panel.
    window.location.assign('/src/pages/admin/clg-admin/clg-admin.html');
  };

  const goToSuperAdminPanel = () => {
    // Open dedicated super admin login page.
    window.location.assign('/super-admin-login.html');
  };

  const decodeGoogleCredential = (credential: string) => {
    try {
      const payload = credential.split('.')[1];
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
      const decoded = JSON.parse(atob(padded));
      return {
        email: String(decoded.email || ''),
        name: String(decoded.name || ''),
      };
    } catch {
      return { email: '', name: '' };
    }
  };

  const checkCollegeOwnerAccess = async (email: string) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return { allowed: false, user: null };

    try {
      const apiBase = resolveApiBase();
      const response = await fetch(`${apiBase}/auth/college-owner-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.allowed) {
        return { allowed: false, user: null };
      }

      return { allowed: true, user: data.user || null };
    } catch {
      return { allowed: false, user: null };
    }
  };

  const handleGoogleCredential = async (response: { credential?: string }) => {
    if (!response?.credential) return;

    if (role === 'University') {
      const profile = decodeGoogleCredential(response.credential);

      try {
        setIsAuthenticating(true);
        setAuthError('');

        const apiBase = resolveApiBase();
        const authResponse = await fetch(`${apiBase}/auth/google-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            googleToken: response.credential,
          }),
        });

        const data = await authResponse.json().catch(() => null);

        if (authResponse.ok && data?.authorized && data?.user?.role === 'college') {
          login(data.user, data.token);
          onClose();
          goToAdminPanel();
          return;
        }

        const collegeAccess = await checkCollegeOwnerAccess(profile.email);
        if (collegeAccess.allowed && collegeAccess.user) {
          login(collegeAccess.user, response.credential);
          onClose();
          goToAdminPanel();
          return;
        }

        setUniversityIdentity(profile);
        setUniversityStep(1);
        setCollegeForm((current) => ({
          ...current,
          ownerEmail: profile.email,
          ownerName: profile.name,
        }));
      } catch {
        const collegeAccess = await checkCollegeOwnerAccess(profile.email);
        if (collegeAccess.allowed && collegeAccess.user) {
          login(collegeAccess.user, response.credential);
          onClose();
          goToAdminPanel();
          return;
        }

        setUniversityIdentity(profile);
        setUniversityStep(1);
        setCollegeForm((current) => ({
          ...current,
          ownerEmail: profile.email,
          ownerName: profile.name,
        }));
      } finally {
        setIsAuthenticating(false);
      }

      setAuthError('');
      return;
    }

    try {
      setIsAuthenticating(true);
      setAuthError('');

      const apiBase = resolveApiBase();
      const authResponse = await fetch(`${apiBase}/auth/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleToken: response.credential,
        }),
      });

      const data = await authResponse.json().catch(() => null);
      if (!authResponse.ok || !data?.authorized) {
        throw new Error(data?.message || 'Google sign-in failed');
      }

      login(data.user, data.token);
      onClose();

      if (data.user.role === 'teacher') {
        window.location.assign('/teacher/dashboard');
        return;
      }
      if (data.user.role === 'college') {
        goToAdminPanel();
        return;
      }
      window.location.assign('/dashboard');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign in');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleCollegeApplicationSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setApplicationStatus({ loading: true, message: '', submitted: false });
      setAuthError('');

      const apiBase = resolveApiBase();
      const response = await fetch(`${apiBase}/super-admin/college-applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collegeName: collegeForm.collegeName,
          ownerName: collegeForm.ownerName || universityIdentity.name,
          ownerEmail: collegeForm.ownerEmail || universityIdentity.email,
          phone: collegeForm.phone,
          website: collegeForm.website,
          city: collegeForm.city,
          state: collegeForm.state,
          country: collegeForm.country,
          affiliation: collegeForm.affiliation,
          programs: collegeForm.programs,
          students: collegeForm.students,
          facilities: collegeForm.facilities,
          summary: collegeForm.summary,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to submit application');
      }

      setApplicationStatus({
        loading: false,
        submitted: true,
        message: 'Submitted for super admin approval.',
      });
      setUniversityStep(5);
    } catch (error) {
      setApplicationStatus({ loading: false, message: '', submitted: false });
      setAuthError(error instanceof Error ? error.message : 'Unable to submit application');
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    let retryTimer: number | undefined;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setAuthError('Google sign-in is not configured yet. Please add VITE_GOOGLE_CLIENT_ID.');
      return;
    }

    const shouldRenderButton = role !== 'University' || universityStep === 0;
    if (!shouldRenderButton) return;

    const renderGoogleButton = (attempt = 0) => {
      if (cancelled) return;

      if (!window.google?.accounts?.id) {
        if (attempt < 20) {
          retryTimer = window.setTimeout(() => renderGoogleButton(attempt + 1), 120);
        }
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredential,
      });

      const container = document.getElementById('landing-google-signin');
      if (container) {
        container.innerHTML = '';
        window.google.accounts.id.renderButton(container, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
          shape: 'pill',
        });
      }
    };

    const existingScript = document.getElementById('google-gsi-script');
    if (existingScript) {
      renderGoogleButton();
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => renderGoogleButton();
    document.body.appendChild(script);

    return () => {
      cancelled = true;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [isOpen, role, universityStep]);

  useEffect(() => {
    if (!isOpen || role !== 'University') return;
    setUniversityStep(0);
    setUniversityIdentity({ name: '', email: '' });
    setCollegeForm(defaultCollegeApplicationForm());
    setApplicationStatus({ loading: false, message: '', submitted: false });
    setAuthError('');
  }, [isOpen, role]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 mb-12">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-emerald-950/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl relative z-10 border border-gray-100"
          >
            <div className="p-8 lg:p-12">
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:bg-gray-50 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-8">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${
                  role === 'Student' ? 'bg-emerald-500 text-white' : 
                  role === 'Teacher' ? 'bg-blue-500 text-white' : 'bg-gray-900 text-white'
                }`}>
                  {role === 'Student' ? <GraduationCap className="w-7 h-7" /> : 
                   role === 'Teacher' ? <Users className="w-7 h-7" /> : <School className="w-7 h-7" />}
                </div>
                <h2 className="text-2xl font-black text-gray-900 font-display tracking-tight leading-tight">
                  {role} Portal <br/> <span className="text-gray-400 font-bold text-lg leading-snug">Access your EduAccess workspace</span>
                </h2>
              </div>

              <div className="space-y-4">
                {role !== 'University' && (
                  <>
                    <p className="text-sm text-gray-500 font-semibold">Continue with your registered Google account.</p>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 flex justify-center">
                      <div id="landing-google-signin" />
                    </div>
                    {isAuthenticating && <p className="text-xs text-gray-500 font-semibold">Authenticating...</p>}
                    {authError && <p className="text-xs text-red-600 font-semibold">{authError}</p>}
                    <p className="text-[11px] text-gray-400 font-semibold">Only emails registered in college panel Students/Teachers are allowed.</p>
                  </>
                )}

                {role === 'University' && (
                  <form className="space-y-4 pt-4 border-t border-gray-50" onSubmit={handleCollegeApplicationSubmit}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">5-step college application</p>
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Step {Math.max(universityStep, 1)}/5</span>
                    </div>

                    {universityStep === 0 && (
                      <>
                        <p className="text-sm text-gray-500 font-semibold">Continue with Gmail to prefill the college owner account.</p>
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 flex justify-center">
                          <div id="landing-google-signin" />
                        </div>
                        <p className="text-[11px] text-gray-400 font-semibold">Use the Gmail account you want associated with this college application.</p>
                      </>
                    )}

                    {universityStep > 0 && (
                      <>
                        {applicationStatus.submitted ? (
                          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                            <p className="text-sm font-bold text-emerald-700">{applicationStatus.message}</p>
                            <a href="/super-admin-login.html?next=%2Fsuper-admin-panel.html%3Fsection%3Dapprovals" className="mt-3 inline-flex text-xs font-black uppercase tracking-widest text-emerald-600 hover:underline">
                              Open approval queue
                            </a>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="grid grid-cols-5 gap-2">
                              {[1, 2, 3, 4, 5].map((stepNumber) => (
                                <div key={stepNumber} className={`h-2 rounded-full ${universityStep >= stepNumber ? 'bg-emerald-500' : 'bg-gray-100'}`} />
                              ))}
                            </div>

                            {universityStep === 1 && (
                              <div className="space-y-3">
                                <input className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold" value={collegeForm.collegeName} onChange={(e) => setCollegeForm((p) => ({ ...p, collegeName: e.target.value }))} placeholder="College name" />
                                <input className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold" value={collegeForm.affiliation} onChange={(e) => setCollegeForm((p) => ({ ...p, affiliation: e.target.value }))} placeholder="Affiliation / board" />
                                <input className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold" value={collegeForm.website} onChange={(e) => setCollegeForm((p) => ({ ...p, website: e.target.value }))} placeholder="Website URL" />
                              </div>
                            )}

                            {universityStep === 2 && (
                              <div className="space-y-3">
                                <input className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold" value={collegeForm.ownerName || universityIdentity.name} onChange={(e) => setCollegeForm((p) => ({ ...p, ownerName: e.target.value }))} placeholder="Owner / contact name" />
                                <input className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold" value={collegeForm.ownerEmail || universityIdentity.email} disabled placeholder="Google email" />
                                <input className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold" value={collegeForm.phone} onChange={(e) => setCollegeForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Contact phone" />
                              </div>
                            )}

                            {universityStep === 3 && (
                              <div className="space-y-3">
                                <input className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold" value={collegeForm.city} onChange={(e) => setCollegeForm((p) => ({ ...p, city: e.target.value }))} placeholder="City" />
                                <input className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold" value={collegeForm.state} onChange={(e) => setCollegeForm((p) => ({ ...p, state: e.target.value }))} placeholder="State" />
                                <input className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold" value={collegeForm.country} onChange={(e) => setCollegeForm((p) => ({ ...p, country: e.target.value }))} placeholder="Country" />
                              </div>
                            )}

                            {universityStep === 4 && (
                              <div className="space-y-3">
                                <input className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold" value={collegeForm.programs} onChange={(e) => setCollegeForm((p) => ({ ...p, programs: e.target.value }))} placeholder="Programs offered" />
                                <input className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold" value={collegeForm.students} onChange={(e) => setCollegeForm((p) => ({ ...p, students: e.target.value }))} placeholder="Estimated students" />
                                <textarea className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold min-h-[90px]" value={collegeForm.facilities} onChange={(e) => setCollegeForm((p) => ({ ...p, facilities: e.target.value }))} placeholder="Facilities and infrastructure" />
                              </div>
                            )}

                            {universityStep === 5 && (
                              <div className="space-y-3">
                                <textarea className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold min-h-[100px]" value={collegeForm.summary} onChange={(e) => setCollegeForm((p) => ({ ...p, summary: e.target.value }))} placeholder="Short summary for approval team" />
                                <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 text-xs font-semibold text-gray-600 space-y-2">
                                  <p><strong>College:</strong> {collegeForm.collegeName || '-'}</p>
                                  <p><strong>Owner:</strong> {collegeForm.ownerName || universityIdentity.name || '-'}</p>
                                  <p><strong>Email:</strong> {collegeForm.ownerEmail || universityIdentity.email || '-'}</p>
                                  <p><strong>Location:</strong> {collegeForm.city || '-'}, {collegeForm.state || '-'}</p>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-3 pt-2">
                              <button type="button" className="px-4 py-3 rounded-xl border border-gray-100 text-sm font-black uppercase tracking-widest text-gray-500" onClick={() => setUniversityStep((step) => Math.max(1, step - 1))} disabled={universityStep === 1}>Back</button>
                              {universityStep < 5 ? (
                                <button type="button" className="px-4 py-3 rounded-xl bg-emerald-500 text-white text-sm font-black uppercase tracking-widest" onClick={() => setUniversityStep((step) => Math.min(5, step + 1))}>Next</button>
                              ) : (
                                <button type="submit" className="px-4 py-3 rounded-xl bg-blue-500 text-white text-sm font-black uppercase tracking-widest disabled:opacity-60" disabled={applicationStatus.loading}>
                                  {applicationStatus.loading ? 'Submitting...' : 'Submit for Approval'}
                                </button>
                              )}
                            </div>
                            {authError && <p className="text-xs text-red-600 font-semibold">{authError}</p>}
                          </div>
                        )}
                      </>
                    )}
                  </form>
                )}
              </div>
            </div>
            <div className="bg-gray-50 p-6 text-center border-t border-gray-100">
              <p className="text-xs text-gray-400 font-bold">New to EduAccess? <button className="text-emerald-600 hover:underline">Create institutional account</button></p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export const Landing: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<'Student' | 'Teacher' | 'University' | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCourses: 0,
    totalTeachers: 0,
    totalStudents: 0,
    satisfiedLearners: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await api.getLandingStats();
        setStats(res.data);
      } catch (err) {
        console.error('Failed to load landing stats', err);
      }
    };
    loadStats();
  }, []);

  const location = useLocation();

  const openLogin = (role: 'Student' | 'Teacher' | 'University') => {
    setSelectedRole(role);
    setIsLoginModalOpen(true);
  };

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const loginTarget = query.get('login');

    if (loginTarget === 'student') {
      openLogin('Student');
      return;
    }

    if (loginTarget === 'teacher') {
      openLogin('Teacher');
    }
  }, [location.search]);

  const roles = [
    {
      id: 'Student',
      title: 'For Students',
      description: 'Accessible learning guides, community discussions, and personalized progress tracking.',
      icon: <GraduationCap className="w-8 h-8" />,
      color: 'emerald',
      cta: 'Continue with Google'
    },
    {
      id: 'Teacher',
      title: 'For Teachers',
      description: 'Build inclusive content, manage student doubts, and analyze accessibility metrics.',
      icon: <Users className="w-8 h-8" />,
      color: 'blue',
      cta: 'Continue with Google'
    },
    {
      id: 'University',
      title: 'For Universities',
      description: 'Institutional reporting, global curriculum accessibility, and campus-wide statistics.',
      icon: <School className="w-8 h-8" />,
      color: 'slate',
      cta: 'Continue with Gmail'
    }
  ];

  return (
    <div className="bg-white min-h-screen overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 lg:pt-36 lg:pb-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-6 relative z-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100 text-emerald-600 font-black text-[10px] uppercase tracking-widest shadow-sm"
            >
              <Sparkles className="w-3 h-3" /> Standardizing Global Accessibility
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl lg:text-7xl font-black text-gray-900 font-display leading-[1.1] tracking-tight max-w-4xl mx-auto"
            >
              Accessible Learning for <span className="text-emerald-500">Everyone</span>, Everywhere.
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-gray-400 text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed font-medium"
            >
              Revolutionizing the digital education landscape with multi-modal learning tools, inclusive social hubs, and institutional transparency.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-3 pt-2"
            >
              <span className="px-4 py-2 rounded-full bg-white border border-gray-100 text-[11px] font-black text-gray-700 uppercase tracking-widest shadow-sm">WCAG 2.1 Ready</span>
              <span className="px-4 py-2 rounded-full bg-white border border-gray-100 text-[11px] font-black text-gray-700 uppercase tracking-widest shadow-sm">Google OAuth Access</span>
              <span className="px-4 py-2 rounded-full bg-white border border-gray-100 text-[11px] font-black text-gray-700 uppercase tracking-widest shadow-sm">Role-Based Dashboards</span>
            </motion.div>
            
          </div>
        </div>

        {/* Hero Decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-emerald-500/5 rounded-full blur-[120px] -z-0 -translate-y-1/2"></div>
      </section>

      {/* Roles Section */}
      <section className="py-16 bg-[#f8fafc] border-y border-gray-100 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Learners</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{stats.satisfiedLearners}+</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Educators</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{stats.totalTeachers}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Approved Courses</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{stats.totalCourses}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Accessibility Score</p>
              <p className="text-2xl font-black text-emerald-500 mt-1">98%</p>
            </div>
          </div>
          <div className="text-center mb-12 space-y-3">
             <h2 className="text-3xl lg:text-5xl font-black text-gray-900 font-display tracking-tight">Choose your workspace</h2>
             <p className="text-gray-400 font-bold uppercase text-[12px] tracking-[0.3em]">Institutional entry points below</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {roles.map((role) => (
              <motion.div 
                key={role.id}
                whileHover={{ y: -10 }}
                className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-soft hover:shadow-premium transition-all flex flex-col group h-full relative overflow-hidden"
              >
                <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-20 ${
                  role.color === 'emerald' ? 'bg-emerald-400' : role.color === 'blue' ? 'bg-blue-400' : 'bg-slate-400'
                }`} />
                <span className="inline-flex w-fit mb-4 px-3 py-1 rounded-full bg-gray-50 border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-500">{role.id} Access</span>
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-6 shadow-lg ${
                  role.color === 'emerald' ? 'bg-emerald-500 text-white' : 
                  role.color === 'blue' ? 'bg-blue-500 text-white' : 'bg-gray-900 text-white'
                } group-hover:scale-110 transition-transform`}>
                  {role.icon}
                </div>
                <h3 className="text-2xl font-black text-gray-900 font-display mb-3 tracking-tight leading-none">{role.title}</h3>
                <p className="text-gray-400 leading-relaxed font-medium mb-8 flex-1">{role.description}</p>
                <button 
                  onClick={() => openLogin(role.id as any)}
                  className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                    role.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white' : 
                    role.color === 'blue' ? 'bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white' : 'bg-gray-50 text-gray-900 hover:bg-gray-900 hover:text-white'
                  }`}
                >
                   {role.cta} <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Global Transparency */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 space-y-8 order-2 lg:order-1">
             <div className="w-16 h-1 bg-emerald-500 rounded-full"></div>
             <h2 className="text-4xl lg:text-6xl font-black text-gray-900 font-display tracking-tight leading-[1.1]">Built for Global <br/> Institutional Standards.</h2>
             <div className="grid sm:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-black text-gray-900 tracking-tight">Compliance Ready</h4>
                  <p className="text-sm text-gray-400 leading-relaxed font-medium">Fully WCAG 2.1 & Section 508 compliant framework for all digital assets.</p>
                </div>
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
                    <Globe className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-black text-gray-900 tracking-tight">Global Inclusivity</h4>
                  <p className="text-sm text-gray-400 leading-relaxed font-medium">Localized content support and adaptive accessibility features for every student.</p>
                </div>
             </div>
          </div>
          <div className="flex-1 order-1 lg:order-2">
             <div className="rounded-[3rem] overflow-hidden border-8 border-gray-50 shadow-2xl relative group">
                <img 
                  src="/inclusive_education.png" 
                  alt="Inclusive Collaboration"
                  className="w-full h-auto grayscale-[20%] group-hover:grayscale-0 transition-all duration-700 hover:scale-105"
                />
                <div className="absolute inset-0 bg-emerald-950/20"></div>
             </div>
          </div>
        </div>
      </section>

      {/* Login Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        role={selectedRole}
      />
    </div>
  );
};
