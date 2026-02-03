import p5Types from 'p5';
import { SimParams } from '../types';
import { FluidTerrain } from './FluidTerrain';
import { OUTPUT_W, OUTPUT_H } from '../constants';

class Boid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: {x: number, y: number, z: number}[] = [];

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const a = Math.random() * Math.PI * 2;
    this.vx = Math.cos(a) * 2;
    this.vy = Math.sin(a) * 2;
  }
}

export class SwarmSystem {
  w: number;
  h: number;
  boids: Boid[] = [];
  spike: number = 0;
  spikeDecay: number = 0.92;

  constructor(w: number, h: number, count = 100) {
    this.w = w;
    this.h = h;
    this.setCount(count);
  }

  setCount(n: number) {
    n = Math.max(0, Math.floor(n));
    while (this.boids.length < n) this.boids.push(new Boid(Math.random() * this.w, Math.random() * this.h));
    while (this.boids.length > n) this.boids.pop();
  }

  triggerLiftSpike() {
    this.spike = 1;
  }

  update(params: SimParams, padForces: Array<{x: number, y: number, dir: number, strength: number}>) {
    const cohesionW = params.boidsCohesion;
    const alignW = params.boidsAlignment;
    const sepW = params.boidsSeparation;

    const maxSpeedBase = 2.2;
    const maxSpeed = maxSpeedBase + this.spike * 3.8;
    const neighDist = 46;
    const sepDist = 24;

    this.spike *= this.spikeDecay;

    for (let i = 0; i < this.boids.length; i++) {
      const b = this.boids[i];
      let cx = 0, cy = 0; // Cohesion center
      let ax = 0, ay = 0; // Alignment vector
      let sx = 0, sy = 0; // Separation vector
      let count = 0;

      for (let j = 0; j < this.boids.length; j++) {
        if (i === j) continue;
        const o = this.boids[j];
        const dx = o.x - b.x;
        const dy = o.y - b.y;
        const d = Math.hypot(dx, dy);
        
        if (d < neighDist) {
          cx += o.x; cy += o.y;
          ax += o.vx; ay += o.vy;
          count++;
          if (d < sepDist && d > 0.001) {
            sx -= dx / d;
            sy -= dy / d;
          }
        }
      }

      let fx = 0, fy = 0;

      if (count > 0) {
        cx /= count; cy /= count;
        // Cohesion
        fx += (cx - b.x) * 0.0018 * cohesionW;
        fy += (cy - b.y) * 0.0018 * cohesionW;
        // Alignment
        fx += (ax / count - b.vx) * 0.020 * alignW;
        fy += (ay / count - b.vy) * 0.020 * alignW;
        // Separation
        fx += sx * 0.060 * sepW;
        fy += sy * 0.060 * sepW;
      }

      // External Forces (Pedestals/Sensors)
      for (const pf of padForces) {
        const dx = b.x - pf.x;
        const dy = b.y - pf.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        const fall = Math.max(0, 1 - d / 260);

        const tx = -dy / d;
        const ty = dx / d;

        // Swirl force
        const swirl = (0.018 + this.spike * 0.05) * fall * pf.strength;
        fx += tx * swirl * pf.dir;
        fy += ty * swirl * pf.dir;

        // Repel force
        const repel = (0.010 + this.spike * 0.04) * fall * pf.strength;
        fx += (dx / d) * repel;
        fy += (dy / d) * repel;
      }

      // Random jitter
      fx += (Math.random() - 0.5) * (0.02 + this.spike * 0.06);
      fy += (Math.random() - 0.5) * (0.02 + this.spike * 0.06);

      b.vx += fx;
      b.vy += fy;

      // Limit speed
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > maxSpeed) {
        b.vx = (b.vx / sp) * maxSpeed;
        b.vy = (b.vy / sp) * maxSpeed;
      }

      b.x += b.vx;
      b.y += b.vy;

      // Wrap edges
      if (b.x < 0) b.x += this.w;
      if (b.y < 0) b.y += this.h;
      if (b.x > this.w) b.x -= this.w;
      if (b.y > this.h) b.y -= this.h;
    }
  }

  draw(g: p5Types.Graphics, alpha: number) {
    g.push();
    g.noStroke();
    g.fill(255, alpha);

    for (const b of this.boids) {
      const ang = Math.atan2(b.vy, b.vx);
      const s = 6 + this.spike * 8;

      g.push();
      g.translate(b.x, b.y);
      g.rotate(ang);
      g.beginShape();
      g.vertex(s, 0);
      g.vertex(-s * 0.6, s * 0.45);
      g.vertex(-s * 0.6, -s * 0.45);
      g.endShape(g.CLOSE);
      g.pop();
    }
    g.pop();
  }

  draw3D(g: p5Types.Graphics, terrain: FluidTerrain, params: SimParams, t: number) {
    g.push();
    
    // Aesthetic: Neon Crystal Swarm
    g.noStroke();
    
    if (params.wireframe) {
        g.emissiveMaterial(255, 0, 150);
        g.fill(255, 0, 150);
    } else {
        g.fill(255, 100, 200);
        g.specularMaterial(255, 255, 255);
        g.shininess(100);
    }

    const zScale = 450 * params.brightness; 
    
    // Cache math constants
    const cx = OUTPUT_W/2;
    const cy = OUTPUT_H/2;
    const gcx = terrain.gridW/2;
    const gcy = terrain.gridH/2;
    const mathAmp = 0.05 * params.contrast;

    for (const b of this.boids) {
        const u = b.x / OUTPUT_W;
        const v = b.y / OUTPUT_H;
        
        // Skip if OOB (though warp handles this)
        if (u < 0 || u > 1 || v < 0 || v > 1) continue;

        const hVal = terrain.sample(u, v);
        
        const gx = u * terrain.gridW;
        const gy = v * terrain.gridH;
        
        const d = Math.sqrt((gx-gcx)**2 + (gy-gcy)**2);
        const math = (Math.sin(d * 0.15 - t * 1.5) + Math.cos(gx * 0.2 + t)) * mathAmp;
        
        // Match Terrain Curvature
        const dWorld = Math.sqrt((b.x - cx)**2 + (b.y - cy)**2);
        const curve = (dWorld * dWorld) * 0.00008;

        const z = (hVal + math) * zScale - curve + 40; 
        
        // Store Trail
        b.trail.push({ x: b.x - cx, y: b.y - cy, z: z });
        if (b.trail.length > 25) b.trail.shift();

        // Draw Trail (Ribbons)
        if (params.showTrails && b.trail.length > 2) {
            g.push();
            g.noFill();
            g.strokeWeight(1.5);
            g.stroke(255, 0, 200, 150);
            g.beginShape();
            for (const p of b.trail) {
               g.vertex(p.x, p.y, p.z);
            }
            g.endShape();
            g.pop();
            // Reset material after stroke change
             if (params.wireframe) {
                g.emissiveMaterial(255, 0, 150);
                g.fill(255, 0, 150);
                g.noStroke();
            } else {
                g.fill(255, 100, 200);
                g.specularMaterial(255, 255, 255);
                g.noStroke();
            }
        }

        // Draw Boid
        const ang = Math.atan2(b.vy, b.vx);
        
        g.push();
        g.translate(b.x - cx, b.y - cy, z);
        g.rotateZ(ang);
        g.rotateY(Math.PI / 2);
        g.cone(6, 18, 4, 1); 
        g.pop();
    }
    g.pop();
  }
}