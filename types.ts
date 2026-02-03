export enum AppMode {
  SIMULATION = 'SIMULATION',
  CALIBRATION = 'CALIBRATION',
  INSTALLATION = 'INSTALLATION',
}

export type ViewMode = '2D' | '3D';

export interface SimParams {
  // System
  viewMode: ViewMode;
  
  // Terrain
  contourDensity: number;
  lineThickness: number;
  terrainSpeed: number;
  disturbRadius: number;
  
  // Visuals
  brightness: number;
  contrast: number;
  filledBands: boolean;
  maskEnabled: boolean;
  testPattern: boolean;
  wireframe: boolean;
  showTrails: boolean; // NEW: 3D Ribbons
  mirrorTerrain: boolean; // NEW: Inverted ceiling grid

  // Lighting
  ambientIntensity: number; // 0-255
  light1Color: string; // Hex
  light1Intensity: number; // 0-2
  light2Color: string; // Hex
  light2Intensity: number; // 0-2
  materialShininess: number; // 0-255

  // Boids
  boidsCount: number;
  boidsCohesion: number;
  boidsAlignment: number;
  boidsSeparation: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface SensorData {
  id: string; // 'L' or 'R'
  pressure: number; // 0.0 to 1.0
  placed: boolean;
  x: number; // normalized 0-1
  y: number; // normalized 0-1
}

export interface SerialEvent {
  type: 'pressure' | 'placed' | 'lifted';
  sensorId: string;
  value?: number;
}