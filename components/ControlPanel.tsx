import React from 'react';
import { SimParams, AppMode, ViewMode } from '../types';
import { Sliders, Monitor, Layers, Settings, Maximize, Zap, Anchor, Activity, FileJson, PlayCircle, Video, Download, StopCircle, Box, Grid, Lightbulb } from 'lucide-react';
import { PRESETS } from '../constants';

interface ControlPanelProps {
  params: SimParams;
  setParams: React.Dispatch<React.SetStateAction<SimParams>>;
  mode: AppMode;
  setMode: (m: AppMode) => void;
  serialConnected: boolean;
  onConnectSerial: () => void;
  applyPreset: (name: string) => void;
  isRecording: boolean;
  onToggleRecord: () => void;
  showTelemetry: boolean;
  setShowTelemetry: (v: boolean) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  params, setParams, mode, setMode, serialConnected, onConnectSerial, applyPreset,
  isRecording, onToggleRecord, showTelemetry, setShowTelemetry
}) => {
  
  const updateParam = (key: keyof SimParams, value: number | boolean | string) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className={`fixed top-4 left-4 w-96 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-gray-200 shadow-2xl transition-opacity duration-300 overflow-y-auto max-h-[90vh] z-50 ${mode === AppMode.INSTALLATION ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-bold tracking-tight text-white flex items-center gap-2">
          <Activity size={18} className="text-cyan-400" />
          Spatial Composer
        </h1>
        <div className="px-2 py-1 bg-white/5 rounded-full text-[10px] border border-white/10 tracking-widest font-mono">
          {mode}
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex bg-white/5 p-1 rounded-lg mb-6 border border-white/10">
        {[AppMode.SIMULATION, AppMode.CALIBRATION, AppMode.INSTALLATION].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-2 text-[10px] font-bold rounded-md transition-all ${mode === m ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            {m.slice(0, 5)}
          </button>
        ))}
      </div>

      {/* View Mode & Presets */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-2">
           <button 
             onClick={() => updateParam('viewMode', '2D')}
             className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-xs font-bold border transition-all ${params.viewMode === '2D' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-white/5 text-gray-400 border-white/10'}`}
           >
             <Maximize size={12} /> 2D Map
           </button>
           <button 
             onClick={() => updateParam('viewMode', '3D')}
             className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-xs font-bold border transition-all ${params.viewMode === '3D' ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' : 'bg-white/5 text-gray-400 border-white/10'}`}
           >
             <Box size={12} /> 3D Space
           </button>
        </div>

        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <Zap size={12} /> Presets
        </label>
        <div className="grid grid-cols-3 gap-2">
            {Object.keys(PRESETS).map(k => (
                <button 
                    key={k} 
                    onClick={() => applyPreset(k)}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-xs py-2 rounded transition-colors uppercase"
                >
                    {k}
                </button>
            ))}
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-6" />

      {/* Lighting (Only 3D) */}
      {params.viewMode === '3D' && (
        <section className="space-y-4 mb-6 animate-in fade-in slide-in-from-left-2">
          <div className="flex items-center gap-2 text-yellow-400 mb-2">
            <Lightbulb size={14} />
            <span className="text-xs font-bold uppercase tracking-wider">Lighting</span>
          </div>
          
          <RangeControl label="Ambient Intensity" value={params.ambientIntensity} min={0} max={255} step={1} onChange={(v) => updateParam('ambientIntensity', v)} />
          <RangeControl label="Material Shininess" value={params.materialShininess} min={0} max={255} step={1} onChange={(v) => updateParam('materialShininess', v)} />
          
          <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 uppercase">Light 1</label>
                <div className="flex gap-2">
                    <input type="color" value={params.light1Color} onChange={(e) => updateParam('light1Color', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none" />
                    <div className="flex-1">
                         <RangeControl label="" value={params.light1Intensity} min={0} max={2} step={0.1} onChange={(v) => updateParam('light1Intensity', v)} />
                    </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 uppercase">Light 2</label>
                <div className="flex gap-2">
                    <input type="color" value={params.light2Color} onChange={(e) => updateParam('light2Color', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none" />
                    <div className="flex-1">
                         <RangeControl label="" value={params.light2Intensity} min={0} max={2} step={0.1} onChange={(v) => updateParam('light2Intensity', v)} />
                    </div>
                </div>
              </div>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-6" />
        </section>
      )}

      {/* Physics Controls */}
      <section className="space-y-4 mb-6">
        <div className="flex items-center gap-2 text-cyan-400 mb-2">
            <Layers size={14} />
            <span className="text-xs font-bold uppercase tracking-wider">Topography</span>
        </div>
        
        <RangeControl label="Contour Density" value={params.contourDensity} min={2} max={40} step={1} onChange={(v) => updateParam('contourDensity', v)} />
        <RangeControl label="Line Thickness" value={params.lineThickness} min={0.01} max={0.25} step={0.01} onChange={(v) => updateParam('lineThickness', v)} />
        <RangeControl label="Terrain Speed" value={params.terrainSpeed} min={0} max={2} step={0.01} onChange={(v) => updateParam('terrainSpeed', v)} />
        <RangeControl label="Disturb Radius" value={params.disturbRadius} min={50} max={500} step={10} onChange={(v) => updateParam('disturbRadius', v)} />
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-6" />

      {/* Boid Controls */}
      <section className="space-y-4 mb-6">
        <div className="flex items-center gap-2 text-purple-400 mb-2">
            <Anchor size={14} />
            <span className="text-xs font-bold uppercase tracking-wider">Swarm Intelligence</span>
        </div>
        
        <RangeControl label="Entity Count" value={params.boidsCount} min={0} max={400} step={1} onChange={(v) => updateParam('boidsCount', v)} />
        <RangeControl label="Cohesion" value={params.boidsCohesion} min={0} max={2} step={0.05} onChange={(v) => updateParam('boidsCohesion', v)} />
        <RangeControl label="Separation" value={params.boidsSeparation} min={0} max={3} step={0.05} onChange={(v) => updateParam('boidsSeparation', v)} />
      </section>

      {/* System */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
         <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-gray-400 flex items-center gap-2"><Settings size={12} /> System</span>
         </div>
         
         <div className="flex flex-col gap-2">
            {params.viewMode === '3D' && (
                <>
                    <Toggle label="3D Wireframe" value={params.wireframe} onChange={(v) => updateParam('wireframe', v)} />
                    <Toggle label="Show Trails" value={params.showTrails} onChange={(v) => updateParam('showTrails', v)} />
                    <Toggle label="Mirror Terrain" value={params.mirrorTerrain} onChange={(v) => updateParam('mirrorTerrain', v)} />
                </>
            )}
            <Toggle label="Fill Bands" value={params.filledBands} onChange={(v) => updateParam('filledBands', v)} />
            <Toggle label="Test Pattern" value={params.testPattern} onChange={(v) => updateParam('testPattern', v)} />
            <Toggle label="Show Telemetry" value={showTelemetry} onChange={setShowTelemetry} />
            
            <div className="flex gap-2 mt-2">
              <button 
                  onClick={onConnectSerial}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-xs font-bold border transition-all ${serialConnected ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'}`}
              >
                  {serialConnected ? <><Zap size={12}/> Connected</> : 'Connect Serial'}
              </button>

              <button
                onClick={onToggleRecord}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-xs font-bold border transition-all ${isRecording ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'}`}
              >
                 {isRecording ? <><StopCircle size={12} /> Stop Rec</> : <><Video size={12} /> Rec Video</>}
              </button>
            </div>
         </div>
      </div>
    </div>
  );
};

// Sub-components
const RangeControl = ({ label, value, min, max, step, onChange }: { label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void }) => (
    <div className="group">
        {label && (
        <div className="flex justify-between text-[10px] text-gray-400 mb-1 group-hover:text-cyan-400 transition-colors">
            <span>{label}</span>
            <span className="font-mono text-white">{value.toFixed(2)}</span>
        </div>
        )}
        <input 
            type="range" 
            min={min} max={max} step={step} value={value} 
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white hover:[&::-webkit-slider-thumb]:bg-cyan-400 transition-all"
        />
    </div>
);

const Toggle = ({ label, value, onChange }: { label: string, value: boolean, onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between text-xs text-gray-300">
        <span>{label}</span>
        <button 
            onClick={() => onChange(!value)}
            className={`w-8 h-4 rounded-full relative transition-colors ${value ? 'bg-cyan-500' : 'bg-white/20'}`}
        >
            <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${value ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>
    </div>
);

export default ControlPanel;