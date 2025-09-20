import { Server as NetServer } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';

export const config = {
  api: {
    bodyParser: false,
  },
};

type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: ServerIO; // 将 io 设为可选，因为我们是在这里初始化它
    };
  };
};

const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    console.log('*Socket.IO server initializing...');
    
    // 【关键修正】使用更安全的类型断言
    const httpServer = res.socket.server as unknown as NetServer;
    const io = new ServerIO(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling'], // 明确指定支援的协议
    });

    io.on('connection', (socket) => {
      console.log('A client connected:', socket.id);

      socket.on('message-from-client', (data) => {
        console.log(`Received message from ${socket.id}:`, data);
        socket.broadcast.emit('message-to-client', data);
      });

      socket.on('disconnect', () => {
        console.log('A client disconnected:', socket.id);
      });
    });

    res.socket.server.io = io;
  }
  res.end();
};

export default ioHandler;