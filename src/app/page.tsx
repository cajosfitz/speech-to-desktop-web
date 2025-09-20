'use client';

import { useEffect, useState, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { Scanner } from '@yudiel/react-qr-scanner';

interface CustomWindow extends Window {
  SpeechRecognition: typeof SpeechRecognition;
  webkitSpeechRecognition: typeof SpeechRecognition;
}

export default function Home() {
  const [isPaired, setIsPaired] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SERVER_URL = "https://speech-to-desktop-server.onrender.com";
    socketRef.current = io(SERVER_URL);

    socketRef.current.on('connect', () => console.log('Socket.IO: Connected to server!'));
    socketRef.current.on('pair-success', () => { setIsPaired(true); setIsScanning(false); });
    socketRef.current.on('pair-fail', (msg) => { alert(`配对失败: ${msg}`); setIsScanning(false); });

    const SpeechRecognition = (window as unknown as CustomWindow).SpeechRecognition || (window as unknown as CustomWindow).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'zh-TW';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => console.error('Speech Recognition Error:', event.error);
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleScan = (result: any) => {
    const scannedText = typeof result === 'string' ? result : result?.text;
    if (scannedText) {
      socketRef.current?.emit('client-pair', scannedText);
    }
  };

  const handleMicClick = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  if (isScanning) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
        <h1 className="text-2xl mb-4">请扫描电脑上的 QR Code</h1>
        <div className="w-full max-w-sm overflow-hidden rounded-lg">
          <Scanner
            onScan={handleScan}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onError={(error: any) => console.log(error?.message)}
            styles={{ container: { width: '100%' } }}
          />
        </div>
        <button onClick={() => setIsScanning(false)} className="mt-4 bg-gray-500 py-2 px-4 rounded">
          取消
        </button>
      </main>
    );
  }

  if (isPaired) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-800 text-white">
        <h1 className="text-3xl font-bold mb-8">语音输入工具</h1>
        <button
          onClick={handleMicClick}
          className={`w-24 h-24 rounded-full grid place-items-center transition-all duration-300 ${
            isListening ? 'bg-red-500 shadow-lg scale-110' : 'bg-blue-500 hover:bg-blue-400'
          }`}
        >
          <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.39-.98.88l-.02.12v2c0 2.97-2.16 5.43-5 5.91V21h4c.55 0 1 .45 1 1s-.45 1-1 1H8c-.55 0-1-.45-1-1s.45-1 1-1h4v-2.09c-2.84-.48-5-2.94-5-5.91v-2c0-.55.45-1 1-1s1 .45 1 1v2c0 2.21 1.79 4 4 4s4-1.79 4-4v-2c0-.55.45-1 1-1z"></path></svg>
        </button>
        <div className="mt-8 text-center h-20 w-full max-w-lg p-4 bg-gray-700 rounded-lg">
          <p className="text-lg text-gray-300">
            {isListening ? '聆聽中...' : '配对成功！按下按钮开始说话'}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-8">语音输入工具</h1>
      <button onClick={() => setIsScanning(true)} className="bg-green-500 hover:bg-green-600 font-bold py-4 px-8 rounded-lg text-2xl">
        扫码连接电脑
      </button>
    </main>
  );
}