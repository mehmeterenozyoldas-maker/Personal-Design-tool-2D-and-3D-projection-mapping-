import React, { useEffect, useRef } from 'react';
import { SensorData } from '../types';

interface DataVizProps {
  sensors: Record<string, SensorData>;
}

const DataViz: React.FC<DataVizProps> = ({ sensors }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<{L: number[], R: number[]}>({ L: [], R: [] });
  const maxPoints = 200;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // Update History
      const lPressure = sensors['L']?.pressure || 0;
      const rPressure = sensors['R']?.pressure || 0;

      historyRef.current.L.push(lPressure);
      historyRef.current.R.push(rPressure);

      if (historyRef.current.L.length > maxPoints) historyRef.current.L.shift();
      if (historyRef.current.R.length > maxPoints) historyRef.current.R.shift();

      // Draw
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Background Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const y = (h / 4) * i;
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      // Draw Line Helper
      const drawLine = (data: number[], color: string) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        
        for (let i = 0; i < data.length; i++) {
          const x = (i / (maxPoints - 1)) * w;
          // Invert Y because canvas 0 is top
          const y = h - (data[i] * h); 
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };

      drawLine(historyRef.current.L, '#22d3ee'); // Cyan
      drawLine(historyRef.current.R, '#c084fc'); // Purple

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [sensors]); // Re-bind effect if sensors object reference changes significantly, but mostly relying on ref mutation for history

  return (
    <div className="fixed bottom-4 right-4 z-40 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-2xl pointer-events-none animate-in fade-in slide-in-from-right-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Sensor Telemetry</h3>
        <div className="flex gap-2 text-[9px] font-mono">
           <span className="text-cyan-400">L: {(sensors['L']?.pressure || 0).toFixed(2)}</span>
           <span className="text-purple-400">R: {(sensors['R']?.pressure || 0).toFixed(2)}</span>
        </div>
      </div>
      <canvas 
        ref={canvasRef} 
        width={300} 
        height={100} 
        className="w-[300px] h-[100px] bg-white/5 rounded-md"
      />
    </div>
  );
};

export default DataViz;