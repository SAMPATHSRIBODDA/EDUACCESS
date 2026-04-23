// Messages.tsx (Student)
import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Send, 
  Paperclip, 
  MoreHorizontal, 
  CheckCheck,
  Trash2
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import type { MessageRecord } from '../../types/api';
import { useAuth } from '../../context/AuthContext';

const contactColorClasses = {
  emerald: 'bg-emerald-500 shadow-lg shadow-emerald-500/20',
  blue: 'bg-blue-500 shadow-lg shadow-blue-500/20',
  purple: 'bg-purple-500 shadow-lg shadow-purple-500/20',
  orange: 'bg-orange-500 shadow-lg shadow-orange-500/20',
} as const;

export const Messages: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  
  const studentEmail = user?.email || '';

  const loadContacts = async () => {
    if (!studentEmail) return;
    try {
      const response = await api.getContacts('student', studentEmail);
      const contactList = response.data.map((c: any, index: number) => ({
        ...c,
        initial: c.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase(),
        color: ['emerald', 'blue', 'purple', 'orange'][index % 4],
        status: 'Online'
      }));
      setContacts(contactList);
    } catch (error) {
      console.error('Failed to load contacts', error);
    }
  };

  const loadChatHistory = async (otherEmail: string) => {
    if (!studentEmail || !otherEmail) return;
    try {
      setLoading(true);
      const response = await api.getChatHistory(studentEmail, otherEmail);
      setMessages(response.data);
      
      // Mark as read when history is loaded
      if (socket) {
        socket.emit('mark_read', { myEmail: studentEmail, otherEmail });
      }
    } catch (error) {
      console.error('Failed to load chat history', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadContacts();
  }, [studentEmail]);

  useEffect(() => {
    if (selectedContact) {
      void loadChatHistory(selectedContact.email);
    }
  }, [selectedContact]);

  useEffect(() => {
    if (socket && studentEmail) {
      socket.emit('join', studentEmail);
      
      const handleNewMsg = (msg: MessageRecord) => {
        if (selectedContact && (msg.from === selectedContact.email || msg.to === selectedContact.email)) {
          setMessages(prev => [...prev, msg]);
          
          // If we are recipient, mark as read immediately
          if (msg.to === studentEmail) {
            socket.emit('mark_read', { myEmail: studentEmail, otherEmail: selectedContact.email });
          }
        }
        
        setContacts(prev => prev.map(c => {
          if (c.email === msg.from || c.email === msg.to) {
            return { ...c, lastMsg: msg.body, time: msg.time };
          }
          return c;
        }));
      };

      const handleReadUpdate = (data: { by: string }) => {
        if (selectedContact && data.by === selectedContact.email) {
          setMessages(prev => prev.map(m => m.from === studentEmail ? { ...m, status: 'read' } : m));
        }
      };

      socket.on('receive_message', handleNewMsg);
      socket.on('message_sent', handleNewMsg);
      socket.on('messages_read', handleReadUpdate);

      return () => {
        socket.off('receive_message');
        socket.off('message_sent');
        socket.off('messages_read');
      };
    }
  }, [socket, studentEmail, selectedContact]);

  const sendMessage = () => {
    if (!draft.trim() || !selectedContact || !socket) return;

    const msgData = {
      from: studentEmail,
      to: selectedContact.email,
      body: draft.trim(),
      time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      panel: 'student'
    };

    socket.emit('send_message', msgData);
    setDraft('');
  };

  const deleteConversation = async () => {
    if (!selectedContact) return;
    try {
      const threadIds = messages.map(m => m.id);
      await Promise.all(threadIds.map(id => api.deleteMessage(id)));
      setMessages([]);
    } catch (error) {
      console.error('Delete failed', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 h-[calc(100vh-140px)] animate-in fade-in duration-500">
      <div className="h-full flex gap-8">
        {/* Sidebar */}
        <div className="w-80 flex flex-col bg-white border border-gray-100 rounded-[2rem] shadow-soft overflow-hidden shrink-0">
          <div className="p-6 border-b border-gray-50 bg-gray-50/30">
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Chats</h3>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Direct feedback from teachers</p>
          </div>
          
          <div className="p-4 border-b border-gray-50">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search teachers..." 
                className="w-full bg-gray-50 border-none rounded-xl pl-12 pr-4 py-3 text-xs font-bold focus:ring-2 focus:ring-emerald-500/10 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {contacts.length === 0 ? (
              <div className="text-center py-10 opacity-30 font-black uppercase text-[10px] tracking-widest">No teachers available</div>
            ) : (
              contacts.map(contact => (
                <div 
                  key={contact.email}
                  onClick={() => setSelectedContact(contact)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all group",
                    selectedContact?.email === contact.email ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "hover:bg-gray-50"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xs border-2 border-white",
                    selectedContact?.email === contact.email ? "bg-white/20" : contactColorClasses[contact.color as keyof typeof contactColorClasses]
                  )}>
                    {contact.initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <h4 className={cn("text-xs font-black truncate", selectedContact?.email === contact.email ? "text-white" : "text-gray-900")}>{contact.name}</h4>
                      <span className={cn("text-[8px] font-black uppercase", selectedContact?.email === contact.email ? "text-emerald-100" : "text-gray-300")}>{contact.time}</span>
                    </div>
                    <p className={cn("text-[10px] font-bold truncate tracking-tight leading-tight", selectedContact?.email === contact.email ? "text-emerald-50/80" : "text-gray-400")}>{contact.lastMsg || "No messages yet"}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white border border-gray-100 rounded-[2rem] shadow-premium overflow-hidden">
          {selectedContact ? (
            <>
              <header className="p-6 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-emerald-500/10 shadow-lg">
                    {selectedContact.initial}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 tracking-tight">{selectedContact.name}</h4>
                    <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">Teacher</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={deleteConversation} className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:text-rose-500 hover:bg-rose-50 transition-all border border-gray-100 shadow-sm"><Trash2 className="w-4 h-4" /></button>
                  <button className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:text-gray-900 hover:bg-gray-100 transition-all border border-gray-100 shadow-sm"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/10 custom-scrollbar">
                {messages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "flex items-start gap-3 max-w-lg mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
                      msg.from === studentEmail ? "ml-auto flex-row-reverse" : ""
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black border-2 border-white shadow-soft shrink-0",
                      msg.from === studentEmail ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"
                    )}>
                      {msg.from === studentEmail ? (user?.name?.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'ME') : selectedContact.initial}
                    </div>
                    <div className={msg.from === studentEmail ? "text-right" : ""}>
                      <div className={cn(
                        "p-4 rounded-2xl shadow-soft text-sm font-bold leading-relaxed",
                        msg.from === studentEmail ? "bg-emerald-500 text-white rounded-tr-none" : "bg-white border border-gray-100 text-gray-600 rounded-tl-none"
                      )}>
                        {msg.body}
                      </div>
                      <div className={cn("flex items-center gap-1.5 mt-2", msg.from === studentEmail ? "justify-end mr-2" : "ml-2")}>
                        <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">{msg.time}</span>
                        {msg.from === studentEmail && <CheckCheck className={cn("w-3 h-3", msg.status === 'read' ? "text-emerald-500" : "text-gray-300")} />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <footer className="p-6 border-t border-gray-50 flex items-center gap-4 bg-white shrink-0">
                <button className="p-3.5 bg-gray-50 text-gray-400 rounded-2xl hover:text-emerald-500 hover:bg-emerald-50 transition-all border border-gray-100"><Paperclip className="w-4 h-4" /></button>
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    placeholder="Ask a doubt or send a message..." 
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-gray-300 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                  />
                </div>
                <button 
                  onClick={sendMessage}
                  className="bg-emerald-500 text-white p-4 rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-90 transition-all hover:bg-emerald-400"
                >
                  <Send className="w-5 h-5" />
                </button>
              </footer>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 opacity-30">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-6">
                <Send className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Select a teacher</h3>
              <p className="text-sm font-bold max-w-xs mt-2">Choose a teacher from the sidebar to start a conversation about your doubts.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
