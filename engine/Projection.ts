import { Point } from '../types';
import p5Types from 'p5';

export class ProjectionMapping {
  corners: Point[] | null = null;
  dragIndex: number = -1;
  handleRadius: number = 16;
  
  ensureCorners(w: number, h: number) {
    if (!this.corners) {
      const m = Math.min(w, h) * 0.03;
      this.corners = [
        { x: m,     y: m },
        { x: w - m, y: m },
        { x: w - m, y: h - m },
        { x: m,     y: h - m },
      ];
    }
  }

  pickHandle(mx: number, my: number) {
    if (!this.corners) return -1;
    for (let i = 0; i < 4; i++) {
      const dx = mx - this.corners[i].x;
      const dy = my - this.corners[i].y;
      if (Math.hypot(dx, dy) <= this.handleRadius) return i;
    }
    return -1;
  }

  handleMousePressed(mx: number, my: number) {
    this.dragIndex = this.pickHandle(mx, my);
    return this.dragIndex !== -1;
  }

  handleMouseDragged(mx: number, my: number, w: number, h: number) {
    if (this.dragIndex < 0 || !this.corners) return;
    this.corners[this.dragIndex].x = Math.max(0, Math.min(w, mx));
    this.corners[this.dragIndex].y = Math.max(0, Math.min(h, my));
  }

  handleMouseReleased() {
    this.dragIndex = -1;
  }

  drawWarped(p: p5Types, texture: p5Types.Graphics | p5Types.Image) {
    if (!this.corners) this.ensureCorners(p.width, p.height);
    const c = this.corners!;

    p.push();
    p.background(0);
    p.noStroke();
    p.texture(texture);
    
    // Use Normal mode for mapping entire texture to quad
    p.textureMode(p.NORMAL);

    p.beginShape();
    // Top Left (0,0)
    p.vertex(c[0].x - p.width/2, c[0].y - p.height/2, 0, 0);
    // Top Right (1,0)
    p.vertex(c[1].x - p.width/2, c[1].y - p.height/2, 1, 0);
    // Bottom Right (1,1)
    p.vertex(c[2].x - p.width/2, c[2].y - p.height/2, 1, 1);
    // Bottom Left (0,1)
    p.vertex(c[3].x - p.width/2, c[3].y - p.height/2, 0, 1);
    
    p.endShape(p.CLOSE);
    p.textureMode(p.IMAGE);
    p.pop();
  }

  drawUI(p: p5Types) {
    if (!this.corners) return;
    const c = this.corners;
    
    p.push();
    p.noFill();
    p.stroke(0, 255, 255, 180);
    p.strokeWeight(2);
    
    // Draw Border
    p.beginShape();
    for (let i = 0; i < 4; i++) p.vertex(c[i].x - p.width/2, c[i].y - p.height/2);
    p.endShape(p.CLOSE);

    // Draw Handles
    for (let i = 0; i < 4; i++) {
      const hx = c[i].x - p.width/2;
      const hy = c[i].y - p.height/2;
      
      p.fill(0, 0, 0, 200);
      p.stroke(0, 255, 255);
      p.strokeWeight(2);
      p.circle(hx, hy, this.handleRadius * 2);
      
      p.fill(255);
      p.noStroke();
      p.textSize(12);
      p.textAlign(p.CENTER, p.CENTER);
      p.text(i+1, hx, hy);
    }
    p.pop();
  }
}
