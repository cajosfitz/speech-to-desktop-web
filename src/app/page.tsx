'use client';

// 自订 Window 类型，让 TypeScript 认识 SpeechRecognition
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
    // --- 1. 初始化 Socket.IO ---
    fetch('/api/socket').then(() => {
      socketRef.current = io({ path: '/api/socket' });

      socketRef.current.on('connect', () => {
        console.log('Socket.IO: 成功连接到总机！');
      });

      // 监听来自伺服器的广播讯息
      socketRef.current.on('message-to-client', (data: string) => {
        console.log('WEB 端收到广播讯息:', data);
        setLastMessage(`最后收到的广播: ${data}`);
      });
    });

    // --- 2. 初始化语音识别 ---
    const SpeechRecognition = (window as unknown as CustomWindow).SpeechRecognition || (window as unknown as CustomWindow).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; // 持续识别，直到手动停止
      recognition.interimResults = true; // 产生即时结果
      recognition.lang = 'zh-TW'; // 设定语言为繁体中文

      // 当引擎开始聆听时
      recognition.onstart = () => {
        console.log('语音识别: 开始聆听...');
        setIsListening(true);
      };

      // 当识别到任何结果时
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
        setTranscript(interimTranscript); // 更新画面上的即时文字
        if (finalTranscript) {
          console.log('WEB 端发送最终结果:', finalTranscript);

          // 发送最终识别出的文字到伺服器
          socketRef.current?.emit('message-from-client', finalTranscript);
        }
      };
      
      // 【关键修正】当发生错误时，明确定义 event 类型
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('语音识别错误:', event.error);
      };

      // 当聆听结束时（无论是自然结束还是手动停止）
      recognition.onend = () => {
        console.log('语音识别: 聆听结束。');
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;

    } else {
      console.error('语音识别 API: 您的浏览器不支援此功能。');
      alert('您的浏览器不支援语音识别功能，请尝试使用最新版的 Chrome 浏览器。');
    }

    // 组件卸载时的清理工作
    return () => {
      socketRef.current?.disconnect();
      recognitionRef.current?.stop();
    };
  }, []); // 空依赖阵列，确保这个 effect 只在组件首次渲染时执行一次

  // 处理麦克风按钮点击事件的函数
  const handleMicClick = () => {
    if (!recognitionRef.current) {
      console.error('无法开始，语音识别尚未初始化。');
      return;
    }
    
    if (isListening) {
      console.log('操作: 手动停止聆听');
      recognitionRef.current.stop();
    } else {
      console.log('操作: 手动开始聆听');
      setTranscript(''); // 每次开始前清空上次的即时文字
      setLastMessage(''); // 每次开始前清空上次的广播讯息
      recognitionRef.current.start();
    }
  };
  
  return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-800 text-white">
          <h1 className="text-3xl font-bold mb-8">语音输入工具</h1>
          
          <button
            onClick={handleMicClick}
            className={`w-24 h-24 rounded-full grid place-items-center transition-all duration-300
                        ${isListening 
                          ? 'bg-red-500 shadow-lg scale-110' 
                          : 'bg-blue-500 hover:bg-blue-400'
                        }`}
          >
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.39-.98.88l-.02.12v2c0 2.97-2.16 5.43-5 5.91V21h4c.55 0 1 .45 1 1s-.45 1-1 1H8c-.55 0-1-.45-1-1s.45-1 1-1h4v-2.09c-2.84-.48-5-2.94-5-5.91v-2c0-.55.45-1 1-1s1 .45 1 1v2c0 2.21 1.79 4 4 4s4-1.79 4-4v-2c0-.55.45-1 1-1z"></path>
            </svg>
          </button>
          
          <div className="mt-8 h-20 w-full max-w-lg p-4 bg-gray-700 rounded-lg">
              <p className="text-lg text-gray-300">{transcript || (isListening ? '聆聽中...' : '按下按鈕開始說話...')}</p>
          </div>

          <div className="mt-4 h-12 w-full max-w-lg p-2 bg-green-900 rounded-lg">
              <p className="text-sm text-green-300">{lastMessage}</p>
          </div>
      </main>
  );
}