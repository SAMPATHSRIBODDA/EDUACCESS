import React from 'react';
import { Bell } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import type { AnnouncementRecord, EventRecord } from '../../types/api';

export const NotificationsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async () => {
      try {
        setLoading(true);
        const [announcementRes, eventRes] = await Promise.all([
          api.getAnnouncements('student'),
          api.getEvents('student'),
        ]);

        if (!isMounted) return;
        setAnnouncements(announcementRes.data || []);
        setEvents(eventRes.data || []);
      } catch {
        if (isMounted) {
          setAnnouncements([]);
          setEvents([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadNotifications();

    return () => {
      isMounted = false;
    };
  }, []);

  const items = useMemo(() => {
    const announcementItems = announcements.map((announcement) => ({
      id: `ann-${announcement.id}`,
      title: announcement.title,
      description: announcement.description,
      meta: announcement.date,
    }));

    const eventItems = events.map((event) => ({
      id: `evt-${event.id}`,
      title: event.name,
      description: `${event.location} • ${event.time}`,
      meta: event.date || 'Upcoming',
    }));

    return [...announcementItems, ...eventItems].slice(0, 20);
  }, [announcements, events]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
          <Bell className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 font-display tracking-tight">Notifications</h1>
      </div>
      
      <div className="space-y-4">
        {loading && (
          <div className="card-premium p-6 text-sm font-semibold text-gray-500">Loading notifications...</div>
        )}

        {!loading && items.length === 0 && (
          <div className="card-premium p-6 text-sm font-semibold text-gray-500">No notifications yet.</div>
        )}

        {!loading && items.map((item) => (
          <div key={item.id} className="card-premium p-6 flex gap-4 items-start hover:bg-emerald-50/30 transition-colors">
            <div className="w-2 h-2 mt-2 rounded-full bg-emerald-500 shrink-0"></div>
            <div>
              <p className="text-sm font-bold text-gray-900">{item.title}</p>
              <p className="text-xs text-gray-500 mt-1">{item.description}</p>
              <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">{item.meta}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
