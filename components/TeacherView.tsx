import React, { useState, useEffect, useRef } from 'react';
import { GameState, GamePhase, GameRound } from '../types';
import { broadcastEvent, getAvatarUrl, getQrCodeUrl, playSound } from '../services/gameService';
import { Users, Crown, Play, Timer, ArrowRight, Upload, Settings, Trash2, Plus, Save, X, Edit3, Clock, CheckCircle, Loader } from 'lucide-react';

interface TeacherViewProps {
  gameState: GameState;
  updateGameState: (newState: GameState) => void;
}

const DEFAULT_POOL = [
  "Lắng nghe", "Tranh cãi", "Nhượng bộ", "Bình tĩnh", "Đổ lỗi", 
  "Hợp tác", "Né tránh", "Thỏa hiệp", "Tôn trọng", "Cáu gắt", 
  "Chỉ trích", "Đồng cảm", "Áp đặt", "Đối thoại", "Im lặng", 
  "Phản ứng", "Chia sẻ", "Kiềm chế", "Phủ nhận", "Thông cảm"
];

export const TeacherView: React.FC<TeacherViewProps> = ({ gameState, updateGameState }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [showManager, setShowManager] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const currentRound = gameState.rounds[gameState.currentRoundIndex];

  // 1. Timer Logic
  useEffect(() => {
    if (gameState.phase === GamePhase.PLAYING) {
      setTimeLeft(currentRound.duration || 15);
      
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleShowResult();
            return 0;
          }
          if (prev <= 4) playSound('tick'); 
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState.phase, gameState.currentRoundIndex]);

  // 2. Check if ALL players answered
  useEffect(() => {
    if (gameState.phase === GamePhase.PLAYING && gameState.players.length > 0) {
      const allAnswered = gameState.players.every(p => p.lastAnswer);
      if (allAnswered) {
        const timeout = setTimeout(() => {
             handleShowResult();
        }, 500);
        return () => clearTimeout(timeout);
      }
    }
  }, [gameState.players, gameState.phase]);

  const startRound = () => {
    if (gameState.rounds.length === 0) {
        alert("Chưa có câu hỏi nào! Hãy thêm câu hỏi trong phần Quản lý.");
        setShowManager(true);
        return;
    }

    const resetPlayers = gameState.players.map(p => ({
        ...p,
        lastAnswer: undefined,
        lastAnswerTime: undefined
    }));

    const startTime = Date.now();
    updateGameState({ 
        ...gameState, 
        players: resetPlayers,
        phase: GamePhase.PLAYING, 
        roundStartTime: startTime 
    });
    broadcastEvent({ type: 'HOST_NEXT_ROUND', payload: { roundIndex: gameState.currentRoundIndex, startTime } });
  };

  const handleShowResult = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (gameState.phase === GamePhase.ROUND_RESULT) return;

    updateGameState({ ...gameState, phase: GamePhase.ROUND_RESULT });
    broadcastEvent({ type: 'HOST_SHOW_RESULT', payload: {} });
    playSound('victory'); 
  };

  const nextRound = () => {
    const nextIndex = gameState.currentRoundIndex + 1;
    if (nextIndex < gameState.rounds.length) {
      const resetPlayers = gameState.players.map(p => ({
        ...p,
        lastAnswer: undefined,
        lastAnswerTime: undefined
      }));

      const startTime = Date.now();
      const newState = { 
        ...gameState, 
        players: resetPlayers,
        currentRoundIndex: nextIndex, 
        phase: GamePhase.PLAYING, 
        roundStartTime: startTime
      };
      updateGameState(newState);
      broadcastEvent({ type: 'HOST_NEXT_ROUND', payload: { roundIndex: nextIndex, startTime } });
    } else {
      endGame();
    }
  };

  const endGame = () => {
    updateGameState({ ...gameState, phase: GamePhase.FINISHED });
    broadcastEvent({ type: 'HOST_END', payload: {} });
    playSound('victory');
  };

  // --- MANAGER FUNCTIONS ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const json = JSON.parse(content);
        if (!Array.isArray(json)) throw new Error("File phải là mảng JSON");

        const newRounds: GameRound[] = json.map((item: any, index: number) => ({
            id: Date.now() + index,
            question: item.question || `Câu hỏi mới`,
            correctWords: item.correctWords || ["Đáp án đúng"],
            allWords: item.allWords || [...(item.correctWords || ["Đáp án đúng"]), ...DEFAULT_POOL].sort(() => 0.5 - Math.random()).slice(0, 24),
            duration: typeof item.duration === 'number' ? item.duration : 15
        }));

        updateGameState({
            ...gameState,
            rounds: [...gameState.rounds, ...newRounds]
        });
        setJsonError(null);
        alert(`Đã thêm ${newRounds.length} câu hỏi vào kho!`);
      } catch (err: any) {
        setJsonError(err.message || "Lỗi đọc file JSON");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const removeRound = (indexToRemove: number) => {
      const newRounds = gameState.rounds.filter((_, idx) => idx !== indexToRemove);
      updateGameState({ ...gameState, rounds: newRounds });
  };

  const updateRoundField = (index: number, field: keyof GameRound, value: any) => {
      const newRounds = [...gameState.rounds];
      newRounds[index] = { ...newRounds[index], [field]: value };
      updateGameState({ ...gameState, rounds: newRounds });
  };

  const addNewRound = () => {
      const newRound: GameRound = {
          id: Date.now(),
          question: "Câu hỏi mới (Nhấn để sửa)",
          correctWords: ["Đáp án đúng"],
          allWords: DEFAULT_POOL,
          duration: 15
      };
      updateGameState({ ...gameState, rounds: [...gameState.rounds, newRound] });
  };

  // --- RENDER ---

  // 1. LOBBY
  if (gameState.phase === GamePhase.LOBBY) {
    const qrUrl = getQrCodeUrl(window.location.href);
    return (
      <div className="h-full flex flex-col p-8 max-w-7xl mx-auto relative">
         
         {/* Manager Modal */}
         {showManager && (
            <div className="absolute inset-0 z-50 bg-brand-darker/95 backdrop-blur-xl rounded-3xl p-6 flex flex-col animate-pop border border-brand-accent/30 shadow-2xl">
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <h2 className="text-3xl font-black text-white flex items-center gap-3">
                        <Settings className="text-brand-accent animate-spin-slow" /> QUẢN LÝ CÂU HỎI ({gameState.rounds.length})
                    </h2>
                    <button onClick={() => setShowManager(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
                        <X size={28} />
                    </button>
                </div>

                {/* List Container */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                    {gameState.rounds.map((round, idx) => (
                        <div key={round.id} className="bg-white/5 p-4 rounded-xl flex items-start gap-4 hover:bg-white/10 transition-colors group">
                            <div className="bg-brand-purple w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm shrink-0 mt-1">
                                {idx + 1}
                            </div>
                            
                            <div className="flex-1 space-y-2">
                                <input 
                                    type="text" 
                                    value={round.question}
                                    onChange={(e) => updateRoundField(idx, 'question', e.target.value)}
                                    className="w-full bg-transparent border-b border-transparent focus:border-brand-accent focus:bg-black/20 outline-none text-lg font-bold placeholder-white/30 transition-all p-1"
                                    placeholder="Nhập nội dung câu hỏi..."
                                />
                                <div className="flex items-center gap-4 text-sm text-white/50">
                                    <div className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded">
                                        <Clock size={14} /> 
                                        <input 
                                            type="number" 
                                            value={round.duration}
                                            onChange={(e) => updateRoundField(idx, 'duration', parseInt(e.target.value) || 15)}
                                            className="w-10 bg-transparent text-center font-bold text-brand-yellow outline-none"
                                        /> giây
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <CheckCircle size={14} /> {round.correctWords.length} đáp án đúng
                                    </div>
                                </div>
                            </div>

                            <button onClick={() => removeRound(idx)} className="text-white/20 hover:text-red-500 hover:bg-white/10 p-2 rounded-lg transition-all">
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}
                    {gameState.rounds.length === 0 && (
                        <div className="text-center text-white/30 py-12 italic border-2 border-dashed border-white/10 rounded-xl">
                            Chưa có câu hỏi nào. Hãy thêm mới hoặc import JSON.
                        </div>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-4">
                        <button onClick={addNewRound} className="flex items-center gap-2 bg-brand-accent hover:bg-cyan-400 text-brand-darker px-5 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95">
                            <Plus size={20} /> Thêm thủ công
                        </button>
                        <label className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-5 py-3 rounded-xl font-bold cursor-pointer transition-all shadow-lg active:scale-95 relative overflow-hidden">
                            <Upload size={20} /> Import JSON
                            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                        </label>
                    </div>

                    <button onClick={() => setShowManager(false)} className="flex items-center gap-2 bg-white text-black hover:bg-gray-200 px-8 py-3 rounded-xl font-black text-lg shadow-xl transition-all active:scale-95">
                        <Save size={20} /> ĐÓNG & LƯU
                    </button>
                </div>
            </div>
         )}

         {/* Main Lobby Content */}
         <div className="flex flex-col md:flex-row gap-8 h-full">
            {/* Left: Info */}
            <div className="w-full md:w-1/3 glass-panel rounded-3xl p-8 flex flex-col justify-center items-center text-center relative border-t border-brand-accent/50">
               
               <h1 className="text-3xl font-black uppercase italic mb-2 text-transparent bg-clip-text bg-gradient-to-r from-brand-yellow to-brand-secondary leading-tight">Chọn<br/>ĐÚNG</h1>
               
               <div className="bg-white p-4 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.3)] mb-4 mt-4 transform hover:scale-105 transition-transform">
                  <img src={qrUrl} alt="QR" className="w-40 h-40 mix-blend-multiply" />
               </div>
               
               <div className="text-6xl font-black font-mono tracking-widest text-white mb-2 drop-shadow-lg">{gameState.pin}</div>
               <div className="text-sm text-brand-accent font-bold uppercase tracking-widest mb-8">Mã Phòng</div>

               <div className="grid grid-cols-2 gap-3 w-full mb-4">
                   <button 
                     onClick={() => setShowManager(true)}
                     className="bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold border border-white/10 flex items-center justify-center gap-2 transition-all"
                   >
                     <Settings size={18} /> Cài đặt
                   </button>
                   
                   <button 
                     onClick={startRound}
                     disabled={gameState.players.length === 0 || gameState.rounds.length === 0}
                     className="bg-brand-accent text-brand-darker py-3 rounded-xl font-black text-lg hover:bg-cyan-400 disabled:opacity-50 disabled:grayscale shadow-[0_4px_0_#0e7490] active:translate-y-1 active:shadow-none flex items-center justify-center gap-2 animate-bounce-gentle transition-all"
                   >
                     <Play fill="currentColor" size={18} /> BẮT ĐẦU
                   </button>
               </div>
               
               <div className="text-xs text-white/40">
                  {gameState.players.length === 0 ? "Đang chờ người chơi..." : "Đã sẵn sàng!"}
               </div>
            </div>

            {/* Right: Players */}
            <div className="w-full md:w-2/3 glass-panel rounded-3xl p-8 flex flex-col">
               <div className="flex items-center gap-3 mb-6 text-2xl font-bold border-b border-white/10 pb-4 text-brand-accent">
                  <Users /> {gameState.players.length} Người tham gia
               </div>
               <div className="flex-1 overflow-y-auto content-start flex flex-wrap gap-4">
                  {gameState.players.map(p => (
                     <div key={p.id} className="bg-white/10 border border-white/10 px-4 py-2 rounded-full flex items-center gap-3 animate-pop hover:bg-white/20 transition-colors">
                        <img src={getAvatarUrl(p.avatarId)} className="w-8 h-8 rounded-full bg-white" />
                        <span className="font-bold">{p.name}</span>
                     </div>
                  ))}
                  {gameState.players.length === 0 && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white/20 italic gap-4">
                      <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/20 animate-spin-slow"></div>
                      Chưa có ai tham gia...
                    </div>
                  )}
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
    const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score).slice(0, 5);

    return (
      <div className="h-full flex flex-col p-6 max-w-7xl mx-auto overflow-hidden">
         {/* Top Bar */}
         <div className="flex justify-between items-center mb-4 shrink-0">
            <div className="bg-white/10 px-6 py-3 rounded-full font-bold text-xl border border-white/10">
               Vòng <span className="text-brand-accent">{gameState.currentRoundIndex + 1}</span> / {gameState.rounds.length}
            </div>
            <div className={`text-5xl font-black font-mono flex items-center gap-3 drop-shadow-lg ${timeLeft <= 5 && !isResult ? 'text-brand-red animate-pulse-fast' : 'text-brand-yellow'}`}>
               <Timer size={40} strokeWidth={3} /> {isResult ? '00' : (timeLeft < 10 ? `0${timeLeft}` : timeLeft)}
            </div>
            <div className="bg-white/10 px-6 py-3 rounded-full font-bold flex items-center gap-2 border border-white/10">
               <Users size={20} className="text-brand-secondary" /> {answeredCount} / {gameState.players.length}
            </div>
         </div>

         {/* Main Scrollable Content Area */}
         <div className="flex-1 w-full flex flex-col items-center overflow-y-auto pb-6 scrollbar-hide">
            
            {/* Question Card */}
            <div className="w-full max-w-5xl mb-6 text-center z-10 transition-all duration-300 shrink-0 mt-4">
               <h2 className={`font-black leading-tight drop-shadow-xl mb-4 ${isResult ? 'text-3xl text-white/80' : 'text-4xl md:text-6xl text-white'}`}>
                  {currentRound.question}
               </h2>
            </div>

            {/* PLAYER STATUS GRID */}
            {!isResult && (
                <div className="w-full max-w-5xl mb-8 flex flex-wrap justify-center gap-4 animate-pop shrink-0">
                    {gameState.players.map(p => {
                        const hasAnswered = !!p.lastAnswer;
                        return (
                            <div key={p.id} className={`transition-all duration-300 flex flex-col items-center ${hasAnswered ? 'scale-110' : 'opacity-40 grayscale scale-90'}`}>
                                <div className="relative">
                                    <img 
                                        src={getAvatarUrl(p.avatarId)} 
                                        className={`w-14 h-14 rounded-full border-4 ${hasAnswered ? 'border-brand-accent shadow-[0_0_15px_rgba(6,182,212,0.6)]' : 'border-white/20'}`} 
                                    />
                                    {hasAnswered && (
                                        <div className="absolute -top-1 -right-1 bg-brand-accent rounded-full text-brand-darker p-1 shadow-lg animate-bounce-gentle">
                                            <CheckCircle size={16} fill="currentColor" />
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs mt-2 font-bold max-w-[70px] truncate bg-black/40 px-2 py-0.5 rounded-full">{p.name}</div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* RESULT REVEAL */}
            {isResult && (
               <div className="w-full max-w-4xl bg-brand-darker/80 backdrop-blur-xl rounded-3xl p-10 border border-brand-accent/30 animate-pop flex flex-col items-center shadow-2xl shrink-0 mb-4">
                  <div className="text-sm uppercase tracking-widest text-brand-accent mb-6 font-bold">Đáp án chính xác</div>
                  <div className="flex flex-wrap justify-center gap-4 mb-10">
                     {currentRound.correctWords.map(word => (
                        <div key={word} className="bg-emerald-500 text-white px-8 py-5 rounded-2xl text-4xl font-black shadow-[0_8px_0_#065f46] transform -rotate-1">
                           {word}
                        </div>
                     ))}
                  </div>

                  {gameState.currentRoundIndex < gameState.rounds.length - 1 ? (
                    <button onClick={nextRound} className="bg-brand-yellow text-brand-darker px-10 py-4 rounded-full font-black text-xl hover:scale-105 transition-transform flex items-center gap-3 shadow-lg">
                       VÒNG TIẾP THEO <ArrowRight size={28} />
                    </button>
                  ) : (
                    <button onClick={endGame} className="bg-brand-red text-white px-10 py-4 rounded-full font-black text-xl hover:scale-105 transition-transform shadow-lg">
                       XEM KẾT QUẢ CHUNG CUỘC
                    </button>
                  )}
               </div>
            )}
         </div>

         {/* Mini Leaderboard (Fixed Footer) */}
         <div className="shrink-0 h-32 flex items-end justify-center gap-6 pb-4 pt-2 border-t border-white/5 bg-gradient-to-t from-black/40 to-transparent rounded-t-3xl -mx-6 px-6">
            {sortedPlayers.map((p, i) => (
               <div key={p.id} className="flex flex-col items-center transition-all duration-500 relative" style={{order: i === 0 ? 1 : i + 1, transform: i === 0 ? 'scale(1.1) translateY(-10px)' : 'scale(0.9)'}}>
                  {i===0 && <Crown className="text-brand-yellow w-6 h-6 mb-1 animate-bounce" fill="currentColor" />}
                  <div className="bg-brand-darker/80 backdrop-blur border border-white/10 rounded-lg px-3 py-1 mb-2 text-sm font-bold text-brand-accent shadow-lg">{p.score}</div>
                  <img src={getAvatarUrl(p.avatarId)} className={`rounded-full border-4 bg-white ${i===0 ? 'w-16 h-16 border-brand-yellow shadow-[0_0_20px_rgba(250,204,21,0.5)]' : 'w-14 h-14 border-white/50'}`} />
                  <div className="text-xs mt-2 font-bold max-w-[80px] truncate text-center">{p.name}</div>
               </div>
            ))}
         </div>
      </div>
    );
  }

  // 3. PODIUM (FINISHED)
  const winners = [...gameState.players].sort((a, b) => b.score - a.score);
  return (
    <div className="h-full flex flex-col items-center justify-start pt-12 relative overflow-y-auto bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900 via-brand-darker to-black scrollbar-hide">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
           <div className="confetti-piece left-[10%] animate-[fall_3s_infinite]"></div>
           <div className="confetti-piece left-[30%] animate-[fall_2.5s_infinite]"></div>
           <div className="confetti-piece left-[50%] animate-[fall_4s_infinite]"></div>
           <div className="confetti-piece left-[70%] animate-[fall_3s_infinite]"></div>
           <div className="confetti-piece left-[90%] animate-[fall_3.5s_infinite]"></div>
        </div>

        <div className="text-center mb-8 z-10 shrink-0">
           <h1 className="text-5xl md:text-6xl font-black uppercase italic text-transparent bg-clip-text bg-gradient-to-b from-brand-yellow to-orange-500 mb-2 drop-shadow-2xl px-4 py-2">VÔ ĐỊCH</h1>
           <p className="text-xl md:text-2xl text-white/80 font-light tracking-wide">Bậc thầy xử lý mâu thuẫn</p>
        </div>

        {/* Podium */}
        <div className="flex items-end gap-4 md:gap-8 mb-8 scale-90 md:scale-100 z-10 shrink-0">
           {/* Rank 2 */}
           {winners[1] && (
             <div className="flex flex-col items-center animate-pop" style={{animationDelay: '0.2s'}}>
                <img src={getAvatarUrl(winners[1].avatarId)} className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-slate-300 bg-white mb-4 shadow-xl" />
                <div className="font-bold text-lg md:text-xl mb-2 text-slate-300">{winners[1].name}</div>
                <div className="bg-gradient-to-b from-slate-400 to-slate-600 w-24 md:w-28 h-36 md:h-40 flex items-center justify-center rounded-t-2xl text-4xl md:text-5xl font-black text-white shadow-2xl border-t border-white/20">2</div>
                <div className="mt-4 font-mono bg-white/10 backdrop-blur px-4 md:px-6 py-2 rounded-full font-bold text-lg md:text-xl">{winners[1].score}</div>
             </div>
           )}
           {/* Rank 1 */}
           {winners[0] && (
             <div className="flex flex-col items-center order-first md:order-none animate-pop z-20 -mb-4">
                <Crown className="text-brand-yellow w-14 h-14 md:w-16 md:h-16 mb-4 animate-bounce" fill="currentColor" />
                <img src={getAvatarUrl(winners[0].avatarId)} className="w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-brand-yellow bg-white mb-4 shadow-[0_0_60px_rgba(250,204,21,0.6)]" />
                <div className="font-bold text-2xl md:text-3xl mb-2 text-brand-yellow">{winners[0].name}</div>
                <div className="bg-gradient-to-b from-brand-yellow to-orange-600 w-32 md:w-36 h-48 md:h-56 flex items-center justify-center rounded-t-2xl text-6xl md:text-7xl font-black text-white shadow-2xl relative overflow-hidden border-t border-white/30">
                   <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                   1
                </div>
                <div className="mt-4 font-mono bg-brand-yellow text-brand-darker px-6 md:px-8 py-3 rounded-full text-2xl md:text-3xl font-black shadow-lg transform -rotate-1">{winners[0].score}</div>
             </div>
           )}
           {/* Rank 3 */}
           {winners[2] && (
             <div className="flex flex-col items-center animate-pop" style={{animationDelay: '0.4s'}}>
                <img src={getAvatarUrl(winners[2].avatarId)} className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-orange-400 bg-white mb-4 shadow-xl" />
                <div className="font-bold text-lg md:text-xl mb-2 text-orange-400">{winners[2].name}</div>
                <div className="bg-gradient-to-b from-orange-500 to-amber-700 w-24 md:w-28 h-28 md:h-32 flex items-center justify-center rounded-t-2xl text-4xl md:text-5xl font-black text-white shadow-2xl border-t border-white/20">3</div>
                <div className="mt-4 font-mono bg-white/10 backdrop-blur px-4 md:px-6 py-2 rounded-full font-bold text-lg md:text-xl">{winners[2].score}</div>
             </div>
           )}
        </div>
        
        <button onClick={() => window.location.reload()} className="z-20 bg-white/10 hover:bg-white/20 border border-white/30 text-white px-10 py-4 rounded-full font-bold text-lg backdrop-blur-md transition-all hover:scale-105 active:scale-95 mb-8 shrink-0">CHƠI LẠI</button>
    </div>
  );
};
