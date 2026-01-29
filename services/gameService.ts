import React, { useState, useEffect } from 'react';
import { GamePhase, GameState, Player, GameEvent, GameRound } from './types';
import { broadcastEvent, subscribeToGameEvents, generatePin, connectToGameRoom, toggleBackgroundMusic, playSound } from './services/gameService';
import { TeacherView } from './components/TeacherView';
import StudentView from './components/StudentView';
import { Home } from './components/Home';

// --- DATA CẤU HÌNH GAME ---
const WORD_POOL = [
  "Lắng nghe", "Tranh cãi", "Nhượng bộ", "Bình tĩnh", "Đổ lỗi", 
  "Hợp tác", "Né tránh", "Thỏa hiệp", "Tôn trọng", "Cáu gắt", 
  "Chỉ trích", "Đồng cảm", "Áp đặt", "Đối thoại", "Im lặng", 
  "Phản ứng", "Chia sẻ", "Kiềm chế", "Phủ nhận", "Thông cảm",
  "Phán xét", "Tha thứ", "Gây hấn", "Cởi mở"
];

const GAME_ROUNDS: GameRound[] = [
  {
    id: 1,
    question: "Đối phương đang rất giận dữ và to tiếng. Bạn nên làm gì đầu tiên?",
    correctWords: ["Bình tĩnh", "Lắng nghe", "Kiềm chế"], 
    allWords: WORD_POOL, // Dùng chung pool hoặc shuffle tùy ý
    duration: 15
  },
  {
    id: 2,
    question: "Hành vi nào dễ làm mâu thuẫn leo thang và tồi tệ hơn?",
    correctWords: ["Đổ lỗi", "Chỉ trích", "Cáu gắt", "Gây hấn"],
    allWords: WORD_POOL,
    duration: 15
  },
  {
    id: 3,
    question: "Để cả hai bên cùng có lợi (Win-Win), chúng ta cần thái độ nào?",
    correctWords: ["Hợp tác", "Cởi mở"],
    allWords: WORD_POOL,
    duration: 15
  },
  {
    id: 4,
    question: "Giải pháp tạm thời để 'hạ nhiệt' khi quá căng thẳng, chưa thể nói chuyện ngay?",
    correctWords: ["Né tránh", "Im lặng", "Kiềm chế"], // Tạm hoãn
    allWords: WORD_POOL,
    duration: 15
  },
  {
    id: 5,
    question: "Trong mâu thuẫn, yếu tố quan trọng nhất để duy trì mối quan hệ là gì?",
    correctWords: ["Tôn trọng", "Đồng cảm"],
    allWords: WORD_POOL,
    duration: 15
  }
];

const INITIAL_STATE: GameState = {
  pin: '',
  phase: GamePhase.LOBBY,
  players: [],
  currentRoundIndex: 0,
  roundStartTime: null,
  rounds: GAME_ROUNDS
};

const App: React.FC = () => {
  const [role, setRole] = useState<'teacher' | 'student' | null>(null);
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);

  // Global Audio Unlock & Click Ripple Effect
  useEffect(() => {
    const handleFirstClick = () => {
      toggleBackgroundMusic(false); // Init context only
    };
    
    const handleClickSound = (e: MouseEvent) => {
        // Only play if not silenced or specific elements
        playSound('click');
        
        // Add visual ripple
        const ripple = document.createElement('div');
        ripple.className = 'click-ripple';
        ripple.style.left = `${e.clientX}px`;
        ripple.style.top = `${e.clientY}px`;
        document.body.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    };

    window.addEventListener('click', handleFirstClick, { once: true });
    window.addEventListener('click', handleClickSound);
    
    return () => {
        window.removeEventListener('click', handleFirstClick);
        window.removeEventListener('click', handleClickSound);
    };
  }, []);

  // Sync Logic
  useEffect(() => {
    const unsubscribe = subscribeToGameEvents((event: GameEvent) => {
      if (role === 'teacher') {
        if (event.type === 'PLAYER_JOIN') {
          playSound('join');
          setGameState(prev => {
             if (prev.players.find(p => p.id === event.payload.id)) return prev;
             const newState = { ...prev, players: [...prev.players, event.payload] };
             broadcastEvent({ type: 'SYNC_STATE', payload: newState });
             return newState;
          });
        }
        else if (event.type === 'PLAYER_SUBMIT') {
           // Teacher calculates score immediately upon submission
           setGameState(prev => {
             const round = prev.rounds[prev.currentRoundIndex];
             // Safety check: if round undefined
             if (!round) return prev;

             const isCorrect = round.correctWords.includes(event.payload.answer);
             
             // Scoring: Base 1000 + Time Bonus (max 500) if correct
             let scoreToAdd = 0;
             if (isCorrect) {
               const maxTime = round.duration * 1000;
               const timeTaken = Math.min(event.payload.timeTaken, maxTime); // clamp time
               const timeBonus = Math.max(0, Math.floor(((maxTime - timeTaken) / maxTime) * 500));
               scoreToAdd = 1000 + timeBonus;
               playSound('correct'); // Subtle notify for host
             }

             const updatedPlayers = prev.players.map(p => 
               p.id === event.payload.id 
                 ? { 
                     ...p, 
                     score: p.score + scoreToAdd, 
                     lastAnswer: event.payload.answer,
                     lastAnswerTime: event.payload.timeTaken
                   }
                 : p
             );

             const newState = { ...prev, players: updatedPlayers };
             // FORCE SYNC: Đảm bảo tất cả client đều biết trạng thái "đã chọn"
             broadcastEvent({ type: 'SYNC_STATE', payload: newState });
             return newState;
           });
        }
      } 
      else if (role === 'student') {
        if (event.type === 'SYNC_STATE') {
          setGameState(event.payload);
        }
        if (event.type === 'HOST_NEXT_ROUND') {
           setGameState(prev => ({ 
             ...prev, 
             phase: GamePhase.PLAYING, 
             currentRoundIndex: event.payload.roundIndex,
             roundStartTime: event.payload.startTime,
             // Student state reset handles in component via selectedWord
           }));
           playSound('start');
        }
        if (event.type === 'HOST_SHOW_RESULT') {
           setGameState(prev => ({ ...prev, phase: GamePhase.ROUND_RESULT }));
           // Play sound handled in view based on result
        }
        if (event.type === 'HOST_END') {
           setGameState(prev => ({ ...prev, phase: GamePhase.FINISHED }));
           playSound('victory');
        }
      }
    });
    return () => unsubscribe();
  }, [role]);

  const handleBecomeHost = async () => {
    const newPin = generatePin();
    await connectToGameRoom(newPin);
    const newState = { ...INITIAL_STATE, pin: newPin };
    setGameState(newState);
    setRole('teacher');
    toggleBackgroundMusic(true);
  };

  const handleBecomeStudent = () => {
    setRole('student');
    toggleBackgroundMusic(false); 
  };

  return (
    <div className="min-h-screen font-sans overflow-hidden text-white relative bg-gradient-to-br from-brand-dark via-brand-purple to-pink-900">
       {/* Background Particles - Updated Colors */}
       <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-10 left-20 w-64 h-64 bg-brand-accent rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-10 right-20 w-80 h-80 bg-brand-secondary rounded-full blur-[100px] animate-float" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600 rounded-full blur-[120px] opacity-50"></div>
       </div>

      <main className="relative z-10 h-full">
        {!role && <Home onHost={handleBecomeHost} onJoin={handleBecomeStudent} />}
        
        {role === 'teacher' && (
          <TeacherView 
            gameState={gameState} 
            updateGameState={(newState) => {
              setGameState(newState);
              broadcastEvent({ type: 'SYNC_STATE', payload: newState });
            }} 
          />
        )}
        
        {role === 'student' && (
          <StudentView 
            gameState={gameState} 
            localPlayerId={localPlayerId} 
            setLocalPlayerId={setLocalPlayerId}
          />
        )}
      </main>

      {/* Watermark */}
      <div className="fixed top-4 right-4 z-50 text-white/30 font-bold text-[10px] pointer-events-none text-right">
         <div className="uppercase tracking-widest text-brand-accent">Conflict Master</div>
         <div>Group 4</div>
      </div>
    </div>
  );
};

export default App;
