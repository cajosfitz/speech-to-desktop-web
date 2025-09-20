'use client';

// (类型定义保持不变)
interface CustomWindow extends Window {
  SpeechRecognition: typeof SpeechRecognition;
  webkitSpeechRecognition: typeof SpeechRecognition;
}

import { useEffect, useState, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastMessage, setLastMessage] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // 【关键优化】将 Socket.IO 的初始化移到 useEffect 外部，或确保其只执行一次
    // 在这个 effect 内部处理所有与 window 和 socket 相关的设定
    
    // --- 1. 初始化 Socket.IO ---
    // 从 URL 查询参数获取伺服器位址
    const queryParams = new URLSearchParams(window.location.search);
    const serverUrl = queryParams.get('server') || '';
    
    // 初始化 Socket.IO 客户端
    socketRef.current = io(serverUrl, { path: '/api/socket' });
    
    socketRef.current.on('connect', () => {
      console.log('Socket.IO: Connected to server!');
    });

    socketRef.current.on('message-to-client', (data: string) => {
      console.log('WEB received broadcast:', data);
      setLastMessage(`Last broadcast: ${data}`);
    });
    
    // --- 2. 初始化语音识别 ---
    // ... (这部分逻辑不变，直接复制过来) ...
    const SpeechRecognition = (window as unknown as CustomWindow).SpeechRecognition || (window as unknown as CustomWindow).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'zh-TW';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => console.error('Speech Recognition Error:', event.error);
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setTranscript(interimTranscript); 
        if (finalTranscript) {
          socketRef.current?.emit('message-from-client', finalTranscript);
        }
      };
      recognitionRef.current = recognition;
    } else {
      alert('Your browser does not support Speech Recognition.');
    }

    // 清理函数
    return () => {
      socketRef.current?.disconnect();
      recognitionRef.current?.stop();
    };
  }, []); // 空依赖阵列确保只执行一次

  // ... (handleMicClick 和 JSX 保持不变) ...
  const handleMicClick = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
    } else {
      setTranscript('');
      setLastMessage('');
      recognition.start();
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-800 text-white">
      {/* ... JSX ... */}
      <h1 className="text-3xl font-bold mb-8">语音输入工具</h1>
      <button onClick={handleMicClick} className={`w-24 h-24 rounded-full grid place-items-center transition-all duration-300 ${isListening ? 'bg-red-500 shadow-lg scale-110' : 'bg-blue-500 hover:bg-blue-400'}`}><svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.39-.98.88l-.02.12v2c0 2.97-2.16 5.43-5 5.91V21h4c.55 0 1 .45 1 1s-.45 1-1 1H8c-.55 0-1-.45-1-1s.45-1 1-1h4v-2.09c-2.84-.48-5-2.94-5-5.91v-2c0-.55.45-1 1-1s1 .45 1 1v2c0 2.21 1.79 4 4 4s4-1.79 4-4v-2c0-.55.45-1 1-1z"></path></svg></button>
      <div className="mt-8 h-20 w-full max-w-lg p-4 bg-gray-700 rounded-lg"><p className="text-lg text-gray-300">{transcript || (isListening ? '聆聽中...' : '按下按鈕開始說話...')}</p></div>
      <div className="mt-4 h-12 w-full max-w-lg p-2 bg-green-900 rounded-lg"><p className="text-sm text-green-300">{lastMessage}</p></div>
    </main>
  );
}