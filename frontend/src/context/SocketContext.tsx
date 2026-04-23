import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:5000/api';
    const socketUrl = apiBase.replace(/\/api\/?$/, '');
    const s = io(socketUrl);

    s.on('connect', () => {
      setIsConnected(true);
      console.log('Socket connected');
    });

    s.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket disconnected');
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
