import React, { useState } from 'react';
import { GameState, GamePhase, Player } from '../types';
import { broadcastEvent, getAvatarUrl, getQrCodeUrl, playSound } from '../services/gameService';
import { Users, Crown, Play, Trophy } from 'lucide-react';

interface TeacherViewProps {
  gameState: GameState;
  updateGameState: (newState: GameState) => void;
}

export const TeacherView: React.FC<TeacherViewProps> = ({ gameState, updateGameState }) => {
  const [joinUrl] = useState(window.location.href);

  const startGame = () => {
    const startTime = Date.now();
    updateGameState({ ...gameState, phase: GamePhase.PLAYING, startTime });
    broadcastEvent({ type: 'HOST_START', payload: { startTime } });
  };

  const endGame = () => {
    updateGameState({ ...gameState, phase: GamePhase.FINISHED });
    broadcastEvent({ type: 'HOST_END', payload: {} });
    playSound('victory');
  };

  // 1. LOBBY
  if (gameState.phase === GamePhase.LOBBY) {
    const qrUrl = getQrCodeUrl(joinUrl);
    return (
      <div className="h-full flex flex-col p-8 max-w-7xl mx-auto">
         <div className="flex flex-col md:flex-row gap-8 h-full">
            {/* Left: Info */}
            <div className="w-full md:w-1/3 glass-panel rounded-3xl p-8 flex flex-col justify-center items-center text-center">
               <h1 className="text-4xl font-black uppercase italic mb-2 text-brand-yellow">Conflict Ninja</h1>
               <div className="text-white/60 mb-8">Dùng điện thoại để tham gia</div>
               
               <div className="bg-white p-4 rounded-2xl shadow-xl mb-6">
                  <img src={qrUrl} alt="QR" className="w-48 h-48 mix-blend-multiply" />
               </div>
               
               <div className="text-6xl font-black font-mono tracking-widest text-white mb-2">{gameState.pin}</div>
               <div className="text-sm opacity-50 uppercase tracking-widest">Mã PIN</div>

               <button 
                 onClick={startGame}
                 disabled={gameState.players.length === 0}
                 className="mt-8 w-full bg-brand-accent text-white py-4 rounded-xl font-black text-xl hover:bg-emerald-500 disabled:opacity-50 shadow-lg flex items-center justify-center gap-2"
               >
                 <Play fill="currentColor" /> START GAME
               </button>
            </div>

            {/* Right: Players */}
            <div className="w-full md:w-2/3 glass-panel rounded-3xl p-8 flex flex-col">
               <div className="flex items-center gap-3 mb-6 text-2xl font-bold border-b border-white/10 pb-4">
                  <Users /> {gameState.players.length} Ninja đã sẵn sàng
               </div>
               <div className="flex-1 overflow-y-auto content-start flex flex-wrap gap-4">
                  {gameState.players.map(p => (
                     <div key={p.id} className="bg-white/10 px-4 py-2 rounded-full flex items-center gap-3 animate-pop">
                        <img src={getAvatarUrl(p.avatarId)} className="w-8 h-8 rounded-full bg-white" />
                        <span className="font-bold">{p.name}</span>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    );
  }

  // 2. LIVE LEADERBOARD (PLAYING)
  if (gameState.phase === GamePhase.PLAYING) {
    const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score).slice(0, 7); // Top 7

    return (
      <div className="h-full flex flex-col p-8">
         <div className="flex justify-between items-center mb-8">
             <h2 className="text-3xl font-black uppercase italic text-brand-yellow animate-pulse">Live Rankings</h2>
             <button onClick={endGame} className="bg-brand-red px-6 py-2 rounded-lg font-bold hover:bg-red-600">KẾT THÚC</button>
         </div>

         <div className="flex-1 flex flex-col gap-4 max-w-4xl mx-auto w-full">
            {sortedPlayers.map((p, index) => (
               <div key={p.id} className="relative h-16 bg-white/10 rounded-xl flex items-center px-4 overflow-hidden transition-all duration-500"
                    style={{ transform: `translateY(${index * 0}px)` }}> {/* Just list for now, animation is complex */}
                  <div className="absolute left-0 top-0 bottom-0 bg-brand-accent opacity-20 transition-all duration-300" 
                       style={{ width: `${Math.min(100, (p.score / (sortedPlayers[0]?.score || 1)) * 100)}%` }}></div>
                  
                  <div className="font-mono font-black text-xl w-10">{index + 1}</div>
                  <img src={getAvatarUrl(p.avatarId)} className="w-10 h-10 rounded-full bg-white mx-4 z-10" />
                  <div className="font-bold text-xl flex-1 z-10">{p.name}</div>
                  <div className="font-black text-2xl text-brand-yellow z-10">{p.score}</div>
               </div>
            ))}
         </div>
      </div>
    );
  }

  // 3. PODIUM (FINISHED)
  const winners = [...gameState.players].sort((a, b) => b.score - a.score);
  return (
    <div className="h-full flex flex-col items-center justify-center relative overflow-hidden">
        {/* Podium */}
        <div className="flex items-end gap-4 md:gap-8 mb-12 scale-90 md:scale-100 z-10">
           {/* Rank 2 */}
           {winners[1] && (
             <div className="flex flex-col items-center animate-pop" style={{animationDelay: '0.2s'}}>
                <img src={getAvatarUrl(winners[1].avatarId)} className="w-20 h-20 rounded-full border-4 border-gray-300 bg-white mb-2" />
                <div className="font-bold text-lg mb-1">{winners[1].name}</div>
                <div className="bg-gray-300 w-24 h-32 flex items-center justify-center rounded-t-lg text-4xl font-black text-gray-500">2</div>
                <div className="mt-2 font-mono bg-black/30 px-3 py-1 rounded-full">{winners[1].score}</div>
             </div>
           )}
           {/* Rank 1 */}
           {winners[0] && (
             <div className="flex flex-col items-center order-first md:order-none animate-pop z-20">
                <Crown className="text-yellow-400 w-12 h-12 mb-2 animate-bounce" fill="currentColor" />
                <img src={getAvatarUrl(winners[0].avatarId)} className="w-32 h-32 rounded-full border-4 border-yellow-400 bg-white mb-2 shadow-[0_0_30px_gold]" />
                <div className="font-bold text-2xl mb-1 text-yellow-400">{winners[0].name}</div>
                <div className="bg-yellow-400 w-32 h-48 flex items-center justify-center rounded-t-lg text-6xl font-black text-yellow-700 shadow-xl">1</div>
                <div className="mt-2 font-mono bg-brand-yellow text-black font-bold px-6 py-2 rounded-full text-xl">{winners[0].score}</div>
             </div>
           )}
           {/* Rank 3 */}
           {winners[2] && (
             <div className="flex flex-col items-center animate-pop" style={{animationDelay: '0.4s'}}>
                <img src={getAvatarUrl(winners[2].avatarId)} className="w-20 h-20 rounded-full border-4 border-orange-400 bg-white mb-2" />
                <div className="font-bold text-lg mb-1">{winners[2].name}</div>
                <div className="bg-orange-400 w-24 h-24 flex items-center justify-center rounded-t-lg text-4xl font-black text-orange-800">3</div>
                <div className="mt-2 font-mono bg-black/30 px-3 py-1 rounded-full">{winners[2].score}</div>
             </div>
           )}
        </div>
        
        <button onClick={() => window.location.reload()} className="z-10 bg-white/10 hover:bg-white/20 px-8 py-3 rounded-full font-bold">CHƠI LẠI</button>
    </div>
  );
};