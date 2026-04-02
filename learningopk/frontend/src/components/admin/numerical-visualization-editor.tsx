"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { RotateCcw, ChevronDown, Code2, Eye, Beaker } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   Templates — Complete, working HTML documents for physics
   ═══════════════════════════════════════════════════════════════ */

const GRAVITY_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      font-family: 'Segoe UI', system-ui, sans-serif;
      color: #e2e8f0;
    }
    canvas { border-radius: 12px; background: #1e293b; }
    .controls {
      margin-top: 16px;
      display: flex;
      gap: 12px;
      align-items: center;
    }
    button {
      background: #7ac943;
      color: #0f172a;
      border: none;
      padding: 10px 28px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    button:hover { background: #6bb836; }
    .legend {
      display: flex;
      gap: 24px;
      margin-top: 12px;
      font-size: 13px;
    }
    .legend span {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
    }
  </style>
</head>
<body>
  <canvas id="canvas" width="520" height="360"></canvas>
  <div class="controls">
    <button id="startBtn">Start</button>
  </div>
  <div class="legend">
    <span><span class="dot" style="background:#7ac943"></span> Earth (g = 9.8 m/s²)</span>
    <span><span class="dot" style="background:#38bdf8"></span> Moon (g = 1.6 m/s²)</span>
  </div>
  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const btn = document.getElementById('startBtn');

    const W = canvas.width;
    const H = canvas.height;
    const gEarth = 9.8;
    const gMoon = 1.6;
    const scale = 28;
    const groundY = H - 40;
    const startY = 50;
    const radius = 16;

    let earthY = startY;
    let moonY = startY;
    let earthV = 0;
    let moonV = 0;
    let running = false;
    let lastTime = 0;

    function drawScene() {
      ctx.clearRect(0, 0, W, H);

      // Ground line
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(20, groundY);
      ctx.lineTo(W - 20, groundY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Height markers
      ctx.fillStyle = '#475569';
      ctx.font = '11px system-ui';
      for (let h = 0; h <= 10; h += 2) {
        const py = groundY - h * scale;
        if (py < startY - 10) break;
        ctx.fillText(h + 'm', 4, py + 4);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(32, py);
        ctx.lineTo(W - 20, py);
        ctx.stroke();
      }

      // Column labels
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('EARTH', W * 0.33, 30);
      ctx.fillText('MOON', W * 0.67, 30);
      ctx.textAlign = 'left';

      // Earth ball
      ctx.beginPath();
      ctx.arc(W * 0.33, Math.min(earthY, groundY - radius), radius, 0, Math.PI * 2);
      ctx.fillStyle = '#7ac943';
      ctx.fill();
      ctx.strokeStyle = '#5da832';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Moon ball
      ctx.beginPath();
      ctx.arc(W * 0.67, Math.min(moonY, groundY - radius), radius, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
      ctx.strokeStyle = '#0ea5e9';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Velocity labels
      ctx.font = '12px system-ui';
      ctx.fillStyle = '#7ac943';
      ctx.textAlign = 'center';
      ctx.fillText('v = ' + earthV.toFixed(1) + ' m/s', W * 0.33, Math.min(earthY, groundY - radius) - 24);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('v = ' + moonV.toFixed(1) + ' m/s', W * 0.67, Math.min(moonY, groundY - radius) - 24);
      ctx.textAlign = 'left';
    }

    function animate(timestamp) {
      if (!running) return;
      if (!lastTime) lastTime = timestamp;
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;

      const earthLanded = earthY >= groundY - radius;
      const moonLanded = moonY >= groundY - radius;

      if (!earthLanded) {
        earthV += gEarth * dt;
        earthY += earthV * scale * dt;
      }
      if (!moonLanded) {
        moonV += gMoon * dt;
        moonY += moonV * scale * dt;
      }

      drawScene();

      if (!earthLanded || !moonLanded) {
        requestAnimationFrame(animate);
      } else {
        running = false;
        btn.textContent = 'Reset';
      }
    }

    btn.addEventListener('click', function () {
      if (running) return;
      earthY = startY;
      moonY = startY;
      earthV = 0;
      moonV = 0;
      lastTime = 0;
      running = true;
      btn.textContent = 'Running...';
      requestAnimationFrame(animate);
    });

    drawScene();
  </script>
</body>
</html>`;

const PROJECTILE_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      font-family: 'Segoe UI', system-ui, sans-serif;
      color: #e2e8f0;
    }
    canvas { border-radius: 12px; background: #1e293b; }
    .controls {
      margin-top: 16px;
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
      justify-content: center;
    }
    label {
      font-size: 13px;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    input[type="range"] {
      width: 100px;
      accent-color: #7ac943;
    }
    button {
      background: #7ac943;
      color: #0f172a;
      border: none;
      padding: 10px 28px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    button:hover { background: #6bb836; }
    .info {
      margin-top: 10px;
      font-size: 12px;
      color: #64748b;
      text-align: center;
    }
  </style>
</head>
<body>
  <canvas id="canvas" width="560" height="360"></canvas>
  <div class="controls">
    <label>Angle: <input type="range" id="angleSlider" min="15" max="80" value="45" /> <span id="angleVal">45°</span></label>
    <label>Speed: <input type="range" id="speedSlider" min="10" max="50" value="30" /> <span id="speedVal">30 m/s</span></label>
    <button id="launchBtn">Launch</button>
  </div>
  <div class="info" id="infoText">Adjust angle and speed, then press Launch.</div>
  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const angleSlider = document.getElementById('angleSlider');
    const speedSlider = document.getElementById('speedSlider');
    const angleVal = document.getElementById('angleVal');
    const speedVal = document.getElementById('speedVal');
    const launchBtn = document.getElementById('launchBtn');
    const infoText = document.getElementById('infoText');

    const W = canvas.width;
    const H = canvas.height;
    const g = 9.8;
    const originX = 50;
    const groundY = H - 50;
    const pxPerMeter = 4.5;

    let trail = [];
    let projX = 0;
    let projY = 0;
    let vx = 0;
    let vy = 0;
    let t = 0;
    let running = false;
    let animId = null;
    let maxHeight = 0;

    angleSlider.addEventListener('input', function () {
      angleVal.textContent = this.value + '°';
      if (!running) drawStatic();
    });
    speedSlider.addEventListener('input', function () {
      speedVal.textContent = this.value + ' m/s';
      if (!running) drawStatic();
    });

    function drawGrid() {
      ctx.strokeStyle = '#1a2536';
      ctx.lineWidth = 1;
      for (let x = originX; x < W; x += pxPerMeter * 10) {
        ctx.beginPath();
        ctx.moveTo(x, 20);
        ctx.lineTo(x, groundY);
        ctx.stroke();
      }
      for (let y = groundY; y > 20; y -= pxPerMeter * 10) {
        ctx.beginPath();
        ctx.moveTo(originX, y);
        ctx.lineTo(W - 20, y);
        ctx.stroke();
      }
      // Axes
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(originX, 20);
      ctx.lineTo(originX, groundY);
      ctx.lineTo(W - 20, groundY);
      ctx.stroke();

      // Axis labels
      ctx.fillStyle = '#475569';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'center';
      for (let d = 0; d <= 100; d += 20) {
        const px = originX + d * pxPerMeter;
        if (px > W - 30) break;
        ctx.fillText(d + 'm', px, groundY + 18);
      }
      ctx.textAlign = 'right';
      for (let h = 0; h <= 60; h += 10) {
        const py = groundY - h * pxPerMeter;
        if (py < 25) break;
        ctx.fillText(h + 'm', originX - 6, py + 4);
      }
    }

    function drawArrow(fromX, fromY, angle, length, color) {
      const toX = fromX + Math.cos(angle) * length;
      const toY = fromY - Math.sin(angle) * length;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();
      // Arrowhead
      const headLen = 8;
      const a1 = angle + Math.PI + 0.4;
      const a2 = angle + Math.PI - 0.4;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(toX + Math.cos(a1) * headLen, toY - Math.sin(a1) * headLen);
      ctx.lineTo(toX + Math.cos(a2) * headLen, toY - Math.sin(a2) * headLen);
      ctx.closePath();
      ctx.fill();
    }

    function drawStatic() {
      ctx.clearRect(0, 0, W, H);
      drawGrid();
      const angle = parseInt(angleSlider.value) * Math.PI / 180;
      // Launch direction arrow
      drawArrow(originX, groundY, angle, 50, '#7ac943');
      // Origin marker
      ctx.beginPath();
      ctx.arc(originX, groundY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#7ac943';
      ctx.fill();
    }

    function drawFrame() {
      ctx.clearRect(0, 0, W, H);
      drawGrid();

      // Trail
      if (trail.length > 1) {
        ctx.strokeStyle = 'rgba(122,201,67,0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) {
          ctx.lineTo(trail[i].x, trail[i].y);
        }
        ctx.stroke();

        // Trail dots
        for (let i = 0; i < trail.length; i += 3) {
          ctx.beginPath();
          ctx.arc(trail[i].x, trail[i].y, 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(122,201,67,0.5)';
          ctx.fill();
        }
      }

      // Projectile
      const screenX = originX + projX * pxPerMeter;
      const screenY = groundY - projY * pxPerMeter;

      ctx.beginPath();
      ctx.arc(screenX, screenY, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#7ac943';
      ctx.fill();
      ctx.strokeStyle = '#5da832';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Velocity vector
      const currentAngle = Math.atan2(vy, vx);
      const speed = Math.sqrt(vx * vx + vy * vy);
      drawArrow(screenX, screenY, currentAngle, Math.min(speed * 1.5, 60), '#f59e0b');

      // Height dashed line
      if (projY > 2) {
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX, groundY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(projY.toFixed(1) + 'm', screenX, screenY + (groundY - screenY) / 2);
      }

      // Range label
      if (projX > 5) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(projX.toFixed(1) + 'm', originX + projX * pxPerMeter / 2, groundY + 32);
      }
    }

    function animate() {
      if (!running) return;
      const dt = 0.04;
      t += dt;
      vx = vx;
      vy = vy - g * dt;
      projX += vx * dt;
      projY += vy * dt;

      if (projY > maxHeight) maxHeight = projY;

      const sx = originX + projX * pxPerMeter;
      const sy = groundY - projY * pxPerMeter;
      trail.push({ x: sx, y: sy });

      drawFrame();

      if (projY <= 0 && t > 0.1) {
        projY = 0;
        running = false;
        launchBtn.textContent = 'Reset';
        const range = projX;
        infoText.textContent = 'Range: ' + range.toFixed(1) + ' m | Max Height: ' + maxHeight.toFixed(1) + ' m | Time: ' + t.toFixed(2) + ' s';
        drawFrame();
        return;
      }
      animId = requestAnimationFrame(animate);
    }

    launchBtn.addEventListener('click', function () {
      if (running) return;
      if (launchBtn.textContent === 'Reset') {
        launchBtn.textContent = 'Launch';
        trail = [];
        drawStatic();
        infoText.textContent = 'Adjust angle and speed, then press Launch.';
        return;
      }
      const angle = parseInt(angleSlider.value) * Math.PI / 180;
      const speed = parseInt(speedSlider.value);
      vx = speed * Math.cos(angle);
      vy = speed * Math.sin(angle);
      projX = 0;
      projY = 0;
      t = 0;
      maxHeight = 0;
      trail = [];
      running = true;
      launchBtn.textContent = 'Running...';
      requestAnimationFrame(animate);
    });

    drawStatic();
  </script>
</body>
</html>`;

const SHM_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      font-family: 'Segoe UI', system-ui, sans-serif;
      color: #e2e8f0;
    }
    canvas { border-radius: 12px; background: #1e293b; }
    .controls {
      margin-top: 16px;
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
      justify-content: center;
    }
    label {
      font-size: 13px;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    input[type="range"] {
      width: 90px;
      accent-color: #7ac943;
    }
    button {
      background: #7ac943;
      color: #0f172a;
      border: none;
      padding: 10px 28px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    button:hover { background: #6bb836; }
    .info {
      margin-top: 10px;
      font-size: 12px;
      color: #64748b;
      text-align: center;
    }
  </style>
</head>
<body>
  <canvas id="canvas" width="480" height="420"></canvas>
  <div class="controls">
    <label>Length: <input type="range" id="lenSlider" min="80" max="220" value="160" /> <span id="lenVal">160 px</span></label>
    <label>Angle: <input type="range" id="ampSlider" min="5" max="45" value="25" /> <span id="ampVal">25°</span></label>
    <button id="toggleBtn">Start</button>
  </div>
  <div class="info" id="infoText">Simple pendulum — adjust length and initial angle.</div>
  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const lenSlider = document.getElementById('lenSlider');
    const ampSlider = document.getElementById('ampSlider');
    const lenVal = document.getElementById('lenVal');
    const ampVal = document.getElementById('ampVal');
    const toggleBtn = document.getElementById('toggleBtn');
    const infoText = document.getElementById('infoText');

    const W = canvas.width;
    const H = canvas.height;
    const pivotX = W / 2;
    const pivotY = 60;
    const g = 9.8;
    const bobRadius = 18;

    let ropeLen = 160;
    let amplitude = 25 * Math.PI / 180;
    let theta = amplitude;
    let omega = 0;
    let running = false;
    let lastTime = 0;
    let trailPoints = [];

    lenSlider.addEventListener('input', function () {
      ropeLen = parseInt(this.value);
      lenVal.textContent = ropeLen + ' px';
      if (!running) {
        theta = amplitude;
        omega = 0;
        trailPoints = [];
        drawScene();
      }
    });

    ampSlider.addEventListener('input', function () {
      amplitude = parseInt(this.value) * Math.PI / 180;
      ampVal.textContent = this.value + '°';
      if (!running) {
        theta = amplitude;
        omega = 0;
        trailPoints = [];
        drawScene();
      }
    });

    function drawScene() {
      ctx.clearRect(0, 0, W, H);

      // Ceiling
      ctx.fillStyle = '#334155';
      ctx.fillRect(pivotX - 60, pivotY - 6, 120, 6);
      for (let i = 0; i < 10; i++) {
        const hx = pivotX - 55 + i * 12;
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(hx, pivotY - 6);
        ctx.lineTo(hx - 6, pivotY - 14);
        ctx.stroke();
      }

      // Bob position
      const bobX = pivotX + ropeLen * Math.sin(theta);
      const bobY = pivotY + ropeLen * Math.cos(theta);

      // Trail (fading)
      if (trailPoints.length > 1) {
        for (let i = 1; i < trailPoints.length; i++) {
          const alpha = i / trailPoints.length * 0.4;
          ctx.strokeStyle = 'rgba(122,201,67,' + alpha + ')';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(trailPoints[i - 1].x, trailPoints[i - 1].y);
          ctx.lineTo(trailPoints[i].x, trailPoints[i].y);
          ctx.stroke();
        }
      }

      // Rope
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(bobX, bobY);
      ctx.stroke();

      // Angle arc
      const arcRadius = 40;
      const startAngle = Math.PI / 2;
      const endAngle = Math.PI / 2 - theta;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (theta >= 0) {
        ctx.arc(pivotX, pivotY, arcRadius, Math.min(startAngle, endAngle), Math.max(startAngle, endAngle));
      } else {
        ctx.arc(pivotX, pivotY, arcRadius, Math.min(endAngle, startAngle), Math.max(endAngle, startAngle));
      }
      ctx.stroke();

      // Angle label
      const labelAngle = (startAngle + endAngle) / 2;
      const labelX = pivotX + (arcRadius + 16) * Math.cos(labelAngle);
      const labelY = pivotY + (arcRadius + 16) * Math.sin(labelAngle);
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'center';
      const degreeDisplay = (theta * 180 / Math.PI).toFixed(1);
      ctx.fillText(degreeDisplay + '°', labelX, labelY);

      // Equilibrium line (dashed)
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(pivotX, pivotY + ropeLen + 30);
      ctx.stroke();
      ctx.setLineDash([]);

      // Bob
      const gradient = ctx.createRadialGradient(bobX - 4, bobY - 4, 2, bobX, bobY, bobRadius);
      gradient.addColorStop(0, '#9ae66e');
      gradient.addColorStop(1, '#5da832');
      ctx.beginPath();
      ctx.arc(bobX, bobY, bobRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle = '#4a8a28';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Pivot dot
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#64748b';
      ctx.fill();

      // Period info
      const lenMeters = ropeLen / 100;
      const period = 2 * Math.PI * Math.sqrt(lenMeters / g);
      ctx.fillStyle = '#64748b';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText('T = 2π√(L/g) = ' + period.toFixed(2) + ' s', 16, H - 16);
      ctx.fillText('L = ' + lenMeters.toFixed(2) + ' m', 16, H - 34);

      // Angular velocity
      ctx.textAlign = 'right';
      ctx.fillText('ω = ' + omega.toFixed(2) + ' rad/s', W - 16, H - 16);
    }

    function animate(timestamp) {
      if (!running) return;
      if (!lastTime) lastTime = timestamp;
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;

      // Equation of motion: d²θ/dt² = -(g/L)sin(θ)
      const lenMeters = ropeLen / 100;
      const alpha = -(g / lenMeters) * Math.sin(theta);
      omega += alpha * dt;
      omega *= 0.9995; // tiny damping
      theta += omega * dt;

      const bobX = pivotX + ropeLen * Math.sin(theta);
      const bobY = pivotY + ropeLen * Math.cos(theta);
      trailPoints.push({ x: bobX, y: bobY });
      if (trailPoints.length > 120) trailPoints.shift();

      drawScene();
      requestAnimationFrame(animate);
    }

    toggleBtn.addEventListener('click', function () {
      if (running) {
        running = false;
        toggleBtn.textContent = 'Resume';
        return;
      }
      if (toggleBtn.textContent === 'Start') {
        theta = amplitude;
        omega = 0;
        trailPoints = [];
      }
      running = true;
      lastTime = 0;
      toggleBtn.textContent = 'Pause';
      requestAnimationFrame(animate);
    });

    drawScene();
  </script>
</body>
</html>`;

const BLANK_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0f172a;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      font-family: 'Segoe UI', system-ui, sans-serif;
      color: #e2e8f0;
    }
    canvas {
      border-radius: 12px;
      background: #1e293b;
    }
  </style>
</head>
<body>
  <canvas id="canvas" width="480" height="360"></canvas>
  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    // Your visualization code here
    ctx.fillStyle = '#7ac943';
    ctx.font = 'bold 20px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Your visualization here', canvas.width / 2, canvas.height / 2);
  </script>
</body>
</html>`;

/* ═══════════════════════════════════════════════════════════════
   Template metadata
   ═══════════════════════════════════════════════════════════════ */

type TemplateKey = "gravity" | "projectile" | "shm" | "blank";

type TemplateEntry = {
  key: TemplateKey;
  label: string;
  description: string;
  code: string;
};

const TEMPLATES: TemplateEntry[] = [
  {
    key: "gravity",
    label: "Gravity Comparison",
    description: "Earth vs Moon free-fall animation",
    code: GRAVITY_TEMPLATE,
  },
  {
    key: "projectile",
    label: "Projectile Motion",
    description: "Adjustable angle & speed trajectory",
    code: PROJECTILE_TEMPLATE,
  },
  {
    key: "shm",
    label: "Simple Harmonic Motion",
    description: "Pendulum with angle measurement",
    code: SHM_TEMPLATE,
  },
  {
    key: "blank",
    label: "Blank Canvas",
    description: "Minimal HTML boilerplate",
    code: BLANK_TEMPLATE,
  },
];

/* ═══════════════════════════════════════════════════════════════
   Placeholder example for the textarea
   ═══════════════════════════════════════════════════════════════ */

const PLACEHOLDER_CODE = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; background: #1a1a2e; display: flex; justify-content: center; align-items: center; height: 100vh; }
    canvas { border-radius: 8px; }
  </style>
</head>
<body>
  <canvas id="canvas" width="400" height="300"></canvas>
  <script>
    // Your visualization code here
    const ctx = document.getElementById('canvas').getContext('2d');
    // Draw physics visualization...
  </script>
</body>
</html>`;

/* ═══════════════════════════════════════════════════════════════
   Props
   ═══════════════════════════════════════════════════════════════ */

type NumericalVisualizationEditorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

/* ═══════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════ */

export function NumericalVisualizationEditor({
  value,
  onChange,
  disabled = false,
  className,
}: NumericalVisualizationEditorProps) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const templateMenuRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Debounce preview updates ── */
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value]);

  /* ── Close template dropdown on outside click ── */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        templateMenuRef.current &&
        !templateMenuRef.current.contains(event.target as Node)
      ) {
        setTemplateMenuOpen(false);
      }
    }

    if (templateMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [templateMenuOpen]);

  const handleTemplateSelect = useCallback(
    (template: TemplateEntry) => {
      onChange(template.code);
      setTemplateMenuOpen(false);
    },
    [onChange],
  );

  const handleReset = useCallback(() => {
    onChange("");
  }, [onChange]);

  const handleCodeChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(event.target.value);
    },
    [onChange],
  );

  const hasContent = value.trim().length > 0;

  return (
    <div
      className={cn(
        "rounded-lg border border-border-default overflow-hidden",
        disabled && "opacity-60 pointer-events-none",
        className,
      )}
    >
      {/* ── Header Bar ── */}
      <div className="bg-bg-surface border-b border-border-default px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Code2 className="h-4 w-4 text-accent-primary shrink-0" />
          <span className="text-sm font-semibold text-text-primary">
            Visualization Code
          </span>
          {hasContent && (
            <Badge variant="primary" size="sm">
              HTML
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Template dropdown */}
          <div className="relative" ref={templateMenuRef}>
            <Button
              variant="secondary"
              size="sm"
              disabled={disabled}
              iconLeft={<Beaker />}
              iconRight={<ChevronDown />}
              onClick={() => setTemplateMenuOpen((prev) => !prev)}
              aria-expanded={templateMenuOpen}
              aria-haspopup="listbox"
            >
              Templates
            </Button>

            {templateMenuOpen && (
              <div
                className={cn(
                  "absolute right-0 top-full mt-1.5 z-50 w-72",
                  "rounded-lg border border-border-default",
                  "bg-bg-elevated shadow-[var(--shadow-elevated)]",
                  "animate-in fade-in-0 zoom-in-95 origin-top-right",
                  "py-1",
                )}
                role="listbox"
                aria-label="Visualization templates"
              >
                {TEMPLATES.map((template) => (
                  <button
                    key={template.key}
                    type="button"
                    role="option"
                    aria-selected={false}
                    className={cn(
                      "w-full text-left px-3 py-2.5 flex flex-col gap-0.5",
                      "transition-colors duration-100",
                      "hover:bg-bg-subtle focus-visible:bg-bg-subtle",
                      "focus-visible:outline-none",
                    )}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <span className="text-sm font-medium text-text-primary">
                      {template.label}
                    </span>
                    <span className="text-xs text-text-muted">
                      {template.description}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset button */}
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled || !hasContent}
            iconLeft={<RotateCcw />}
            onClick={handleReset}
            aria-label="Reset visualization code"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* ── Editor & Preview Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-border-default">
        {/* Code Editor Panel */}
        <div className="relative flex flex-col">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-[#0d1117] border-b border-[#1c2333]">
            <Code2 className="h-3.5 w-3.5 text-[#7ac943]" />
            <span className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">
              Editor
            </span>
          </div>
          <textarea
            value={value}
            onChange={handleCodeChange}
            disabled={disabled}
            placeholder={PLACEHOLDER_CODE}
            spellCheck={false}
            aria-label="HTML visualization code editor"
            className={cn(
              "flex-1 min-h-[420px] w-full resize-none",
              "bg-[#0d1117] text-[#e6edf3]",
              "font-mono text-sm leading-relaxed",
              "p-4 outline-none",
              "placeholder:text-[#484f58]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "selection:bg-[#264f78]",
            )}
            style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace" }}
          />
        </div>

        {/* Live Preview Panel */}
        <div className="relative flex flex-col border-t border-border-default lg:border-t-0">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-bg-surface border-b border-border-default">
            <Eye className="h-3.5 w-3.5 text-accent-primary" />
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Preview
            </span>
            {hasContent && (
              <span className="ml-auto flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-success animate-pulse" />
                <span className="text-[10px] text-text-muted">Live</span>
              </span>
            )}
          </div>

          <div className="flex-1 min-h-[420px] bg-[#0a0e17] relative">
            {hasContent ? (
              <iframe
                srcDoc={debouncedValue}
                sandbox="allow-scripts"
                title="Visualization preview"
                className="absolute inset-0 w-full h-full border-0"
                aria-label="Live preview of the visualization code"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
                <div className="h-14 w-14 rounded-xl bg-bg-subtle flex items-center justify-center">
                  <Eye className="h-6 w-6 text-text-muted" />
                </div>
                <p className="text-sm text-text-muted text-center leading-relaxed">
                  Write HTML/CSS/JS code or select a template
                  <br />
                  to see a live preview here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
