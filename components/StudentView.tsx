import React, { useState, useEffect, useRef } from 'react';
import { GamePhase, GameState, Player, WordEntity, Particle } from '../types';
import { broadcastEvent, connectToGameRoom, getAvatarUrl, playSound, toggleBackgroundMusic } from '../services/gameService';
import { ShieldAlert, Zap } from 'lucide-react';

// --- CONFIG ---
const BAD_WORDS = ["Đổ lỗi", "Quát tháo", "Chỉ trích", "Toxic", "Giận dữ", "Cố chấp", "Lờ đi", "Đá đểu", "Xúc phạm", "Bạo lực", "Thù hằn", "Ghen tị", "Ích kỷ"];
const GOOD_WORDS = ["Lắng nghe", "Thấu hiểu", "Xin lỗi", "Hợp tác", "Bình tĩnh", "Tôn trọng", "Chia sẻ", "Tha thứ", "Kiên nhẫn", "Hòa giải", "Cảm thông"];

const GRAVITY = 0.15; // Lower gravity for floatier feel
const INITIAL_LIVES = 3;

interface StudentViewProps {
  gameState: GameState;
  localPlayerId: string | null;
  setLocalPlayerId: (id: string) => void;
}

export const StudentView: React.FC<StudentViewProps> = ({ gameState, localPlayerId, setLocalPlayerId }) => {
  const [name, setName] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [myLives, setMyLives] = useState(INITIAL_LIVES);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const entitiesRef = useRef<WordEntity[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const mousePathRef = useRef<{x: number, y: number}[]>([]);
  const frameCountRef = useRef(0);
  const scoreRef = useRef(0); // Ref for loop access

  // --- JOIN LOGIC ---
  const handleJoin = async () => {
    if (!name || !pinInput) return;
    setIsJoining(true);
    await connectToGameRoom(pinInput);
    
    const newPlayer: Player = {
      id: `ninja-${Date.now()}`,
      name: name,
      score: 0,
      lives: INITIAL_LIVES,
      avatarId: Math.floor(Math.random() * 1000)
    };
    
    setLocalPlayerId(newPlayer.id);
    broadcastEvent({ type: 'PLAYER_JOIN', payload: newPlayer });
  };

  // --- GAME LOOP ---
  const spawnWord = (width: number, height: number) => {
    const isBad = Math.random() > 0.4; // 60% Bad words (Targets)
    const text = isBad 
      ? BAD_WORDS[Math.floor(Math.random() * BAD_WORDS.length)]
      : GOOD_WORDS[Math.floor(Math.random() * GOOD_WORDS.length)];
    
    const radius = 35 + text.length * 4;
    const x = Math.random() * (width - 100) + 50;
    const y = height + radius;
    
    // Parabolic Launch Physics (Smoother)
    // Target somewhere in the upper 60% of screen horizontally
    const targetX = width * (0.2 + Math.random() * 0.6); 
    const vx = (targetX - x) / 100; // Gentle horizontal drift
    const vy = -(Math.random() * 4 + 11); // Consistent upward thrust (adjust based on gravity)

    entitiesRef.current.push({
      id: Math.random().toString(),
      text,
      type: isBad ? 'BAD' : 'GOOD',
      x,
      y,
      vx,
      vy,
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
      radius,
      sliced: false,
      scale: 1
    });
  };

  const createExplosion = (x: number, y: number, color: string) => {
    for (let i = 0; i < 12; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 1.0,
        color: color,
        size: Math.random() * 6 + 2
      });
    }
  };

  const gameLoop = () => {
    if (gameState.phase !== GamePhase.PLAYING || myLives <= 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // 1. Update Entities
    entitiesRef.current.forEach(e => {
      e.x += e.vx;
      e.y += e.vy;
      e.vy += GRAVITY;
      e.rotation += e.rotationSpeed;
    });
    // Remove off-screen
    entitiesRef.current = entitiesRef.current.filter(e => e.y < height + 100);

    // 2. Spawn
    frameCountRef.current++;
    // Spawn rate increases slightly over time
    if (frameCountRef.current % Math.max(30, 70 - Math.floor(frameCountRef.current / 300)) === 0) {
      spawnWord(width, height);
    }

    // 3. Collision (Slice)
    if (mousePathRef.current.length > 2) {
       const p1 = mousePathRef.current[mousePathRef.current.length - 1];
       const p2 = mousePathRef.current[mousePathRef.current.length - 2];
       
       entitiesRef.current.forEach(e => {
          if (e.sliced) return;
          const dist = Math.hypot(e.x - p1.x, e.y - p1.y);
          if (dist < e.radius) {
             e.sliced = true;
             
             if (e.type === 'BAD') {
               // Correct Slice
               playSound('explosion');
               createExplosion(e.x, e.y, '#f39c12'); // Gold explosion
               scoreRef.current += 10;
               setMyScore(scoreRef.current);
               // Remove entity immediately visually
               e.scale = 0; 
               // Sync score periodically
               if (localPlayerId) broadcastEvent({ type: 'PLAYER_UPDATE', payload: { id: localPlayerId, score: scoreRef.current, lives: myLives }});
             } else {
               // Wrong Slice (Good Word)
               playSound('wrong');
               createExplosion(e.x, e.y, '#e74c3c'); // Red explosion
               setMyLives(prev => {
                  const newLives = prev - 1;
                  if (localPlayerId) broadcastEvent({ type: 'PLAYER_UPDATE', payload: { id: localPlayerId, score: scoreRef.current, lives: newLives }});
                  return newLives;
               });
               e.scale = 0;
             }
          }
       });
    }
    // Clean up sliced entities
    entitiesRef.current = entitiesRef.current.filter(e => e.scale > 0);

    // 4. Draw Particles
    particlesRef.current.forEach(p => {
       p.x += p.vx; p.y += p.vy; p.vy += GRAVITY * 0.5; p.life -= 0.03;
       ctx.save();
       ctx.globalAlpha = p.life;
       ctx.fillStyle = p.color;
       ctx.beginPath();
       ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
       ctx.fill();
       ctx.restore();
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    // 5. Draw Entities
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    entitiesRef.current.forEach(e => {
       ctx.save();
       ctx.translate(e.x, e.y);
       ctx.rotate(e.rotation);
       
       // Draw Bubble/Orb (Uniform Look to force reading)
       const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, e.radius);
       gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
       gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.4)');
       gradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
       
       ctx.fillStyle = gradient;
       ctx.shadowBlur = 10;
       ctx.shadowColor = 'white';
       
       ctx.beginPath();
       ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
       ctx.fill();

       // Text
       ctx.shadowBlur = 0;
       ctx.fillStyle = '#2c3e50'; // Dark text for contrast on white orb
       ctx.font = 'bold 18px Montserrat';
       ctx.fillText(e.text, 0, 0);

       ctx.restore();
    });

    // 6. Draw Blade Trail
    if (mousePathRef.current.length > 1) {
       ctx.strokeStyle = '#00f260'; // Bright Green Blade
       ctx.lineWidth = 4;
       ctx.lineCap = 'round';
       ctx.lineJoin = 'round';
       ctx.shadowBlur = 10;
       ctx.shadowColor = '#0575e6';
       
       ctx.beginPath();
       ctx.moveTo(mousePathRef.current[0].x, mousePathRef.current[0].y);
       for(let i=1; i<mousePathRef.current.length; i++) {
          ctx.lineTo(mousePathRef.current[i].x, mousePathRef.current[i].y);
       }
       ctx.stroke();
       
       // Trim path
       if (mousePathRef.current.length > 15) mousePathRef.current.shift();
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  };

  const handleTouch = (e: any) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    mousePathRef.current.push({x, y});
  };

  useEffect(() => {
    if (gameState.phase === GamePhase.PLAYING && myLives > 0) {
      toggleBackgroundMusic(true);
      requestRef.current = requestAnimationFrame(gameLoop);
    } else {
      cancelAnimationFrame(requestRef.current);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameState.phase, myLives]);

  // Resize Canvas
  useEffect(() => {
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

  // --- RENDER ---

  // 1. JOIN SCREEN
  if (!localPlayerId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-brand-purple to-brand-darker">
        <div className="glass-panel w-full max-w-md p-8 rounded-3xl animate-pop">
          <h2 className="text-3xl font-black text-center mb-8 uppercase italic text-brand-yellow">Conflict Ninja</h2>
          <div className="space-y-4">
            <input type="text" placeholder="Mã PIN (trên bảng)" value={pinInput} onChange={e => setPinInput(e.target.value)} 
                   className="w-full bg-black/40 p-4 rounded-xl text-center text-xl font-mono tracking-widest text-white border border-white/20 focus:border-brand-yellow outline-none" />
            <input type="text" placeholder="Tên Ninja của bạn" value={name} onChange={e => setName(e.target.value)} 
                   className="w-full bg-black/40 p-4 rounded-xl text-center text-xl font-bold text-white border border-white/20 focus:border-brand-yellow outline-none" />
            <button onClick={handleJoin} disabled={isJoining} className="w-full bg-brand-accent text-white font-black p-4 rounded-xl shadow-lg hover:bg-emerald-500 active:scale-95 transition-transform disabled:opacity-50 uppercase tracking-widest">
              {isJoining ? 'Đang kết nối...' : 'Tham Gia'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. LOBBY
  if (gameState.phase === GamePhase.LOBBY) {
    const me = gameState.players.find(p => p.id === localPlayerId);
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
         <div className="w-32 h-32 rounded-full border-4 border-brand-yellow mb-6 animate-bounce-gentle overflow-hidden bg-white shadow-[0_0_20px_gold]">
             <img src={getAvatarUrl(me?.avatarId || 0)} className="w-full h-full" />
         </div>
         <h1 className="text-4xl font-black mb-2">{me?.name}</h1>
         <div className="text-white/60 animate-pulse uppercase tracking-widest">Đang đợi Host bắt đầu...</div>
      </div>
    );
  }

  // 3. GAMEPLAY
  if (gameState.phase === GamePhase.PLAYING) {
     if (myLives <= 0) {
        return (
          <div className="h-full flex flex-col items-center justify-center bg-red-900/50 backdrop-blur-md animate-pop">
             <ShieldAlert size={80} className="text-red-500 mb-4 animate-bounce" />
             <h1 className="text-5xl font-black uppercase mb-2">Hết Mạng!</h1>
             <div className="text-2xl">Điểm: {myScore}</div>
             <div className="mt-8 text-sm opacity-50">Đợi kết quả cuối cùng...</div>
          </div>
        );
     }
     
     return (
       <div className="relative w-full h-screen overflow-hidden touch-none select-none bg-gradient-to-b from-[#1a2a6c] via-[#b21f1f] to-[#fdbb2d]">
          {/* HUD */}
          <div className="absolute top-4 left-4 z-20 flex flex-col">
             <div className="text-5xl font-black italic text-white drop-shadow-md">{myScore}</div>
             <div className="text-[10px] uppercase tracking-widest opacity-80">Score</div>
          </div>
          <div className="absolute top-4 right-4 z-20 flex gap-1">
             {[...Array(INITIAL_LIVES)].map((_, i) => (
                <ShieldAlert key={i} size={24} className={i < myLives ? "text-green-400" : "text-black/30"} fill={i < myLives ? "currentColor" : "none"} />
             ))}
          </div>
          
          <canvas 
            ref={canvasRef} 
            className="block w-full h-full cursor-crosshair"
            onMouseMove={handleTouch}
            onTouchMove={handleTouch}
          />
          <div className="absolute bottom-2 w-full text-center text-white/30 text-xs pointer-events-none">Chém hành vi TIÊU CỰC. Né hành vi TÍCH CỰC.</div>
       </div>
     );
  }

  // 4. FINISHED
  return (
    <div className="h-full flex flex-col items-center justify-center">
       <div className="text-2xl font-bold mb-4">Kết thúc!</div>
       <div className="text-6xl font-black text-brand-yellow mb-2">{myScore}</div>
       <div>Điểm của bạn</div>
       <div className="mt-8">Hãy nhìn lên màn hình chính!</div>
    </div>
  );
};