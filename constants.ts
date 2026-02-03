import { SimParams } from './types';

export const DEFAULT_PARAMS: SimParams = {
  viewMode: '2D',
  contourDensity: 18,
  lineThickness: 0.08,
  terrainSpeed: 0.65,
  disturbRadius: 220,
  brightness: 1.10,
  contrast: 1.25,
  filledBands: true,
  maskEnabled: true,
  testPattern: false,
  wireframe: true,
  showTrails: true,
  mirrorTerrain: false,
  boidsCount: 140,
  boidsCohesion: 0.75,
  boidsAlignment: 0.85,
  boidsSeparation: 1.10,
  
  // Lighting Defaults
  ambientIntensity: 40,
  light1Color: '#00ffff',
  light1Intensity: 0.8,
  light2Color: '#ff00ff',
  light2Intensity: 0.8,
  materialShininess: 30,
};

export const PRESETS: Record<string, Partial<SimParams>> = {
  calm: {
    viewMode: '2D',
    contourDensity: 18,
    terrainSpeed: 0.55,
    boidsCount: 120,
    brightness: 1.05,
    filledBands: true,
    light1Color: '#44aaff',
    light2Color: '#aabbff',
  },
  storm: {
    viewMode: '2D',
    contourDensity: 28,
    terrainSpeed: 1.15,
    boidsCount: 160,
    boidsSeparation: 1.55,
    filledBands: false,
    contrast: 1.35,
    light1Color: '#ffffff',
    light2Color: '#555555',
  },
  neon: {
    viewMode: '2D',
    contourDensity: 12,
    lineThickness: 0.15,
    terrainSpeed: 0.4,
    boidsCount: 200,
    brightness: 1.4,
    contrast: 1.6,
    filledBands: false,
    light1Color: '#ff0055',
    light2Color: '#ccff00',
  },
  'matrix-3d': {
    viewMode: '3D',
    wireframe: true,
    contourDensity: 20,
    terrainSpeed: 0.8,
    boidsCount: 300,
    brightness: 1.5,
    disturbRadius: 300,
    light1Color: '#00ff00',
    light2Color: '#003300',
    ambientIntensity: 20,
    showTrails: true,
    mirrorTerrain: true,
  },
  'solid-sea': {
    viewMode: '3D',
    wireframe: false,
    contourDensity: 10,
    terrainSpeed: 0.4,
    boidsCount: 50,
    brightness: 0.8,
    filledBands: true,
    light1Color: '#0088ff',
    light2Color: '#00ffff',
    ambientIntensity: 80,
    materialShininess: 100,
    mirrorTerrain: false,
  }
};

export const OUTPUT_W = 1920;
export const OUTPUT_H = 1080;
export const GRID_W = 160;
export const GRID_H = 90;