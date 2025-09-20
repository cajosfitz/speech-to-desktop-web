// 這裡是 TypeScript 程式碼，就像是總機的電路設計圖
import { Server as NetServer } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';

// 這是 Next.js 的一些設定，告訴它我們要自己處理網路請求
export const config = {
  api: {
    bodyParser: false,
  },
};

// 這是一個特殊的 TypeScript 類型，幫助我們的程式碼更聰明
type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: ServerIO;
    };
  };
};

// 這就是我們對講機總機的核心程式！
const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  // 我們先檢查一下總機是不是已經開機了
  if (!res.socket.server.io) {
    console.log('*第一次有人來，準備啟動對講機總機...');
    
    // 找到房子的內建伺服器，然後把我們的對講機系統掛上去
    const httpServer: NetServer = res.socket.server as any;
    const io = new ServerIO(httpServer, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: "*", // 允许来自任何来源的连接
      methods: ["GET", "POST"]
      }
    });

    // 當總機成功啟動後，它就開始監聽，等待手持對講機連線進來
    io.on('connection', (socket) => {
      console.log('有新的手持對講機連上線了！ID 是:', socket.id);

      // 當總機聽到有人從 'message-from-client' 這個頻道說話...
      socket.on('message-from-client', (data) => {
        console.log(`收到來自 ${socket.id} 的訊息:`, data);
        
        // ...它就立刻把這條訊息，轉發到 'message-to-client' 頻道，讓所有其他對講機都聽到
        socket.broadcast.emit('message-to-client', data);
      });

      // 如果有對講機關機或斷線了，我們也記錄一下
      socket.on('disconnect', () => {
        console.log('有對講機離線了:', socket.id);
      });
    });

    // 最後，把啟動好的總機存起來，這樣下次就不用再啟動一次了
    res.socket.server.io = io;
  }
  res.end();
};

export default ioHandler;