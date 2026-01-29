import React, { useState, useEffect } from 'react';
import { GamePhase, GameState, Player } from '../types';
import { broadcastEvent, connectToGameRoom, getAvatarUrl, playSound } from '../services/gameService';
import { CheckCircle, XCircle, Clock, Zap } from 'lucide-react';

interface StudentViewProps {
  gameState: GameState;
  localPlayerId: string | null;
  setLocalPlayerId: (id: string) => void;
}

const StudentView: React.FC<StudentViewProps> = ({ gameState, localPlayerId, setLocalPlayerId }) => {
  const [name, setName] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  const me = gameState.players.find(p => p.id === localPlayerId);
  const currentRound = gameState.rounds[gameState.currentRoundIndex];

  // Reset selection ONLY when a new round starts (based on start time)
  useEffect(() => {
    setSelectedWord(null);
  }, [gameState.roundStartTime]);

  // Handle Result Sound
  useEffect(() => {
    if (gameState.phase === GamePhase.ROUND_RESULT) {
      const answer = selectedWord || me?.lastAnswer;
      if (answer) {
        const isCorrect = currentRound.correctWords.includes(answer);
        if (isCorrect) playSound('correct');
        else playSound('wrong');
      }
    }
  }, [gameState.phase, selectedWord, me?.lastAnswer, currentRound]);

  const handleJoin = async () => {
    if (!name || !pinInput) return;
    setIsJoining(true);
    await connectToGameRoom(pinInput);
    
    const newPlayer: Player = {
      id: `student-${Date.now()}`,
      name: name,
      score: 0,
      avatarId: Math.floor(Math.random() * 1000),
      lives: 3
    };
    
    setLocalPlayerId(newPlayer.id);
    broadcastEvent({ type: 'PLAYER_JOIN', payload: newPlayer });
  };

  const submitAnswer = (word: string) => {
    if (selectedWord || gameState.phase !== GamePhase.PLAYING) return;
    
    setSelectedWord(word);
    playSound('click'); 
    
    if (localPlayerId) {
      const timeTaken = Date.now() - (gameState.roundStartTime || Date.now());
      broadcastEvent({ 
        type: 'PLAYER_SUBMIT', 
        payload: { 
          id: localPlayerId, 
          answer: word,
          timeTaken
        } 
      });
    }
  };

  // 1. JOIN SCREEN
  if (!localPlayerId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 relative">
        <div className="glass-panel w-full max-w-md p-8 rounded-3xl animate-pop border-t border-brand-accent/50">
          <div className="flex justify-center mb-6">
            <Zap className="text-brand-accent w-12 h-12" fill="currentColor" />
          </div>
          <h2 className="text-2xl font-black text-center mb-8 uppercase text-white tracking-widest">Tham Gia Game</h2>
          <div className="space-y-4">
            <input type="text" placeholder="Mã PIN" value={pinInput} onChange={e => setPinInput(e.target.value)} 
                   className="w-full bg-black/40 p-4 rounded-xl text-center text-2xl font-black text-brand-accent border border-brand-accent/30 outline-none focus:border-brand-accent transition-all placeholder-white/20" />
            <input type="text" placeholder="Tên của bạn" value={name} onChange={e => setName(e.target.value)} 
                   className="w-full bg-black/40 p-4 rounded-xl text-center text-xl font-bold text-white border border-brand-accent/30 outline-none focus:border-brand-accent transition-all placeholder-white/20" />
            <button onClick={handleJoin} disabled={isJoining} className="w-full bg-brand-accent hover:bg-cyan-400 text-brand-darker font-black text-lg p-4 rounded-xl shadow-[0_4px_0_#0e7490] active:shadow-none active:translate-y-1 transition-all mt-4 uppercase">
              {isJoining ? 'Đang vào...' : 'VÀO GAME'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. LOBBY
  if (gameState.phase === GamePhase.LOBBY) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
         <div className="w-32 h-32 rounded-full border-4 border-brand-accent mb-6 overflow-hidden bg-white shadow-[0_0_40px_rgba(6,182,212,0.4)] animate-bounce-gentle">
             <img src={getAvatarUrl(me?.avatarId || 0)} className="w-full h-full" />
         </div>
         <h1 className="text-4xl font-black mb-2 text-white">{me?.name}</h1>
         <div className="bg-white/10 px-6 py-2 rounded-full text-brand-accent font-bold animate-pulse">Bạn đã sẵn sàng!</div>
      </div>
    );
  }

  // 3. PLAYING GRID
  if (gameState.phase === GamePhase.PLAYING) {
    return (
       <div className="h-full flex flex-col p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm font-bold text-brand-accent uppercase tracking-widest">Vòng {gameState.currentRoundIndex + 1}</div>
            <div className="bg-brand-accent/20 border border-brand-accent/50 text-brand-accent px-4 py-1 rounded-full text-sm font-black">{me?.score} PTS</div>
          </div>

          <div className="text-center mb-6 px-2">
             <div className="text-xl font-bold leading-tight drop-shadow-md">{currentRound.question}</div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="grid grid-cols-2 gap-3 pb-24">
              {currentRound.allWords.map((word, idx) => (
                <button
                  key={idx}
                  onClick={() => submitAnswer(word)}
                  disabled={!!selectedWord}
                  className={`
                    p-4 rounded-2xl text-md font-bold transition-all active:scale-95 flex items-center justify-center min-h-[70px] leading-tight break-words relative overflow-hidden
                    ${selectedWord === word 
                      ? 'bg-brand-yellow text-black border-4 border-white shadow-lg z-10 scale-100' 
                      : 'bg-white/10 text-white hover:bg-brand-accent/20 border border-white/10'}
                    ${!!selectedWord && selectedWord !== word ? 'opacity-30 blur-[1px]' : ''}
                  `}
                >
                  {word}
                </button>
              ))}
            </div>
          </div>
          
          {selectedWord && (
             <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] p-4 bg-brand-darker/90 backdrop-blur border border-brand-yellow rounded-2xl text-center animate-pop z-50 shadow-2xl">
                <div className="text-brand-yellow font-black flex items-center justify-center gap-2 text-lg">
                   <Clock className="animate-spin-slow" size={24} /> ĐÃ CHỌN:
                </div>
                <div className="text-xl font-bold text-white mt-1">{selectedWord}</div>
             </div>
          )}
       </div>
    );
  }

  // 4. ROUND RESULT
  if (gameState.phase === GamePhase.ROUND_RESULT) {
    const finalAnswer = selectedWord || me?.lastAnswer;
    const isCorrect = finalAnswer && currentRound.correctWords.includes(finalAnswer);
    
    return (
      <div className={`h-full flex flex-col items-center justify-center p-6 ${isCorrect ? 'bg-emerald-600' : 'bg-rose-600'} transition-colors duration-500`}>
         {isCorrect ? (
           <div className="text-center animate-pop">
             <div className="bg-white/20 p-6 rounded-full inline-block mb-6">
                 <CheckCircle className="w-20 h-20 text-white" fill="currentColor" />
             </div>
             <h2 className="text-5xl font-black mb-2 text-white drop-shadow-md">CHÍNH XÁC!</h2>
             <div className="text-2xl font-bold bg-black/20 px-6 py-2 rounded-full inline-block mt-4 text-emerald-100">+{me?.score > 0 ? "Points" : ""} {me?.score}</div>
           </div>
         ) : (
           <div className="text-center animate-pop">
             <div className="bg-white/20 p-6 rounded-full inline-block mb-6">
                <XCircle className="w-20 h-20 text-white" fill="currentColor" />
             </div>
             <h2 className="text-5xl font-black mb-2 text-white">SAI RỒI!</h2>
             <p className="opacity-90 mb-6 text-xl">Bạn chọn: <span className="font-bold border-b-2 border-white/50">{finalAnswer || "Chưa chọn"}</span></p>
             <div className="bg-black/30 p-6 rounded-2xl border border-white/10">
               <div className="text-xs uppercase opacity-70 mb-2 tracking-widest">Đáp án đúng là:</div>
               <div className="font-black text-2xl text-brand-yellow">{currentRound.correctWords.join(", ")}</div>
             </div>
           </div>
         )}
         <div className="absolute bottom-10 text-sm font-bold opacity-60 animate-pulse uppercase tracking-widest">Đợi Host tiếp tục...</div>
      </div>
    );
  }

  // 5. FINISHED
  return (
    <div className="h-full flex flex-col items-center justify-center bg-brand-darker p-6">
       <div className="text-center">
          <div className="text-brand-secondary text-2xl font-black uppercase tracking-widest mb-8">Tổng kết</div>
          <div className="w-40 h-40 mx-auto rounded-full border-4 border-brand-yellow mb-6 overflow-hidden bg-white shadow-[0_0_50px_rgba(250,204,21,0.5)]">
             <img src={getAvatarUrl(me?.avatarId || 0)} className="w-full h-full" />
          </div>
          <div className="text-7xl font-black text-white mb-2 tracking-tighter">{me?.score}</div>
          <div className="text-brand-accent font-bold text-xl uppercase">Điểm số cuối cùng</div>
       </div>
    </div>
  );
};

export default StudentView;
