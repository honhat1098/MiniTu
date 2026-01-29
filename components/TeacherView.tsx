import React, { useState, useEffect, useRef } from 'react';
import { GameState, GamePhase } from '../types';
import { broadcastEvent, getAvatarUrl, getQrCodeUrl, playSound } from '../services/gameService';
import { Users, Crown, Play, Timer, ArrowRight, CheckCircle, XCircle } from 'lucide-react';

interface TeacherViewProps {
  gameState: GameState;
  updateGameState: (newState: GameState) => void;
}

export const TeacherView: React.FC<TeacherViewProps> = ({ gameState, updateGameState }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<number | null>(null);

  const currentRound = gameState.rounds[gameState.currentRoundIndex];

  // Timer Logic
  useEffect(() => {
    if (gameState.phase === GamePhase.PLAYING) {
      setTimeLeft(currentRound.duration);
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Auto finish round
            handleShowResult();
            return 0;
          }
          if (prev <= 4) playSound('tick'); // Ticking sound near end
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState.phase, gameState.currentRoundIndex]);

  const startRound = () => {
    const startTime = Date.now();
    updateGameState({ ...gameState, phase: GamePhase.PLAYING, roundStartTime: startTime });
    broadcastEvent({ type: 'HOST_NEXT_ROUND', payload: { roundIndex: gameState.currentRoundIndex, startTime } });
  };

  const handleShowResult = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    updateGameState({ ...gameState, phase: GamePhase.ROUND_RESULT });
    broadcastEvent({ type: 'HOST_SHOW_RESULT', payload: {} });
    playSound('victory'); // Round finished sound
  };

  const nextRound = () => {
    const nextIndex = gameState.currentRoundIndex + 1;
    if (nextIndex < gameState.rounds.length) {
      // Setup next round but wait for start click
      const newState = { 
        ...gameState, 
        currentRoundIndex: nextIndex, 
        phase: GamePhase.PLAYING, // Auto start next round? Or wait? Let's auto start for flow or allow pause.
        // Let's go to playing immediately for this design
        roundStartTime: Date.now()
      };
      updateGameState(newState);
      broadcastEvent({ type: 'HOST_NEXT_ROUND', payload: { roundIndex: nextIndex, startTime: Date.now() } });
    } else {
      endGame();
    }
  };

  const endGame = () => {
    updateGameState({ ...gameState, phase: GamePhase.FINISHED });
    broadcastEvent({ type: 'HOST_END', payload: {} });
    playSound('victory');
  };

  // 1. LOBBY
  if (gameState.phase === GamePhase.LOBBY) {
    const qrUrl = getQrCodeUrl(window.location.href);
    return (
      <div className="h-full flex flex-col p-8 max-w-7xl mx-auto">
         <div className="flex flex-col md:flex-row gap-8 h-full">
            {/* Left: Info */}
            <div className="w-full md:w-1/3 glass-panel rounded-3xl p-8 flex flex-col justify-center items-center text-center">
               <h1 className="text-4xl font-black uppercase italic mb-2 text-brand-yellow leading-tight"><br/></h1>
               <div className="text-white/60 mb-8">Dùng điện thoại để tham gia</div>
               
               <div className="bg-white p-4 rounded-2xl shadow-xl mb-6">
                  <img src={qrUrl} alt="QR" className="w-48 h-48 mix-blend-multiply" />
               </div>
               
               <div className="text-6xl font-black font-mono tracking-widest text-white mb-2">{gameState.pin}</div>
               <div className="text-sm opacity-50 uppercase tracking-widest">Mã PIN</div>

               <button 
                 onClick={startRound}
                 disabled={gameState.players.length === 0}
                 className="mt-8 w-full bg-brand-accent text-white py-4 rounded-xl font-black text-xl hover:bg-emerald-500 disabled:opacity-50 shadow-lg flex items-center justify-center gap-2 animate-bounce-gentle"
               >
                 <Play fill="currentColor" /> BẮT ĐẦU GAME
               </button>
            </div>

            {/* Right: Players */}
            <div className="w-full md:w-2/3 glass-panel rounded-3xl p-8 flex flex-col">
               <div className="flex items-center gap-3 mb-6 text-2xl font-bold border-b border-white/10 pb-4">
                  <Users /> {gameState.players.length} Người tham gia
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

  // 2. PLAYING & RESULTS
  if (gameState.phase === GamePhase.PLAYING || gameState.phase === GamePhase.ROUND_RESULT) {
    const isResult = gameState.phase === GamePhase.ROUND_RESULT;
    const answeredCount = gameState.players.filter(p => p.lastAnswer).length;

    // Leaderboard logic for sidebar
    const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score).slice(0, 5);

    return (
      <div className="h-full flex flex-col p-6 max-w-7xl mx-auto">
         {/* Top Bar: Round Info & Timer */}
         <div className="flex justify-between items-center mb-6">
            <div className="bg-white/10 px-6 py-3 rounded-full font-bold text-xl">
               Vòng {gameState.currentRoundIndex + 1} / {gameState.rounds.length}
            </div>
            <div className={`text-4xl font-black font-mono flex items-center gap-3 ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-brand-yellow'}`}>
               <Timer size={36} /> {isResult ? '00' : (timeLeft < 10 ? `0${timeLeft}` : timeLeft)}
            </div>
            <div className="bg-white/10 px-6 py-3 rounded-full font-bold flex items-center gap-2">
               <Users size={20} /> {answeredCount} / {gameState.players.length} đã chọn
            </div>
         </div>

         <div className="flex-1 flex flex-col items-center justify-center relative">
            
            {/* Question Card */}
            <div className="w-full max-w-4xl mb-8 text-center z-10">
               <h2 className="text-3xl md:text-5xl font-black leading-snug drop-shadow-lg mb-4">
                  {currentRound.question}
               </h2>
               {!isResult && (
                 <div className="text-xl text-white/60 animate-pulse">Hãy chọn đáp án đúng nhất trên điện thoại của bạn!</div>
               )}
            </div>

            {/* RESULT REVEAL */}
            {isResult && (
               <div className="w-full max-w-4xl bg-black/30 backdrop-blur-md rounded-3xl p-8 border border-white/20 animate-pop flex flex-col items-center">
                  <div className="text-sm uppercase tracking-widest text-white/50 mb-4">Đáp án chính xác</div>
                  <div className="flex flex-wrap justify-center gap-4 mb-8">
                     {currentRound.correctWords.map(word => (
                        <div key={word} className="bg-green-500 text-white px-8 py-4 rounded-xl text-3xl font-bold shadow-[0_0_20px_rgba(34,197,94,0.6)]">
                           {word}
                        </div>
                     ))}
                  </div>

                  {/* Button Next */}
                  {gameState.currentRoundIndex < gameState.rounds.length - 1 ? (
                    <button onClick={nextRound} className="bg-brand-yellow text-black px-8 py-3 rounded-full font-black text-xl hover:scale-105 transition-transform flex items-center gap-2">
                       VÒNG TIẾP THEO <ArrowRight size={24} />
                    </button>
                  ) : (
                    <button onClick={endGame} className="bg-brand-red text-white px-8 py-3 rounded-full font-black text-xl hover:scale-105 transition-transform">
                       XEM KẾT QUẢ CHUNG CUỘC
                    </button>
                  )}
               </div>
            )}
         </div>

         {/* Mini Leaderboard at Bottom */}
         <div className="mt-auto h-24 flex items-end justify-center gap-4 pb-4">
            {sortedPlayers.map((p, i) => (
               <div key={p.id} className="flex flex-col items-center transition-all duration-500" style={{order: i === 0 ? 1 : i + 1}}>
                  <div className="bg-black/40 rounded-lg px-3 py-1 mb-1 text-sm font-bold text-brand-yellow">{p.score}</div>
                  <img src={getAvatarUrl(p.avatarId)} className={`rounded-full border-2 ${i===0 ? 'w-16 h-16 border-brand-yellow' : 'w-12 h-12 border-white/50'}`} />
                  <div className="text-xs mt-1 max-w-[80px] truncate">{p.name}</div>
               </div>
            ))}
         </div>
      </div>
    );
  }

  // 3. PODIUM (FINISHED) - Keep mostly same style but updated
  const winners = [...gameState.players].sort((a, b) => b.score - a.score);
  return (
    <div className="h-full flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-t from-brand-dark to-brand-purple">
        <div className="absolute inset-0 overflow-hidden">
           <div className="confetti-piece left-[10%] animate-[fall_3s_infinite]"></div>
           <div className="confetti-piece left-[20%] animate-[fall_2.5s_infinite]"></div>
           <div className="confetti-piece left-[50%] animate-[fall_4s_infinite]"></div>
           <div className="confetti-piece left-[80%] animate-[fall_3s_infinite]"></div>
        </div>

        <div className="text-center mb-12 z-20">
           <h1 className="text-5xl font-black uppercase italic text-brand-yellow mb-2">TỔNG KẾT</h1>
           <p className="text-xl opacity-80">Những bậc thầy xử lý mâu thuẫn</p>
        </div>

        {/* Podium */}
        <div className="flex items-end gap-4 md:gap-12 mb-12 scale-90 md:scale-100 z-10">
           {/* Rank 2 */}
           {winners[1] && (
             <div className="flex flex-col items-center animate-pop" style={{animationDelay: '0.2s'}}>
                <img src={getAvatarUrl(winners[1].avatarId)} className="w-20 h-20 rounded-full border-4 border-gray-300 bg-white mb-2" />
                <div className="font-bold text-lg mb-1">{winners[1].name}</div>
                <div className="bg-gray-400 w-24 h-32 flex items-center justify-center rounded-t-lg text-4xl font-black text-white shadow-lg">2</div>
                <div className="mt-2 font-mono bg-black/30 px-3 py-1 rounded-full">{winners[1].score}</div>
             </div>
           )}
           {/* Rank 1 */}
           {winners[0] && (
             <div className="flex flex-col items-center order-first md:order-none animate-pop z-20">
                <Crown className="text-yellow-400 w-12 h-12 mb-2 animate-bounce" fill="currentColor" />
                <img src={getAvatarUrl(winners[0].avatarId)} className="w-32 h-32 rounded-full border-4 border-yellow-400 bg-white mb-2 shadow-[0_0_50px_gold]" />
                <div className="font-bold text-2xl mb-1 text-yellow-400">{winners[0].name}</div>
                <div className="bg-brand-yellow w-32 h-48 flex items-center justify-center rounded-t-lg text-6xl font-black text-yellow-800 shadow-2xl relative overflow-hidden">
                   <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                   1
                </div>
                <div className="mt-2 font-mono bg-brand-yellow text-black font-bold px-6 py-2 rounded-full text-xl">{winners[0].score}</div>
             </div>
           )}
           {/* Rank 3 */}
           {winners[2] && (
             <div className="flex flex-col items-center animate-pop" style={{animationDelay: '0.4s'}}>
                <img src={getAvatarUrl(winners[2].avatarId)} className="w-20 h-20 rounded-full border-4 border-orange-400 bg-white mb-2" />
                <div className="font-bold text-lg mb-1">{winners[2].name}</div>
                <div className="bg-orange-500 w-24 h-24 flex items-center justify-center rounded-t-lg text-4xl font-black text-white shadow-lg">3</div>
                <div className="mt-2 font-mono bg-black/30 px-3 py-1 rounded-full">{winners[2].score}</div>
             </div>
           )}
        </div>
        
        <button onClick={() => window.location.reload()} className="z-20 bg-white/10 hover:bg-white/20 border border-white/30 px-8 py-3 rounded-full font-bold">CHƠI LẠI</button>
    </div>
  );
};