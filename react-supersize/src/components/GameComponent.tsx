import React, { useEffect, useRef, useState } from 'react';
import {PublicKey} from "@solana/web3.js";

interface Blob {
    authority: PublicKey;
    x: number;
    y: number;
    radius: number;
    mass: number;
    score: number;
    speed: number;
    charging: number;
}

interface Food {
  x: number;
  y: number;
}

interface GameComponentProps {
  gameId: PublicKey | null;
  players: Blob[];
  visibleFood: Food[];
  currentPlayer: Blob | null;
  screenSize: { width: number; height: number };
  scale: number;
}

const GameComponent: React.FC<GameComponentProps> = ({ gameId, players, visibleFood, currentPlayer, screenSize, scale }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [lastTime, setLastTime] = useState<number>(0);

  useEffect(() => {
    if (gameId !== null) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Set canvas size
          canvas.width = screenSize.width * scale;
          canvas.height = screenSize.height * scale;

          // Clear the canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw players
          players.forEach(blob => {
            drawPlayer(ctx, blob, scale);
          });

          // Draw food
          visibleFood.forEach(food => {
            drawFood(ctx, food, scale);
          });

          // Draw current player
          if (currentPlayer) {
            const centeredPlayer = {
              ...currentPlayer,
              x: screenSize.width / 2,
              y: screenSize.height / 2,
            };
            drawPlayer(ctx, centeredPlayer, scale);
            drawBorder(ctx, currentPlayer, screenSize, scale);
          }
        }
      }
    }
  }, [gameId, players, visibleFood, currentPlayer, screenSize, scale]);

  const drawPlayer = (ctx: CanvasRenderingContext2D, blob: Blob, scale: number) => {
    ctx.beginPath();
    ctx.arc(blob.x * scale, blob.y * scale, blob.radius * scale, 0, 2 * Math.PI);
    ctx.fillStyle = '#13F195'; // Change color as needed
    ctx.fill();
    ctx.stroke();

    // Draw the player's score at the center of the player
    ctx.fillStyle = 'black'; // Text color
    ctx.font = `${blob.radius * scale * 0.5}px Arial`; // Font size relative to the player radius
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(blob.score).toString(), blob.x * scale, blob.y * scale);
  };

  const drawFood = (ctx: CanvasRenderingContext2D, food: Food, scale: number) => {
    ctx.beginPath();
    ctx.arc(food.x * scale, food.y * scale, 10 * scale, 0, 2 * Math.PI);
    ctx.fillStyle = 'white'; // Change color as needed
    ctx.fill();
    ctx.stroke();
  };

  const drawBorder = (ctx: CanvasRenderingContext2D, currentPlayer: Blob, screenSize: { width: number; height: number }, scale: number) => {
    const gameSize = 1500;
    const offsetX = currentPlayer.x - screenSize.width / 2;
    const offsetY = currentPlayer.y - screenSize.height / 2;

    // Draw top border
    ctx.beginPath();
    ctx.moveTo((0 - offsetX) * scale, (0 - offsetY) * scale);
    ctx.lineTo((gameSize - offsetX) * scale, (0 - offsetY) * scale);
    ctx.strokeStyle = 'red';
    ctx.stroke();

    // Draw right border
    ctx.beginPath();
    ctx.moveTo((gameSize - offsetX) * scale, (0 - offsetY) * scale);
    ctx.lineTo((gameSize - offsetX) * scale, (gameSize - offsetY) * scale);
    ctx.strokeStyle = 'red';
    ctx.stroke();

    // Draw bottom border
    ctx.beginPath();
    ctx.moveTo((gameSize - offsetX) * scale, (gameSize - offsetY) * scale);
    ctx.lineTo((0 - offsetX) * scale, (gameSize - offsetY) * scale);
    ctx.strokeStyle = 'red';
    ctx.stroke();

    // Draw left border
    ctx.beginPath();
    ctx.moveTo((0 - offsetX) * scale, (gameSize - offsetY) * scale);
    ctx.lineTo((0 - offsetX) * scale, (0 - offsetY) * scale);
    ctx.strokeStyle = 'red';
    ctx.stroke();
};

  return (
      <canvas id="gamecanvas" ref={canvasRef} style={{ position: "relative", width: "100%", height: "100%",display: gameId !== null ? 'block' : 'none' }}></canvas>
  );
};

export default GameComponent;
