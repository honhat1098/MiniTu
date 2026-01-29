import React, { useEffect, useRef, useState } from 'react';
import { NinjaGameState, WordEntity, Particle } from '../types';
import { playSound, toggleBackgroundMusic } from '../services/gameService';
import { Play, RotateCcw, ShieldAlert, Skull, Zap } from 'lucide-react';

// --- CONFIG ---
const BAD_WORDS = ["Đổ lỗi", "Quát tháo", "Chỉ trích", "Toxic", "Giận dữ", "Cố chấp", "Lờ đi", "Đá đểu", "Xúc phạm", "Bạo lực", "Thù hằn", "Ghen tị", "Ích kỷ"];
const GOOD_WORDS = ["Lắng nghe", "Thấu hiểu", "Xin lỗi", "Hợp tác", "Bình tĩnh", "Tôn trọng", "Chia sẻ", "Tha thứ", "Kiên nhẫn", "Hòa giải", "Cảm thông"];
const GRAVITY = 0.15;
const SPAWN_RATE = 60; // Frames between spawns

export const NinjaGame: React.FC = () => {
  const [gameState, setGameState] = useState<NinjaGameState>(NinjaGameState.MENU);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const entitiesRef = useRef<WordEntity[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const mousePathRef = useRef<{x: number, y: number}[]>([]);
  const frameCountRef = useRef(0);
  const difficultyRef = useRef(1);

  // --- GAME ENGINE ---
  const spawnWord = (width: number, height: number) => {
    const isBad = Math.random() > 0.3; // 70% chance of BAD words (Targets)
    const text = isBad 
      ? BAD_WORDS[Math.floor(Math.random() * BAD_WORDS.length)]
      : GOOD_WORDS[Math.floor(Math.random() * GOOD_WORDS.length)];
    
    // Random launch mechanics
    const x = Math.random() * (width - 100) + 50;
    const y = height + 50;
    // Calculate velocity to throw it towards the center-ish
    const vx = (width / 2 - x) * 0.01 + (Math.random() - 0.5) * 4; 
    const vy = -(Math.random() * 5 + 12 + difficultyRef.current); // Speed increases with difficulty

    const entity: WordEntity = {
      id: Math.random().toString(),
      text,
      type: isBad ? 'BAD' : 'GOOD',
      x,
      y,
      vx,
      vy,
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      color: isBad ? '#ff0055' : '#00b894', // Red for Bad, Green for Good
      radius: 40 + text.length * 5, // Rough collision radius
      sliced: false,
      scale: 1
    };
    entitiesRef.current.push(entity);
  };

  const createExplosion = (x: number, y: number, color: string) => {
    for (let i = 0; i < 15; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1.0,
        color: color,
        size: Math.random() * 5 + 2
      });
    }
  };

  const update = (width: number, height: number) => {
    // 1. Update Entities
    entitiesRef.current.forEach(e => {
      e.x += e.vx;
      e.y += e.vy;
      e.vy += GRAVITY;
      e.rotation += e.rotationSpeed;
    });

    // Remove off-screen entities
    entitiesRef.current = entitiesRef.current.filter(e => e.y < height + 100);

    // 2. Update Particles
    particlesRef.current.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += GRAVITY * 0.5;
      p.life -= 0.02;
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    // 3. Collision Detection (Mouse Path vs Entities)
    if (mousePathRef.current.length > 2) {
      const lastPoint = mousePathRef.current[mousePathRef.current.length - 1];
      const prevPoint = mousePathRef.current[mousePathRef.current.length - 2];
      
      // Check speed (only slice if moving fast enough)
      const dist = Math.hypot(lastPoint.x - prevPoint.x, lastPoint.y - prevPoint.y);
      
      if (dist > 5) {
        entitiesRef.current.forEach(e => {
           if (e.sliced) return;
           
           // Simple circle collision with the cursor
           const dx = e.x - lastPoint.x;
           const dy = e.y - lastPoint.y;
           const distance = Math.hypot(dx, dy);

           if (distance < e.radius) {
             e.sliced = true;
             
             if (e.type === 'BAD') {
               // SUCCESS
               playSound('slice');
               playSound('explosion');
               createExplosion(e.x, e.y, '#ff0055');
               setScore(prev => prev + 10);
               // Remove immediately
               entitiesRef.current = entitiesRef.current.filter(ent => ent.id !== e.id);
             } else {
               // FAIL
               playSound('wrong');
               createExplosion(e.x, e.y, '#00b894');
               setLives(prev => {
                 const newLives = prev - 1;
                 if (newLives <= 0) endGame();
                 return newLives;
               });
               // Remove immediately
               entitiesRef.current = entitiesRef.current.filter(ent => ent.id !== e.id);
             }
           }
        });
      }
    }

    // 4. Fade Mouse Path
    if (mousePathRef.current.length > 20) {
      mousePathRef.current.shift();
    }

    // 5. Spawning
    frameCountRef.current++;
    if (frameCountRef.current % Math.max(20, SPAWN_RATE - Math.floor(difficultyRef.current * 2)) === 0) {
      spawnWord(width, height);
    }
    
    // Increase difficulty slowly
    if (frameCountRef.current % 300 === 0) {
      difficultyRef.current += 0.5;
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);

    // Draw Entities
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    entitiesRef.current.forEach(e => {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.rotation);
      
      // Neon Glow
      ctx.shadowBlur = 20;
      ctx.shadowColor = e.color || '#fff';
      
      // Text Background
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.ellipse(0, 0, ctx.measureText(e.text).width / 2 + 20, 30, 0, 0, Math.PI * 2);
      ctx.fill();

      // Text
      ctx.font = `bold 24px Montserrat`;
      ctx.fillStyle = e.color || '#fff';
      ctx.fillText(e.text, 0, 0);
      
      ctx.restore();
    });

    // Draw Particles
    particlesRef.current.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Draw Mouse Trail (Glowing Blade)
    if (mousePathRef.current.length > 1) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Outer Glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00eaff'; // Cyan Blade
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 4;
      
      ctx.beginPath();
      ctx.moveTo(mousePathRef.current[0].x, mousePathRef.current[0].y);
      for (let i = 1; i < mousePathRef.current.length; i++) {
        ctx.lineTo(mousePathRef.current[i].x, mousePathRef.current[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }
  };

  const loop = () => {
    if (gameState !== NinjaGameState.PLAYING) return;
    
    const canvas = canvasRef.current;
    if (canvas) {
      update(canvas.width, canvas.height);
      const ctx = canvas.getContext('2d');
      if (ctx) draw(ctx, canvas.width, canvas.height);
    }
    requestRef.current = requestAnimationFrame(loop);
  };

  // --- CONTROLS ---

  const startGame = () => {
    setScore(0);
    setLives(3);
    setGameState(NinjaGameState.PLAYING);
    entitiesRef.current = [];
    particlesRef.current = [];
    mousePathRef.current = [];
    difficultyRef.current = 1;
    frameCountRef.current = 0;
    playSound('start');
    toggleBackgroundMusic(true);
  };

  const endGame = () => {
    setGameState(NinjaGameState.GAME_OVER);
    toggleBackgroundMusic(false);
    cancelAnimationFrame(requestRef.current);
    if (score > highScore) setHighScore(score);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== NinjaGameState.PLAYING) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    mousePathRef.current.push({ x, y });
  };

  useEffect(() => {
    // Resize Canvas
    const resize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', resize);
    resize();
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    if (gameState === NinjaGameState.PLAYING) {
      requestRef.current = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameState]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-900 cursor-none select-none touch-none">
      
      {/* HUD */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">
         <div className="flex flex-col">
            <div className="text-brand-yellow font-black text-4xl italic drop-shadow-[0_0_10px_rgba(253,203,110,0.8)]">
              {score}
            </div>
            <div className="text-white/50 text-xs font-bold uppercase tracking-widest">Điểm</div>
         </div>

         <div className="flex gap-2">
           {[...Array(3)].map((_, i) => (
             <div key={i} className={`transition-all duration-300 ${i < lives ? 'text-red-500' : 'text-gray-700'}`}>
                <ShieldAlert size={32} fill={i < lives ? "currentColor" : "none"} />
             </div>
           ))}
         </div>
      </div>

      {/* CANVAS */}
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        onMouseMove={handleMouseMove}
        onTouchMove={handleMouseMove}
      />

      {/* MENU OVERLAY */}
      {gameState === NinjaGameState.MENU && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-20 cursor-default">
           <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 mb-2 italic transform -skew-x-12 animate-pulse">
             CONFLICT<br/>NINJA
           </h1>
           <p className="text-xl text-white/80 mb-8 max-w-lg text-center">
             Rê chuột để CHÉM các hành vi <span className="text-red-400 font-bold">TIÊU CỰC</span>.<br/>
             Tránh xa các hành vi <span className="text-green-400 font-bold">TÍCH CỰC</span>.
           </p>
           <button 
             onClick={startGame}
             className="group relative px-8 py-4 bg-white text-black font-black text-2xl uppercase tracking-widest hover:bg-brand-yellow transition-all transform hover:scale-110 hover:-rotate-2"
           >
             <span className="flex items-center gap-3"><Play fill="currentColor" /> Chiến thôi!</span>
             <div className="absolute inset-0 border-2 border-white group-hover:border-brand-yellow scale-105 opacity-0 group-hover:opacity-100 transition-all"></div>
           </button>
        </div>
      )}

      {/* GAME OVER OVERLAY */}
      {gameState === NinjaGameState.GAME_OVER && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/80 backdrop-blur-md z-20 cursor-default animate-pop">
           <Skull size={80} className="text-white mb-4 animate-bounce" />
           <h2 className="text-5xl font-black text-white mb-2 uppercase">Game Over</h2>
           <div className="text-8xl font-black text-brand-yellow mb-4 drop-shadow-xl">{score}</div>
           <div className="text-white/60 mb-8 font-mono">High Score: {highScore}</div>
           
           <button 
             onClick={startGame}
             className="px-8 py-4 bg-brand-accent text-white font-black text-xl uppercase tracking-widest hover:bg-emerald-400 transition-all rounded-full flex items-center gap-2"
           >
             <span className="flex items-center gap-3"><Play fill="currentColor" /> Chiến thôi!</span>
             <div className="absolute inset-0 border-2 border-white group-hover:border-brand-yellow scale-105 opacity-0 group-hover:opacity-100 transition-all"></div>
           </button>
        </div>
      )}
      
      {/* Mobile Hint */}
      <div className="absolute bottom-4 left-0 w-full text-center text-white/20 text-xs pointer-events-none md:hidden">
        Chạm và lướt để chém
      </div>
    </div>
  );
};