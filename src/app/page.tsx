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
  const [lastMessage, setLastMessage] = useState(''); // 新增状态：显示最后收到的广播讯息
  const socketRef = useRef<Socket | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    fetch('/api/socket').then(() => {
      socketRef.current = io({ path: '/api/socket' });
      socketRef.current.on('connect', () => {
        console.log('Socket.IO: 成功连接到总机！');
      });

      // 【关键修改】重新加回讯息监听器
      socketRef.current.on('message-to-client', (data: string) => {
        console.log('WEB 端收到广播讯息:', data);
        setLastMessage(`最后收到的广播: ${data}`);
      });
    });

    // (语音识别部分保持不变)
    const SpeechRecognition = (window as unknown as CustomWindow).SpeechRecognition || (window as unknown as CustomWindow).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      // ... (省略未修改的语音识别设定) ...
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
          console.log('WEB 端发送最终结果:', finalTranscript);
          socketRef.current?.emit('message-from-client', finalTranscript);
        }
      };
      recognitionRef.current = recognition;
    }

    return () => {
      socketRef.current?.disconnect();
      recognitionRef.current?.stop();
    };
  }, []);
  
  // (handleMicClick 和 JSX 部分为了简洁省略，请保持原样)
  // ... (省略 handleMicClick) ...
  const handleMicClick = () => { if (!recognitionRef.current) return; if (isListening) { recognitionRef.current.stop(); } else { setTranscript(''); recognitionRef.current.start(); } };
  
  return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-800 text-white">
          {/* ... (省略 JSX button 和 svg) ... */}
          <button onClick={handleMicClick} className={`w-24 h-24 rounded-full grid place-items-center transition-all duration-300 ${isListening ? 'bg-red-500 shadow-lg scale-110' : 'bg-blue-500 hover:bg-blue-400'}`}><svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.39-.98.88l-.02.12v2c0 2.97-2.16 5.43-5 5.91V21h4c.55 0 1 .45 1 1s-.45 1-1 1H8c-.55 0-1-.45-1-1s.45-1 1-1h4v-2.09c-2.84-.48-5-2.94-5-5.91v-2c0-.55.45-1 1-1s1 .45 1 1v2c0 2.21 1.79 4 4 4s4-1.79 4-4v-2c0-.55.45-1 1-1z"></path></svg></button>
          <div className="mt-8 h-20 w-full max-w-lg p-4 bg-gray-700 rounded-lg">
              <p className="text-lg text-gray-300">{transcript || (isListening ? '聆聽中...' : '按下按鈕開始說話...')}</p>
          </div>
          {/* 【关键修改】新增一个区域来显示收到的广播 */}
          <div className="mt-4 h-12 w-full max-w-lg p-2 bg-green-900 rounded-lg">
              <p className="text-sm text-green-300">{lastMessage}</p>
          </div>
      </main>
  );
}