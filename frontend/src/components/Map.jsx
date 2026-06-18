import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { socket } from '../socket';

const GRID_SIZE = 100;
const TILE_SIZE = 20;

export default function Map() {
  const canvasRef = useRef(null);
  const { tiles, user } = useStore();
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Resize canvas
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.save();
      ctx.translate(offset.x, offset.y);
      ctx.scale(scale, scale);

      // Draw grid background
      ctx.fillStyle = '#1e293b'; // slate-800
      ctx.fillRect(0, 0, GRID_SIZE * TILE_SIZE, GRID_SIZE * TILE_SIZE);

      // Draw tiles
      for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
          const key = `${x},${y}`;
          const tile = tiles[key];
          
          if (tile && tile.owner) {
            ctx.fillStyle = tile.owner.color;
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE - 1, TILE_SIZE - 1);
          } else {
            ctx.fillStyle = '#334155'; // slate-700
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE - 1, TILE_SIZE - 1);
          }
        }
      }

      ctx.restore();
    };

    render();
  }, [tiles, offset, scale]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    const zoomSensitivity = 0.001;
    let newScale = scale - e.deltaY * zoomSensitivity;
    newScale = Math.min(Math.max(0.5, newScale), 5); // Zoom between 0.5x and 5x
    setScale(newScale);
  };

  const handleClick = (e) => {
    // Only capture if we didn't drag
    if (isDragging) return; // Simple check, might need better drag detection

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const mapX = Math.floor((x - offset.x) / scale / TILE_SIZE);
    const mapY = Math.floor((y - offset.y) / scale / TILE_SIZE);

    if (mapX >= 0 && mapX < GRID_SIZE && mapY >= 0 && mapY < GRID_SIZE) {
      if (!user) return; // Must be logged in
      socket.emit('capture_tile', { x: mapX, y: mapY });
    }
  };

  return (
    <div className="w-full h-full overflow-hidden bg-slate-950 relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
      />
      <div className="absolute bottom-4 right-4 bg-slate-800 text-white px-3 py-1 rounded shadow text-sm">
        Zoom: {Math.round(scale * 100)}%
      </div>
    </div>
  );
}
