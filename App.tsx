import React, { useState, useCallback, useEffect, useRef } from 'react';
import CanvasSketch from './components/CanvasSketch';
import ControlPanel from './components/ControlPanel';
import AiAssistant from './components/AiAssistant';
import DataViz from './components/DataViz';
import { useWebSerial } from './hooks/useWebSerial';
import { AppMode, SimParams, SensorData, SerialEvent } from './types';
import { DEFAULT_PARAMS, PRESETS } from './constants';

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.SIMULATION);
  const [params, setParams] = useState<SimParams>(DEFAULT_PARAMS);
  const [isRecording, setIsRecording] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(false);
  
  // Sensor State (Pedestals/Shoes)
  const [sensors, setSensors] = useState<Record<string, SensorData>>({
    'L': { id: 'L', pressure: 0, placed: false, x: 0.33, y: 0.56 },
    'R': { id: 'R', pressure: 0, placed: false, x: 0.67, y: 0.56 },
  });

  // Handle incoming serial data
  const handleSerialEvent = useCallback((e: SerialEvent) => {
    setSensors(prev => {
        const next = { ...prev };
        const s = next[e.sensorId];
        if (!s) return prev;

        if (e.type === 'pressure' && e.value !== undefined) {
            s.pressure = e.value;
            if (e.value > 0.18 && !s.placed) s.placed = true;
            if (e.value < 0.10 && s.placed) s.placed = false;
        }
        return next;
    });
  }, []);

  const { isConnected, connect } = useWebSerial(handleSerialEvent);

  // Keyboard Simulation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
        if (e.repeat) return;
        setSensors(prev => {
            const next = { ...prev };
            if (e.key === '1') { 
                next.L.placed = !next.L.placed;
                next.L.pressure = next.L.placed ? 0.5 : 0;
            }
            if (e.key === '2') { 
                next.R.placed = !next.R.placed;
                next.R.pressure = next.R.placed ? 0.5 : 0;
            }
            return next;
        });
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const applyPreset = (name: string) => {
      const p = PRESETS[name];
      if (p) setParams(prev => ({ ...prev, ...p }));
  };
  
  const handleAiParams = (newParams: Partial<SimParams>) => {
      setParams(prev => ({ ...prev, ...newParams }));
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden font-sans selection:bg-cyan-500/30">
        
        {/* The P5 Canvas (Background) */}
        <div className="absolute inset-0 z-0">
            <CanvasSketch 
                params={params} 
                mode={mode} 
                sensors={sensors}
                isRecording={isRecording}
            />
        </div>

        {/* UI Overlay */}
        <ControlPanel 
            params={params}
            setParams={setParams}
            mode={mode}
            setMode={setMode}
            serialConnected={isConnected}
            onConnectSerial={connect}
            applyPreset={applyPreset}
            isRecording={isRecording}
            onToggleRecord={() => setIsRecording(p => !p)}
            showTelemetry={showTelemetry}
            setShowTelemetry={setShowTelemetry}
        />
        
        {/* Data Visualization Overlay */}
        {showTelemetry && (
          <DataViz sensors={sensors} />
        )}

        {/* AI Command Line (Only in Simulation Mode) */}
        {mode === AppMode.SIMULATION && (
            <AiAssistant onApplyParams={handleAiParams} />
        )}

        {/* Fullscreen Trigger (Hidden in installation) */}
        {mode !== AppMode.INSTALLATION && (
            <button 
                onClick={() => !document.fullscreenElement ? document.documentElement.requestFullscreen() : document.exitFullscreen()}
                className="fixed top-4 right-4 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/50 hover:text-white transition-colors"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                </svg>
            </button>
        )}
    </div>
  );
}

export default App;