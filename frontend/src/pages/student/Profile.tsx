import React, { useEffect, useMemo, useState } from 'react';
import { Camera, Save, LogOut, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { CourseRecord } from '../../types/api';

export const Profile: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState('');
  const [optedCourseIds, setOptedCourseIds] = useState<number[]>([]);
  const [allCourses, setAllCourses] = useState<CourseRecord[]>([]);
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    branch: '',
    course: '',
    year: '',
    avatar: '',
    college: '',
  });

  const optedCourseStorageKey = useMemo(() => {
    return `studentOptedCourseIds:${user?.email || 'guest'}`;
  }, [user?.email]);

  useEffect(() => {
    setProfileForm({
      name: user?.name || '',
      phone: user?.phone || '',
      branch: user?.branch || '',
      course: user?.course || '',
      year: user?.year || '',
      avatar: user?.avatar || '',
    });
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const loadMemberProfile = async () => {
      if (!user?.email) return;

      try {
        const result = user.memberId
          ? await api.getCollegeMemberById(user.memberId)
          : await api.lookupCollegeMemberByEmail(user.email);

        if (!isMounted || !result?.data) return;

        const member = result.data;

        // Extract college name from collegeEmail if available
        let collegeName = current.college || 'Your College Name';
        if (member.collegeEmail) {
          const domain = member.collegeEmail.split('@')[1] || '';
          collegeName = domain
            .replace(/\..*$/, '') // Remove TLD
            .replace(/[^a-zA-Z0-9]/g, ' ') // Replace non-alphanum with space
            .replace(/(^|\s)\S/g, (l) => l.toUpperCase()) // Capitalize words
            .trim();
        }
        setProfileForm((current) => ({
          ...current,
          name: member.name || current.name,
          phone: member.phone || '',
          branch: member.branch || '',
          course: member.course || '',
          year: member.year || '',
          avatar: member.avatar || current.avatar,
          college: collegeName,
        }));

        updateUser({
          memberId: member.id,
          name: member.name || user.name,
          phone: member.phone || '',
          branch: member.branch || '',
          course: member.course || '',
          year: member.year || '',
          regId: member.regId || user.regId,
          avatar: member.avatar || user.avatar,
        });
      } catch {
        // Fall back to auth-session values when member lookup fails.
      }
    };

    const loadCourses = async () => {
      try {
        const response = await api.getCourses('student');
        if (isMounted) {
          setAllCourses(response.data || []);
        }
      } catch {
        // Keep empty when API is not available.
      }
    };

    void loadMemberProfile();
    void loadCourses();

    return () => {
      isMounted = false;
    };
  }, [user?.email, user?.memberId]);

  useEffect(() => {
    if (!allCourses.length) return;

    const saved = localStorage.getItem(optedCourseStorageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value));
          setOptedCourseIds(normalized);
          return;
        }
      } catch {
        // Fall through to default values if storage is invalid.
      }
    }

    const normalizedCourse = (user?.course || '').toLowerCase();
    const seeded = allCourses
      .filter((course) => {
        if (!normalizedCourse) return false;
        return [course.title, course.topic, course.category]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedCourse));
      })
      .slice(0, 3)
      .map((course) => course.id);

    const fallbackSeed = seeded.length ? seeded : allCourses.slice(0, 2).map((course) => course.id);
    setOptedCourseIds(fallbackSeed);
    localStorage.setItem(optedCourseStorageKey, JSON.stringify(fallbackSeed));
  }, [allCourses, optedCourseStorageKey, user?.course]);

  const optedCourses = useMemo(() => {
    return allCourses.filter((course) => optedCourseIds.includes(course.id));
  }, [allCourses, optedCourseIds]);

  const suggestedCourses = useMemo(() => {
    return allCourses.filter((course) => !optedCourseIds.includes(course.id)).slice(0, 6);
  }, [allCourses, optedCourseIds]);

  const persistOptedCourses = (nextIds: number[]) => {
    setOptedCourseIds(nextIds);
    localStorage.setItem(optedCourseStorageKey, JSON.stringify(nextIds));
  };

  const addOptedCourse = (courseId: number) => {
    if (optedCourseIds.includes(courseId)) return;
    persistOptedCourses([...optedCourseIds, courseId]);
  };

  const removeOptedCourse = (courseId: number) => {
    persistOptedCourses(optedCourseIds.filter((id) => id !== courseId));
  };

  const handleProfileInputChange = (field: 'name' | 'phone' | 'branch' | 'course' | 'year', value: string) => {
    setProfileForm((current) => ({ ...current, [field]: value }));
  };

  const handleAvatarSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith('image/')) {
      setProfileStatus('Please select an image file.');
      return;
    }

    try {
      setProfileStatus('Uploading image...');
      const uploadResponse = await api.uploadProfileImage(selectedFile);
      const cloudUrl = String(uploadResponse?.data?.fileUrl || '').trim();

      if (!cloudUrl) {
        setProfileStatus('Image upload failed. Please try again.');
        return;
      }

      setProfileForm((current) => ({
        ...current,
        avatar: cloudUrl,
      }));
      setProfileStatus('Profile image uploaded. Click Save profile to apply.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Image upload failed. Please try again.';
      setProfileStatus(message || 'Image upload failed. Please try again.');
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSavingProfile(true);
    setProfileStatus('');

    const updates = {
      name: profileForm.name.trim(),
      phone: profileForm.phone.trim(),
      branch: profileForm.branch.trim(),
      course: profileForm.course.trim(),
      year: profileForm.year.trim(),
      avatar: profileForm.avatar,
    };

    let backendUpdated = false;
    let memberIdForUpdate = user.memberId;

    if (!user.memberId && user.email) {
      try {
        const lookup = await api.lookupCollegeMemberByEmail(user.email);
        if (lookup?.data?.id) {
          updateUser({ memberId: lookup.data.id, regId: lookup.data.regId || user.regId });
          memberIdForUpdate = lookup.data.id;
        }
      } catch {
        // Continue with local save if lookup fails.
      }
    }

    if (memberIdForUpdate) {
      try {
        await api.updateCollegeMember(memberIdForUpdate, {
          name: updates.name,
          phone: updates.phone,
          branch: updates.branch,
          course: updates.course,
          year: updates.year,
          avatar: updates.avatar,
        });
        backendUpdated = true;
      } catch {
        backendUpdated = false;
      }
    }

    updateUser(updates);
    setSavingProfile(false);

    if (backendUpdated) {
      setProfileStatus('Profile saved successfully.');
      return;
    }

    setProfileStatus('Profile saved locally. Some fields could not sync to backend.');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <section className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-3 bg-white border border-gray-100 rounded-3xl p-6 shadow-soft">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">My Profile</h1>
                <p className="text-sm text-gray-500 font-medium mt-1">Update your details and profile image shown across the student panel.</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-black text-[10px] uppercase tracking-widest transition-all"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="shrink-0">
                <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-emerald-100 shadow-soft bg-gray-50">
                  <img
                    src={user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'}
                    alt={profileForm.name || 'Student profile'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <label className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold cursor-pointer hover:bg-emerald-100 transition-all">
                  <Camera className="w-4 h-4" />
                  Upload Image
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarSelection} />
                </label>
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  College
                  <input
                    value={profileForm.college || 'Your College Name'}
                    readOnly
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-600"
                  />
                </label>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Name
                  <input
                    value={profileForm.name}
                    onChange={(event) => handleProfileInputChange('name', event.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </label>

                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Phone
                  <input
                    value={profileForm.phone}
                    onChange={(event) => handleProfileInputChange('phone', event.target.value)}
                    placeholder="Enter phone number"
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </label>

                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Email
                  <input
                    value={user?.email || ''}
                    readOnly
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-600"
                  />
                </label>

                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Registration ID
                  <input
                    value={user?.regId || ''}
                    readOnly
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-600"
                  />
                </label>

                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Branch
                  <input
                    value={profileForm.branch}
                    onChange={(event) => handleProfileInputChange('branch', event.target.value)}
                    placeholder="CSE / ECE / MECH"
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </label>

                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Year
                  <input
                    value={profileForm.year}
                    onChange={(event) => handleProfileInputChange('year', event.target.value)}
                    placeholder="1st / 2nd / 3rd / 4th"
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </label>

                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest sm:col-span-2">
                  Course
                  <input
                    value={profileForm.course}
                    onChange={(event) => handleProfileInputChange('course', event.target.value)}
                    placeholder="Your primary enrolled course"
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                <Save className="w-4 h-4" />
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
              {profileStatus && <p className="text-sm font-semibold text-gray-600">{profileStatus}</p>}
            </div>
          </div>

          <div className="xl:col-span-2 bg-white border border-gray-100 rounded-3xl p-6 shadow-soft">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">My Opted Courses</h2>
            <p className="text-sm text-gray-500 font-medium mt-1 mb-4">Manage courses you have opted into from this profile page.</p>

            <div className="space-y-2 mb-5 max-h-56 overflow-auto pr-1">
              {optedCourses.length > 0 ? (
                optedCourses.map((course) => (
                  <div key={course.id} className="flex items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                    <div>
                      <p className="text-sm font-bold text-emerald-900">{course.title}</p>
                      <p className="text-[11px] font-semibold text-emerald-700">{course.category} {course.topic ? `- ${course.topic}` : ''}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOptedCourse(course.id)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-white transition-all"
                      aria-label={`Remove ${course.title}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm font-semibold text-gray-500">
                  No opted courses yet. Add from suggestions below.
                </div>
              )}
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Other Courses</p>
              <div className="space-y-2">
                {suggestedCourses.map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => addOptedCourse(course.id)}
                    className="w-full flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 hover:border-emerald-200 hover:bg-emerald-50 transition-all"
                  >
                    <span className="text-left">
                      <span className="block text-sm font-bold text-gray-800">{course.title}</span>
                      <span className="block text-[11px] font-semibold text-gray-500">{course.category}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-emerald-600">
                      <Plus className="w-3.5 h-3.5" /> Add
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
