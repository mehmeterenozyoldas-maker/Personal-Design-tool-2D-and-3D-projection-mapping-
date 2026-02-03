import p5Types from 'p5';
import { SimParams } from '../types';
import { OUTPUT_W, OUTPUT_H } from '../constants';

export class FluidTerrain {
  gridW: number;
  gridH: number;
  h: Float32Array;
  v: Float32Array;
  noiseT: number = 0;
  noiseStrength: number = 0.20;
  
  lowW: number;
  lowH: number;
  gLow: p5Types.Graphics | null = null;

  constructor(gridW = 160, gridH = 90) {
    this.gridW = gridW;
    this.gridH = gridH;
    this.h = new Float32Array(gridW * gridH);
    this.v = new Float32Array(gridW * gridH);
    // Low-res buffer size for pixel manipulation
    this.lowW = 480;
    this.lowH = 270;
  }

  idx(x: number, y: number) { return x + y * this.gridW; }

  update(dt: number, params: SimParams) {
    const w = this.gridW, h = this.gridH;
    const speed = params.terrainSpeed;
    const damping = 0.985 - (speed * 0.02);
    const lapK = 0.22 * (0.5 + speed);

    this.noiseT += dt * 0.10 * (0.25 + speed);

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = this.idx(x, y);
        // Laplacian neighbor average
        const lap =
          this.h[this.idx(x-1, y)] + this.h[this.idx(x+1, y)] +
          this.h[this.idx(x, y-1)] + this.h[this.idx(x, y+1)] -
          4 * this.h[i];

        // Noise field drift
        const nx = (x / w) * 2.2;
        const ny = (y / h) * 2.2;
        const n = this.noise(nx + this.noiseT * 0.11, ny + this.noiseT * 0.09);
        const drift = (n - 0.5) * this.noiseStrength;

        this.v[i] += lap * lapK + drift * 0.02;
        this.v[i] *= damping;
      }
    }

    for (let i = 0; i < this.h.length; i++) {
      this.h[i] += this.v[i];
    }
  }

  disturb(normX: number, normY: number, amount: number, radiusPx: number, type: 'bulge' | 'dent' | 'ripple') {
    const gx = normX * (this.gridW - 1);
    const gy = normY * (this.gridH - 1);

    const rGrid = (radiusPx / 1920) * (this.gridW - 1);
    const r2 = rGrid * rGrid;

    const xmin = Math.max(1, Math.floor(gx - rGrid));
    const xmax = Math.min(this.gridW - 2, Math.ceil(gx + rGrid));
    const ymin = Math.max(1, Math.floor(gy - rGrid));
    const ymax = Math.min(this.gridH - 2, Math.ceil(gy + rGrid));

    for (let y = ymin; y <= ymax; y++) {
      for (let x = xmin; x <= xmax; x++) {
        const dx = x - gx;
        const dy = y - gy;
        const d2 = dx*dx + dy*dy;
        if (d2 > r2) continue;
        const d = Math.sqrt(d2);
        const t = 1 - (d / (rGrid + 1e-6));
        const g = t * t;

        const i = this.idx(x, y);
        if (type === 'ripple') {
          const ring = Math.sin(d * 2.4);
          this.v[i] += amount * g * ring;
        } else {
          this.v[i] += amount * g * (type === 'dent' ? -1 : 1);
        }
      }
    }
  }

  // Simple pseudo-noise function to avoid importing huge libs
  noise(x: number, y: number) {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  sample(u: number, v: number): number {
    const x = u * (this.gridW - 1);
    const y = v * (this.gridH - 1);
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = Math.min(this.gridW - 1, x0 + 1);
    const y1 = Math.min(this.gridH - 1, y0 + 1);
    const tx = x - x0;
    const ty = y - y0;

    const a = this.h[this.idx(x0, y0)];
    const b = this.h[this.idx(x1, y0)];
    const c = this.h[this.idx(x0, y1)];
    const d = this.h[this.idx(x1, y1)];

    const ab = a + (b - a) * tx;
    const cd = c + (d - c) * tx;
    return ab + (cd - ab) * ty;
  }

  renderTo(p: p5Types, gOut: p5Types.Graphics, params: SimParams) {
    // Ensure offline buffer exists
    if (!this.gLow || this.gLow.width !== this.lowW) {
      this.gLow = p.createGraphics(this.lowW, this.lowH);
      this.gLow.pixelDensity(1);
      this.gLow.noSmooth();
    }

    const gl = this.gLow;
    gl.loadPixels();

    const w = gl.width;
    const h = gl.height;
    const cd = params.contourDensity;
    const lt = params.lineThickness;
    const filled = params.filledBands;
    const bright = params.brightness;
    const contrast = params.contrast;

    // Direct pixel manipulation for speed
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const u = x / (w - 1);
        const v = y / (h - 1);
        
        // Sampling grid 
        const val = this.sample(u, v);
        const z = val * 1.2;
        
        // Contour logic
        const f = z * cd;
        const frac = f - Math.floor(f);
        const isLine = (frac < lt) || (frac > 1 - lt);

        let c = 0;
        if (filled) {
          const band = (Math.floor(f) % 2);
          c = band ? 50 : 0;
        }
        if (isLine) c = 255;

        // Color grade
        let n = c / 255;
        n = (n - 0.5) * contrast + 0.5;
        n *= bright;
        n = Math.max(0, Math.min(1, n));
        const out = Math.floor(n * 255);

        const i = (x + y * w) * 4;
        gl.pixels[i + 0] = out;
        gl.pixels[i + 1] = out;
        gl.pixels[i + 2] = out;
        gl.pixels[i + 3] = 255; // Alpha
      }
    }

    gl.updatePixels();

    // Draw result to the high-res output buffer
    gOut.push();
    gOut.noSmooth();
    // Assuming gOut is WEBGL, coordinates are centered.
    gOut.translate(-gOut.width/2, -gOut.height/2);
    gOut.image(gl, 0, 0, gOut.width, gOut.height);
    gOut.pop();
  }

  // --- COMPUTATIONAL MANIFOLD RENDERER ---
  render3D(g: p5Types.Graphics, params: SimParams, t: number) {
    g.push();
    g.translate(-OUTPUT_W / 2, -OUTPUT_H / 2); // Center

    // 1. MATERIAL CONFIG
    if (params.wireframe) {
        g.strokeWeight(1);
        g.noFill();
    } else {
        g.noStroke();
        g.fill(10, 10, 20); 
        g.specularMaterial(100, 200, 255);
        g.shininess(params.materialShininess);
    }

    // DRAW FLOOR
    this.drawGridMesh(g, params, t, false);

    // DRAW CEILING (Mirror)
    if (params.mirrorTerrain) {
        g.push();
        // Move up and mirror Y
        g.translate(OUTPUT_W/2, OUTPUT_H/2, 600); // Center of transform
        g.scale(1, -1, 1);
        g.translate(-OUTPUT_W/2, -OUTPUT_H/2, 0); // Back to corner
        
        // Dim the mirror slightly
        if (params.wireframe) g.strokeWeight(0.5);
        else g.fill(5, 5, 10);
        
        this.drawGridMesh(g, params, t, true);
        g.pop();
    }

    g.pop();
  }

  private drawGridMesh(g: p5Types.Graphics, params: SimParams, t: number, isMirror: boolean) {
    const w = this.gridW;
    const h = this.gridH;
    
    // Scale factors
    const cellW = OUTPUT_W / (w - 1);
    const cellH = OUTPUT_H / (h - 1);
    const zScale = 450 * params.brightness; 
    
    const cx = w/2;
    const cy = h/2;

    for (let y = 0; y < h - 1; y++) {
      g.beginShape(g.TRIANGLE_STRIP);
      
      for (let x = 0; x < w; x++) {
        
        let h1 = this.h[this.idx(x, y)];
        let h2 = this.h[this.idx(x, y + 1)];

        // Basic Math Interference
        const d1 = Math.sqrt((x-cx)**2 + (y-cy)**2);
        const d2 = Math.sqrt((x-cx)**2 + (y+1-cy)**2);
        
        const mathAmp = 0.05 * params.contrast;
        const math1 = (Math.sin(d1 * 0.15 - t * 1.5) + Math.cos(x * 0.2 + t)) * mathAmp;
        const math2 = (Math.sin(d2 * 0.15 - t * 1.5) + Math.cos(x * 0.2 + t)) * mathAmp;
        
        // Horizon Curvature (Bending the world)
        // Drops Z as distance from center increases
        const curve1 = (d1 * d1) * 0.00008;
        const curve2 = (d2 * d2) * 0.00008;

        const z1 = (h1 + math1) * zScale - curve1;
        const z2 = (h2 + math2) * zScale - curve2;

        if (params.wireframe) {
            const val = h1 + math1 + 0.2; 
            const r = g.map(Math.sin(val * 15 + t), -1, 1, 20, 100);
            const gr = g.map(val, 0, 0.4, 100, 255);
            const b = 255;
            // Mirror looks cooler with different color
            const alpha = (100 + params.contrast * 80) * (isMirror ? 0.4 : 1.0);
            
            if (isMirror) g.stroke(r, 0, b, alpha); // Purple/Pink mirror
            else g.stroke(r, gr, b, alpha);
        } else {
             // Solid Mode
             if (!isMirror) {
                if ((x + y) % 2 === 0) g.fill(15, 15, 25);
                else g.fill(25, 25, 40);
             }
        }

        g.vertex(x * cellW, y * cellH, z1);
        g.vertex(x * cellW, (y + 1) * cellH, z2);
      }
      g.endShape();
    }
    
    // Derivative Lines (Only on main floor to save perf)
    if (params.wireframe && !isMirror) {
        g.stroke(255, 0, 100, 150);
        g.strokeWeight(1);
        g.beginShape(g.LINES);
        
        const skip = 6;
        for(let y=0; y<h; y+=skip) {
            for(let x=0; x<w; x+=skip) {
                 const i = this.idx(x,y);
                 const hVal = this.h[i];
                 const vVal = this.v[i]; 
                 
                 const d = Math.sqrt((x-cx)**2 + (y-cy)**2);
                 const math = (Math.sin(d * 0.15 - t * 1.5) + Math.cos(x * 0.2 + t)) * (0.05 * params.contrast);
                 const curve = (d * d) * 0.00008;
                 const z = (hVal + math) * zScale - curve;
                 
                 const len = 15 + Math.abs(vVal) * 8000; 
                 
                 g.vertex(x * cellW, y * cellH, z);
                 g.vertex(x * cellW, y * cellH, z + len);
            }
        }
        g.endShape();
    }
  }
}