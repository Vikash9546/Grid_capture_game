import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { socket } from '../socket';

const GRID_SIZE = 100;
const TILE_SIZE = 30;

export default function Map() {
  const canvasRef = useRef(null);
  const { tiles, user, updateTile, logs } = useStore();
  const [offset, setOffset] = useState({ x: -TILE_SIZE * 20, y: -TILE_SIZE * 20 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoverTile, setHoverTile] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const resize = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      // Very dark background matching the image
      ctx.fillStyle = '#101415';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.save();
      ctx.translate(offset.x, offset.y);
      ctx.scale(scale, scale);

      // Aesthetic background elements (Giant Radar Circle)
      ctx.strokeStyle = 'rgba(139, 145, 157, 0.2)'; // text-outline very faint
      ctx.setLineDash([4 / scale, 6 / scale]);
      ctx.lineWidth = 1 / scale;
      ctx.beginPath();
      // Draw a big circle in the middle of the grid
      ctx.arc((GRID_SIZE * TILE_SIZE) / 2, (GRID_SIZE * TILE_SIZE) / 2, TILE_SIZE * 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Grid Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1 / scale;
      ctx.beginPath();
      for (let x = 0; x <= GRID_SIZE; x++) {
        ctx.moveTo(x * TILE_SIZE, 0);
        ctx.lineTo(x * TILE_SIZE, GRID_SIZE * TILE_SIZE);
      }
      for (let y = 0; y <= GRID_SIZE; y++) {
        ctx.moveTo(0, y * TILE_SIZE);
        ctx.lineTo(GRID_SIZE * TILE_SIZE, y * TILE_SIZE);
      }
      ctx.stroke();

      // Draw Tiles
      for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
          const tile = tiles[`${x},${y}`];
          if (tile && tile.owner) {
            
            ctx.fillStyle = tile.owner.color;
            ctx.globalAlpha = 0.5;
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            ctx.globalAlpha = 1.0;

            // Center dot
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillRect(x * TILE_SIZE + TILE_SIZE/2 - 1, y * TILE_SIZE + TILE_SIZE/2 - 1, 2, 2);

            // Hatching for protected or aesthetic
            if (tile.capturedAt && (Date.now() - new Date(tile.capturedAt).getTime() < 5000)) {
               ctx.strokeStyle = 'rgba(255,255,255,0.3)';
               ctx.lineWidth = 2 / scale;
               ctx.beginPath();
               for(let i= -TILE_SIZE; i< TILE_SIZE*2; i+=6) {
                 ctx.moveTo(x * TILE_SIZE + i, y * TILE_SIZE);
                 ctx.lineTo(x * TILE_SIZE + i - TILE_SIZE, y * TILE_SIZE + TILE_SIZE);
               }
               ctx.stroke();
            } else if ((x + y) % 7 === 0) {
               ctx.strokeStyle = 'rgba(0,0,0,0.3)';
               ctx.lineWidth = 2 / scale;
               ctx.beginPath();
               for(let i= -TILE_SIZE; i< TILE_SIZE*2; i+=6) {
                 ctx.moveTo(x * TILE_SIZE + i, y * TILE_SIZE);
                 ctx.lineTo(x * TILE_SIZE + i - TILE_SIZE, y * TILE_SIZE + TILE_SIZE);
               }
               ctx.stroke();
            }
          }
        }
      }

      // Draw Hover Box and Targeting Line
      if (hoverTile) {
        const tx = hoverTile.x * TILE_SIZE;
        const ty = hoverTile.y * TILE_SIZE;
        
        // Target Box around tile
        ctx.strokeStyle = 'rgba(139, 145, 157, 0.5)';
        ctx.lineWidth = 1 / scale;
        
        // Draw brackets instead of full rect
        const s = 6 / scale; // bracket size
        ctx.beginPath();
        // Top Left
        ctx.moveTo(tx, ty + s); ctx.lineTo(tx, ty); ctx.lineTo(tx + s, ty);
        // Top Right
        ctx.moveTo(tx + TILE_SIZE - s, ty); ctx.lineTo(tx + TILE_SIZE, ty); ctx.lineTo(tx + TILE_SIZE, ty + s);
        // Bottom Right
        ctx.moveTo(tx + TILE_SIZE, ty + TILE_SIZE - s); ctx.lineTo(tx + TILE_SIZE, ty + TILE_SIZE); ctx.lineTo(tx + TILE_SIZE - s, ty + TILE_SIZE);
        // Bottom Left
        ctx.moveTo(tx + s, ty + TILE_SIZE); ctx.lineTo(tx, ty + TILE_SIZE); ctx.lineTo(tx, ty + TILE_SIZE - s);
        ctx.stroke();

        // Target Line connecting to tooltip
        // Tooltip will be drawn in HTML, but we draw the connecting line in canvas
        const cx = tx + TILE_SIZE / 2;
        const cy = ty + TILE_SIZE / 2;
        const tooltipX = cx - TILE_SIZE * 4;
        const tooltipY = cy - TILE_SIZE * 5;

        ctx.strokeStyle = 'rgba(139, 145, 157, 0.4)';
        ctx.setLineDash([2 / scale, 2 / scale]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(tooltipX + TILE_SIZE, tooltipY + TILE_SIZE);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();
    };

    let animationFrameId;
    const loop = () => {
      render();
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [tiles, offset, scale, hoverTile]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
      setHoverTile(null);
    } else {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const mapX = Math.floor((x - offset.x) / scale / TILE_SIZE);
      const mapY = Math.floor((y - offset.y) / scale / TILE_SIZE);
      
      if (mapX >= 0 && mapX < GRID_SIZE && mapY >= 0 && mapY < GRID_SIZE) {
        setHoverTile({ x: mapX, y: mapY });
      } else {
        setHoverTile(null);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    const zoomSensitivity = 0.002;
    let newScale = scale - e.deltaY * zoomSensitivity;
    newScale = Math.min(Math.max(0.3, newScale), 3);
    setScale(newScale);
  };

  const handleClick = (e) => {
    if (isDragging) return;
    if (hoverTile && user) {
      const tile = tiles[`${hoverTile.x},${hoverTile.y}`];
      if (tile && tile.capturedAt) {
        const timeSinceCapture = Date.now() - new Date(tile.capturedAt).getTime();
        if (timeSinceCapture < 5000) return; // Protected
      }

      const tileId = tile ? tile.id : `${hoverTile.x},${hoverTile.y}`;

      // Optimistic UI Update: Instantly fill with user's selected color
      updateTile({
        id: tileId,
        x: hoverTile.x,
        y: hoverTile.y,
        ownerId: user.id,
        owner: user,
        capturedAt: new Date().toISOString()
      });

      socket.emit('capture_tile', { tileId });
    }
  };

  return (
    <div className="w-full h-full overflow-hidden relative font-mono bg-[#101415]">
      
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); setHoverTile(null); }}
        onWheel={handleWheel}
        onClick={handleClick}
      />

      {/* Hover Info Tooltip */}
      {hoverTile && (
        <div 
          className="absolute pointer-events-none border border-[#414751] bg-[#191c1e]/80 px-3 py-1.5 text-[#e0e3e5] font-mono text-[10px] tracking-[0.1em] uppercase whitespace-nowrap z-10"
          style={{
            left: offset.x + (hoverTile.x * scale * TILE_SIZE) - (TILE_SIZE * scale * 4),
            top: offset.y + (hoverTile.y * scale * TILE_SIZE) - (TILE_SIZE * scale * 6),
          }}
        >
          SECTOR_LAT_40.{hoverTile.y.toString().padStart(2, '0')} // LON_74.{hoverTile.x.toString().padStart(2, '0')}
        </div>
      )}

      {/* Operational Logs Panel */}
      <div className="absolute bottom-6 left-6 w-[360px] bg-[#191c1e]/90 border border-[#414751] p-5 text-[10px] tracking-[0.1em] text-[#8b919d] font-mono uppercase shadow-xl z-20">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#414751]/50">
          <span className="font-bold tracking-[0.15em] text-[#e0e3e5]">OPERATIONAL_LOGS</span>
          <div className="w-1.5 h-1.5 bg-[#60a5fa]" />
        </div>
        <div className="space-y-2">
          {logs.map((log, i) => (
            <div key={i} className="flex leading-relaxed">
              <span className="text-[#a4c9ff] mr-3 whitespace-nowrap">[{log.time}]</span>
              <span className="flex-1 whitespace-pre-wrap">{log.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Right Minimap and Controls */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end z-20">
        
        {/* Fake Minimap Box */}
        <div className="w-32 h-32 border border-[#414751] bg-[#101415]/80 mb-3 relative shadow-xl overflow-hidden">
          <div className="absolute inset-0 bg-[#264191]/5 opacity-50" />
          {/* Faint minimap grid/tiles representation */}
          <div className="absolute top-4 left-4 w-4 h-4 bg-[#60a5fa]/40 border border-[#60a5fa]" />
          <div className="absolute top-6 left-5 w-4 h-4 bg-[#60a5fa]/20 border border-[#60a5fa]" />
          <div className="absolute bottom-6 right-6 w-8 h-8 border border-[#414751]" />
          {/* Hatched lines in minimap just for aesthetic */}
          <div className="absolute bottom-6 right-6 w-8 h-8 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, #fff 2px, #fff 4px)' }} />
        </div>

        {/* Zoom Controls */}
        <div className="flex flex-col bg-[#191c1e] border border-[#414751] text-[#8b919d]">
          <button className="p-2.5 hover:bg-[#272a2c] hover:text-[#e0e3e5] transition-colors border-b border-[#414751]" onClick={() => setScale(s => Math.min(3, s + 0.2))}>
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
          <button className="p-2.5 hover:bg-[#272a2c] hover:text-[#e0e3e5] transition-colors border-b border-[#414751]" onClick={() => setScale(s => Math.max(0.3, s - 0.2))}>
            <span className="material-symbols-outlined text-[20px]">remove</span>
          </button>
          <button className="p-2.5 hover:bg-[#272a2c] hover:text-[#e0e3e5] transition-colors" onClick={() => { setScale(1); setOffset({x: -TILE_SIZE*20, y: -TILE_SIZE*20}); }}>
            <span className="material-symbols-outlined text-[20px]">my_location</span>
          </button>
        </div>
      </div>

    </div>
  );
}
