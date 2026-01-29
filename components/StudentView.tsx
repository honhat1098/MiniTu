import React, { useState, useEffect } from 'react';
import { GamePhase, GameState, Player } from '../types';
import { broadcastEvent, connectToGameRoom, getAvatarUrl, playSound } from '../services/gameService';
import { CheckCircle, XCircle, Clock, Zap } from 'lucide-react';

interface StudentViewProps {
  gameState: GameState;
  localPlayerId: string | null;
  setLocalPlayerId: (id: string) => void;
}

export const StudentView: React.FC<StudentViewProps> = ({ gameState, localPlayerId, setLocalPlayerId }) => {
  const [name, setName] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  const me = gameState.players.find(p => p.id === localPlayerId);
  const currentRound = gameState.rounds[gameState.currentRoundIndex];

  // Reset selection when round changes
  useEffect(() => {
    setSelectedWord(null);
  }, [gameState.currentRoundIndex, gameState.phase]);

  // Handle Result Sound
  useEffect(() => {
    if (gameState.phase === GamePhase.ROUND_RESULT && selectedWord) {
      const isCorrect = currentRound.correctWords.includes(selectedWord);
      if (isCorrect) playSound('correct');
      else playSound('wrong');
    }
  }, [gameState.phase]);

  const handleJoin = async () => {
    if (!name || !pinInput) return;
    setIsJoining(true);
    await connectToGameRoom(pinInput);
    
    const newPlayer: Player = {
      id: `student-${Date.now()}`,
      name: name,
      score: 0,
      avatarId: Math.floor(Math.random() * 1000),
      lives: 3 // Legacy, not used but required by type
    };
    
    setLocalPlayerId(newPlayer.id);
    broadcastEvent({ type: 'PLAYER_JOIN', payload: newPlayer });
  };

  const submitAnswer = (word: string) => {
    if (selectedWord || gameState.phase !== GamePhase.PLAYING) return;
    
    setSelectedWord(word);
    playSound('click'); // Gentle click
    
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
      <div className="h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-brand-purple to-brand-darker">
        <div className="glass-panel w-full max-w-md p-8 rounded-3xl animate-pop">
          <h2 className="text-2xl font-black text-center mb-8 uppercase text-brand-yellow">Tham Gia Game</h2>
          <div className="space-y-4">
            <input type="text" placeholder="Mã PIN" value={pinInput} onChange={e => setPinInput(e.target.value)} 
                   className="w-full bg-black/40 p-4 rounded-xl text-center text-xl font-mono text-white border border-white/20 outline-none" />
            <input type="text" placeholder="Tên của bạn" value={name} onChange={e => setName(e.target.value)} 
                   className="w-full bg-black/40 p-4 rounded-xl text-center text-xl font-bold text-white border border-white/20 outline-none" />
            <button onClick={handleJoin} disabled={isJoining} className="w-full bg-brand-accent text-white font-bold p-4 rounded-xl shadow-lg mt-4">
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
         <div className="w-24 h-24 rounded-full border-4 border-brand-yellow mb-4 overflow-hidden bg-white">
             <img src={getAvatarUrl(me?.avatarId || 0)} className="w-full h-full" />
         </div>
         <h1 className="text-3xl font-black mb-2">{me?.name}</h1>
         <div className="text-white/60 animate-pulse">Sẵn sàng! Hãy nhìn lên màn hình lớn.</div>
      </div>
    );
  }

  // 3. PLAYING GRID
  if (gameState.phase === GamePhase.PLAYING) {
    return (
       <div className="h-full flex flex-col p-4 bg-brand-dark">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm font-bold text-brand-yellow">Vòng {gameState.currentRoundIndex + 1}</div>
            <div className="bg-white/10 px-3 py-1 rounded-full text-sm font-bold">{me?.score} điểm</div>
          </div>

          <div className="text-center mb-6 px-2">
             <div className="text-lg font-bold leading-tight">{currentRound.question}</div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="grid grid-cols-3 gap-2 pb-20">
              {currentRound.allWords.map((word, idx) => (
                <button
                  key={idx}
                  onClick={() => submitAnswer(word)}
                  disabled={!!selectedWord}
                  className={`
                    p-3 rounded-lg text-sm font-bold shadow-md transition-all active:scale-95 flex items-center justify-center min-h-[60px] leading-tight break-words
                    ${selectedWord === word 
                      ? 'bg-brand-yellow text-black scale-95 border-2 border-white' 
                      : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border border-white/10'}
                    ${!!selectedWord && selectedWord !== word ? 'opacity-50' : ''}
                  `}
                >
                  {word}
                </button>
              ))}
            </div>
          </div>
          
          {selectedWord && (
             <div className="fixed bottom-0 left-0 w-full p-4 bg-black/80 backdrop-blur text-center animate-pop z-50">
                <div className="text-brand-yellow font-bold flex items-center justify-center gap-2">
                   <Clock className="animate-spin-slow" size={20} /> Đã chọn: {selectedWord}
                </div>
                <div className="text-xs text-white/50">Đợi kết quả...</div>
             </div>
          )}
       </div>
    );
  }

  // 4. ROUND RESULT
  if (gameState.phase === GamePhase.ROUND_RESULT) {
    const isCorrect = selectedWord && currentRound.correctWords.includes(selectedWord);
    
    return (
      <div className={`h-full flex flex-col items-center justify-center p-6 ${isCorrect ? 'bg-green-600' : 'bg-red-600'} transition-colors duration-500`}>
         {isCorrect ? (
           <div className="text-center animate-pop">
             <CheckCircle className="w-24 h-24 mx-auto mb-4 text-white" />
             <h2 className="text-4xl font-black mb-2">CHÍNH XÁC!</h2>
             <p className="text-xl opacity-90">+ Điểm thưởng tốc độ</p>
             <div className="mt-8 text-6xl font-black">{me?.score}</div>
           </div>
         ) : (
           <div className="text-center animate-pop">
             <XCircle className="w-24 h-24 mx-auto mb-4 text-white" />
             <h2 className="text-4xl font-black mb-2">SAI RỒI!</h2>
             <p className="opacity-80 mb-4">Bạn chọn: {selectedWord || "Chưa chọn"}</p>
             <div className="bg-black/20 p-4 rounded-xl">
               <div className="text-xs uppercase opacity-70 mb-1">Đáp án đúng:</div>
               <div className="font-bold text-xl">{currentRound.correctWords.join(", ")}</div>
             </div>
           </div>
         )}
         <div className="mt-12 text-sm opacity-60 animate-pulse">Đợi vòng tiếp theo...</div>
      </div>
    );
  }

  // 5. FINISHED
  return (
    <div className="h-full flex flex-col items-center justify-center bg-brand-dark p-6">
       <div className="text-center">
          <div className="text-2xl font-bold mb-6">Tổng kết</div>
          <div className="w-32 h-32 mx-auto rounded-full border-4 border-brand-yellow mb-4 overflow-hidden bg-white shadow-xl">
             <img src={getAvatarUrl(me?.avatarId || 0)} className="w-full h-full" />
          </div>
          <div className="text-6xl font-black text-brand-yellow mb-2">{me?.score}</div>
          <div className="text-white/60">Điểm số cuối cùng</div>
       </div>
    </div>
  );
};