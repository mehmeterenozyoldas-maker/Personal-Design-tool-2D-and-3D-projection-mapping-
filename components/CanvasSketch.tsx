import React, { useRef, useEffect } from 'react';
import Sketch from 'react-p5';
import p5Types from 'p5';
import { SimParams, AppMode, SensorData } from '../types';
import { FluidTerrain } from '../engine/FluidTerrain';
import { SwarmSystem } from '../engine/SwarmSystem';
import { ProjectionMapping } from '../engine/Projection';
import { OUTPUT_W, OUTPUT_H, GRID_W, GRID_H } from '../constants';

interface CanvasSketchProps {
  params: SimParams;
  mode: AppMode;
  sensors: Record<string, SensorData>;
  isRecording: boolean;
}

const CanvasSketch: React.FC<CanvasSketchProps> = ({ params, mode, sensors, isRecording }) => {
  const paramsRef = useRef<SimParams>(params);
  const modeRef = useRef<AppMode>(mode);
  const sensorsRef = useRef<Record<string, SensorData>>(sensors);
  const p5InstanceRef = useRef<p5Types | null>(null);
  
  // Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  // Physics Engines
  const terrainRef = useRef(new FluidTerrain(GRID_W, GRID_H));
  const swarmRef = useRef(new SwarmSystem(OUTPUT_W, OUTPUT_H, 140));
  const projRef = useRef(new ProjectionMapping());
  
  // Offscreen Buffer (WEBGL)
  const bufferRef = useRef<p5Types.Graphics | null>(null);

  // Camera State
  const cameraRef = useRef({
    theta: Math.PI / 6, // 30 degrees
    phi: -Math.PI / 6,   // -30 degrees
    radius: 900,
    target: { x: 0, y: 0, z: 0 },
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0
  });

  // Update refs when props change
  useEffect(() => { paramsRef.current = params; }, [params]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { sensorsRef.current = sensors; }, [sensors]);

  // Handle Recording State Changes
  useEffect(() => {
    if (!p5InstanceRef.current) return;

    if (isRecording) {
      try {
        const canvasEl = document.querySelector('canvas'); 
        if (!canvasEl) {
           console.error("Canvas element not found for recording");
           return;
        }

        const stream = canvasEl.captureStream(30); // 30 FPS
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        
        chunksRef.current = [];
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `spatial-simulation-${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        };
        
        recorder.start();
        mediaRecorderRef.current = recorder;
        console.log("Recording started...");
        
      } catch (err) {
        console.error("Failed to start recording:", err);
      }
    } else {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        console.log("Recording stopped.");
      }
    }
  }, [isRecording]);

  const setup = (p5: p5Types, canvasParentRef: Element) => {
    p5InstanceRef.current = p5;
    // Main Canvas is WEBGL to support projection mapping warp
    p5.createCanvas(window.innerWidth, window.innerHeight, p5.WEBGL).parent(canvasParentRef);
    p5.pixelDensity(1);
    
    // Create high-res offscreen buffer as WEBGL to support both 2D and 3D rendering modes
    bufferRef.current = p5.createGraphics(OUTPUT_W, OUTPUT_H, p5.WEBGL);
    bufferRef.current.pixelDensity(1);
    
    projRef.current.ensureCorners(p5.width, p5.height);
  };

  const draw = (p5: p5Types) => {
    const dt = Math.min(1/20, p5.deltaTime / 1000);
    const time = p5.millis() * 0.001;
    const p = paramsRef.current;
    const m = modeRef.current;
    const s = sensorsRef.current;
    
    const terrain = terrainRef.current;
    const swarm = swarmRef.current;
    const buffer = bufferRef.current;

    if (!buffer) return;

    // --- 1. Physics Update (Shared) ---
    terrain.update(dt, p);
    swarm.setCount(p.boidsCount);

    const forces = Object.values(s).map((sensor: SensorData) => ({
        x: sensor.x * OUTPUT_W,
        y: sensor.y * OUTPUT_H,
        dir: sensor.id === 'L' ? 1 : -1,
        strength: 0.7 + sensor.pressure
    }));
    
    swarm.update(p, forces);

    // --- 2. Render to Offscreen Buffer ---
    // Resetting buffer each frame is crucial in WEBGL mode
    buffer.reset();
    buffer.clear();
    
    if (p.viewMode === '3D') {
      // *** 3D MODE (Spatial Visualization) ***
      buffer.background(10, 10, 15);
      
      // -- Lighting Setup --
      buffer.ambientLight(p.ambientIntensity);
      
      const l1 = p5.color(p.light1Color);
      const l2 = p5.color(p.light2Color);
      
      // Use directional lights for better 3D definition, or point lights for drama.
      // Point lights at corners give good depth.
      // Light 1
      buffer.pointLight(l1.levels[0], l1.levels[1], l1.levels[2], -600, -600, 600);
      buffer.pointLight(l1.levels[0], l1.levels[1], l1.levels[2], -600, 600, 600); // multiple sources for soft feel?
      // Scale intensity via color value if needed, but p5 lights are additive. 
      // We can use specularMaterial settings in render3D to control response.
      
      // Light 2 (Opposite side)
      buffer.pointLight(l2.levels[0], l2.levels[1], l2.levels[2], 600, -600, 600);
      buffer.pointLight(l2.levels[0], l2.levels[1], l2.levels[2], 600, 600, 600);

      // -- Camera Control --
      const cam = cameraRef.current;
      // Convert spherical to cartesian
      // Y-axis is up/down in p5 WEBGL logic often but let's stick to standard math
      // x = r * sin(theta) * cos(phi)
      // y = r * sin(theta) * sin(phi)
      // z = r * cos(theta)
      // Actually let's use:
      // Y is UP (-Y in p5 screen coords).
      // Rotate around Y axis (theta), Look up/down (phi)
      
      const cx = cam.radius * Math.sin(cam.theta) * Math.cos(cam.phi);
      const cy = cam.radius * Math.sin(cam.phi);
      const cz = cam.radius * Math.cos(cam.theta) * Math.cos(cam.phi);
      
      buffer.camera(cx, cy, cz, 0, 0, 0, 0, 1, 0);

      buffer.push();
      // Only auto-rotate if not interacting? 
      // Or just remove auto-rotate now that we have manual control.
      // buffer.rotateY(Math.sin(time * 0.1) * 0.2);
      
      // Pass shininess/material params if needed, or handle in render3D
      terrain.render3D(buffer, p, time);
      
      // Render Boids
      if (p.boidsCount > 0) {
        swarm.draw3D(buffer, terrain, p, time);
      }
      buffer.pop();

    } else {
      // *** 2D MODE (Projection Mapping) ***
      terrain.renderTo(p5, buffer, p);

      if (!p.testPattern && p.boidsCount > 0) {
         buffer.push();
         buffer.translate(-buffer.width/2, -buffer.height/2);
         swarm.draw(buffer, 220);
         buffer.pop();
      }
      
      if (p.testPattern) {
          buffer.push();
          buffer.translate(-buffer.width/2, -buffer.height/2);
          buffer.stroke(255, 0, 0);
          buffer.noFill();
          buffer.rect(0,0,buffer.width, buffer.height);
          buffer.line(0,0,buffer.width, buffer.height);
          buffer.line(buffer.width,0,0,buffer.height);
          buffer.fill(255);
          buffer.textSize(48);
          buffer.text("TEST PATTERN", 50, 100);
          buffer.pop();
      }
    }

    // --- 3. Render Buffer to Screen (Projection Mapping) ---
    p5.background(0);
    // Reset main camera to default orthogonal-ish view for quad mapping
    p5.camera(0, 0, (p5.height/2.0) / Math.tan(Math.PI*30.0 / 180.0), 0, 0, 0, 0, 1, 0);
    
    // Draw the warped buffer
    projRef.current.drawWarped(p5, buffer);

    // Draw Calibration UI on top
    if (m === AppMode.CALIBRATION) {
      projRef.current.drawUI(p5);
    }
  };

  const windowResized = (p5: p5Types) => {
    p5.resizeCanvas(window.innerWidth, window.innerHeight);
    projRef.current.ensureCorners(window.innerWidth, window.innerHeight);
  };

  const mousePressed = (p5: p5Types) => {
    // 1. Try Calibration Handle
    if (modeRef.current === AppMode.CALIBRATION) {
      const handled = projRef.current.handleMousePressed(p5.mouseX, p5.mouseY);
      if (handled) return;
    }

    // 2. Camera Start
    if (paramsRef.current.viewMode === '3D') {
      const cam = cameraRef.current;
      cam.isDragging = true;
      cam.lastMouseX = p5.mouseX;
      cam.lastMouseY = p5.mouseY;
    }
  };

  const mouseDragged = (p5: p5Types) => {
    // 1. Calibration Drag
    if (modeRef.current === AppMode.CALIBRATION && projRef.current.dragIndex !== -1) {
      projRef.current.handleMouseDragged(p5.mouseX, p5.mouseY, p5.width, p5.height);
      return;
    }

    // 2. Camera Orbit
    if (paramsRef.current.viewMode === '3D' && cameraRef.current.isDragging) {
      const cam = cameraRef.current;
      const dx = p5.mouseX - cam.lastMouseX;
      const dy = p5.mouseY - cam.lastMouseY;
      
      // Sensitivity
      const sens = 0.005;
      cam.theta -= dx * sens;
      cam.phi += dy * sens;

      // Clamp phi to avoid flipping
      // -PI/2 to PI/2 usually, but let's be loose
      cam.phi = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, cam.phi));
      
      cam.lastMouseX = p5.mouseX;
      cam.lastMouseY = p5.mouseY;
    }
  };

  const mouseReleased = (p5: p5Types) => {
    projRef.current.handleMouseReleased();
    cameraRef.current.isDragging = false;
  };

  const mouseWheel = (p5: p5Types) => {
    if (paramsRef.current.viewMode === '3D') {
      const cam = cameraRef.current;
      // @ts-ignore - p5 types missing deltaY sometimes depending on version/def
      const e = (p5 as any)._mouseWheelDeltaY || 0; 
      // Or use the standard hook event if accessible? 
      // React-p5 exposes mouseWheel prop which receives the p5 instance AND the event usually?
      // Actually standard p5 mouseWheel(event) passes the event.
      // But in react-p5 `mouseWheel` prop signature is (p5, event?: UIEvent).
      
      // Let's rely on standard delta if possible or a sensitivity factor
      // In p5 draw loop p5.deltaY is NOT available globally. 
      // Let's implement the handler below.
    }
  };
  
  // Custom handler for wheel because react-p5/types signature variance
  const onMouseWheel = (p5: p5Types, event: WheelEvent) => {
     if (paramsRef.current.viewMode === '3D') {
        const cam = cameraRef.current;
        const s = 1.05;
        if (event.deltaY > 0) cam.radius *= s;
        else cam.radius /= s;
        
        // Clamp radius
        cam.radius = Math.max(100, Math.min(3000, cam.radius));
     }
  };

  return (
    <Sketch 
      setup={setup} 
      draw={draw} 
      windowResized={windowResized} 
      mousePressed={mousePressed}
      mouseDragged={mouseDragged}
      mouseReleased={mouseReleased}
      mouseWheel={onMouseWheel}
    />
  );
};

export default CanvasSketch;