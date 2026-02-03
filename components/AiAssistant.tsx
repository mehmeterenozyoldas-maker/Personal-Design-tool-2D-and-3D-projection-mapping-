import React, { useState } from 'react';
import { Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { SimParams } from '../types';

interface AiAssistantProps {
  onApplyParams: (params: Partial<SimParams>) => void;
}

// Define the schema for the model response
const simParamsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    viewMode: { type: Type.STRING, enum: ['2D', '3D'], description: "Choose 3D for spatial visuals, 2D for topo maps." },
    wireframe: { type: Type.BOOLEAN, description: "If 3D, should it be wireframe or solid?" },
    contourDensity: { type: Type.NUMBER, description: "Density of topo lines (5-40)" },
    lineThickness: { type: Type.NUMBER, description: "Thickness of lines (0.01-0.2)" },
    terrainSpeed: { type: Type.NUMBER, description: "Speed of flow (0-2.0)" },
    disturbRadius: { type: Type.NUMBER, description: "Impact radius (50-400)" },
    brightness: { type: Type.NUMBER, description: "Global brightness (0.5-2.0)" },
    contrast: { type: Type.NUMBER, description: "Contrast (0.5-2.0)" },
    filledBands: { type: Type.BOOLEAN, description: "Fill space between lines" },
    showTrails: { type: Type.BOOLEAN, description: "Show trails/ribbons for particles" },
    mirrorTerrain: { type: Type.BOOLEAN, description: "Mirror terrain on ceiling" },
    
    // Lighting
    ambientIntensity: { type: Type.NUMBER, description: "Ambient light (0-255)" },
    light1Color: { type: Type.STRING, description: "Hex color for light 1" },
    light1Intensity: { type: Type.NUMBER, description: "Intensity for light 1 (0-2)" },
    light2Color: { type: Type.STRING, description: "Hex color for light 2" },
    light2Intensity: { type: Type.NUMBER, description: "Intensity for light 2 (0-2)" },
    materialShininess: { type: Type.NUMBER, description: "Shininess of material (0-255)" },

    boidsCount: { type: Type.NUMBER, description: "Number of particles (0-300)" },
    boidsCohesion: { type: Type.NUMBER, description: "Swarm cohesion (0-2)" },
    boidsAlignment: { type: Type.NUMBER, description: "Swarm alignment (0-2)" },
    boidsSeparation: { type: Type.NUMBER, description: "Swarm separation (0-3)" },
    rationale: { type: Type.STRING, description: "Short poetic reason for these settings" }
  },
  required: ["viewMode", "terrainSpeed", "boidsCount", "filledBands"],
};

const INSPIRATIONS = [
  { label: "Neon Cyber City", prompt: "Futuristic neon cyberpunk city with glowing data streams, high contrast, wireframe, trails enabled, and mirror ceiling." },
  { label: "Zen Water Garden", prompt: "A calm, peaceful zen water garden, slow ripples, soft blue lighting, low density organic contours, solid mode." },
  { label: "Solar Flare", prompt: "Chaotic solar surface, high speed turmoil, bright orange and red lighting, aggressive boid swarm." }
];

const AiAssistant: React.FC<AiAssistantProps> = ({ onApplyParams }) => {
  const [prompt, setPrompt] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [rationale, setRationale] = useState<string | null>(null);

  const generate = async (inputPrompt: string) => {
    if (!inputPrompt.trim()) return;

    setIsThinking(true);
    setRationale(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate visual simulation parameters for a spatial XR topography based on this concept: "${inputPrompt}". 
        
        If the concept implies structure, depth, or spatial geometry (like 'mountains', 'city', 'matrix'), prefer viewMode: '3D'.
        If it implies maps, radar, or print design, prefer viewMode: '2D'.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: simParamsSchema,
        }
      });

      const text = response.text;
      if (text) {
        const data = JSON.parse(text);
        if (data.rationale) setRationale(data.rationale);
        
        const { rationale: _, ...params } = data;
        onApplyParams(params);
      }
    } catch (error) {
      console.error("AI Generation failed:", error);
      setRationale("Failed to hallucinate parameters. Check API connection.");
    } finally {
      setIsThinking(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generate(prompt);
  };

  const handleInspiration = (p: string) => {
    setPrompt(p);
    generate(p);
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 px-4 flex flex-col gap-3">
       {/* Inspirations */}
       {!isThinking && (
        <div className="flex justify-center gap-2 animate-in fade-in slide-in-from-bottom-4">
            {INSPIRATIONS.map((item) => (
                <button
                    key={item.label}
                    onClick={() => handleInspiration(item.prompt)}
                    className="px-3 py-1.5 bg-black/60 backdrop-blur-sm border border-white/10 hover:border-cyan-500/50 rounded-full text-[10px] uppercase tracking-wider text-gray-300 hover:text-white hover:bg-white/10 transition-all shadow-lg"
                >
                    {item.label}
                </button>
            ))}
        </div>
       )}

      {rationale && (
        <div className="text-center animate-in fade-in slide-in-from-bottom-2">
          <span className="inline-block px-4 py-2 bg-black/80 backdrop-blur-md border border-cyan-500/30 rounded-full text-xs font-mono text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
            ✨ {rationale}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative group w-full">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full blur opacity-25 group-hover:opacity-50 transition-opacity" />
        <div className="relative flex items-center bg-black/90 border border-white/10 rounded-full p-1 shadow-2xl">
          <div className="pl-4 pr-2 text-cyan-400">
            {isThinking ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          </div>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Dream up a world... (e.g. 'Cyberpunk 3D City')"
            className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-white/30 h-10 px-2"
          />
          <button 
            type="submit" 
            disabled={isThinking || !prompt}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50"
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default AiAssistant;