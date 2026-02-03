import { useState, useCallback, useRef } from 'react';
import { SerialEvent } from '../types';

interface SerialConfig {
  baudRate: number;
}

export const useWebSerial = (onEvent: (e: SerialEvent) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const portRef = useRef<any>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const keepReadingRef = useRef(false);

  const connect = useCallback(async () => {
    if (!('serial' in navigator)) {
      alert("WebSerial not supported in this browser. Please use Chrome/Edge.");
      return;
    }

    try {
      // @ts-ignore - Navigator.serial is experimental
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
      
      portRef.current = port;
      keepReadingRef.current = true;
      setIsConnected(true);
      
      readLoop(port);
    } catch (err) {
      console.error('Serial connection failed:', err);
    }
  }, []);

  const disconnect = useCallback(async () => {
    keepReadingRef.current = false;
    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch (e) { console.warn(e); }
    }
    if (portRef.current) {
      try {
        await portRef.current.close();
      } catch (e) { console.warn(e); }
    }
    setIsConnected(false);
  }, []);

  const readLoop = async (port: any) => {
    const textDecoder = new TextDecoder();
    let buffer = '';

    while (port.readable && keepReadingRef.current) {
      try {
        const reader = port.readable.getReader();
        readerRef.current = reader;
        
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          buffer += textDecoder.decode(value, { stream: true });
          
          let idx;
          while ((idx = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (line) parseLine(line);
          }
        }
      } catch (error) {
        console.error("Read error", error);
        break;
      } finally {
        if (readerRef.current) {
          readerRef.current.releaseLock();
        }
      }
    }
  };

  const parseLine = (line: string) => {
    // Expected format: "L,0.45" or "R,0.12"
    const parts = line.split(',');
    if (parts.length < 2) return;
    
    const sensorId = parts[0].trim().toUpperCase();
    const val = parseFloat(parts[1]);
    
    if (!isNaN(val)) {
      // Logic for event trigger thresholds can be refined here
      // But we just pass raw pressure for the engine to handle logic
      onEvent({ type: 'pressure', sensorId, value: val });
    }
  };

  return { isConnected, connect, disconnect };
};
