import React, { useState, useEffect } from 'react';
import { GamePhase, GameState, Player, GameEvent } from './types';
import { broadcastEvent, subscribeToGameEvents, generatePin, connectToGameRoom, toggleBackgroundMusic, playSound } from './services/gameService';
import { TeacherView } from './components/TeacherView';
import { StudentView } from './components/StudentView';
import { Home } from './components/Home';

const INITIAL_STATE: GameState = {
  pin: '',
  phase: GamePhase.LOBBY,
  players: [],
  startTime: null,
};

const App: React.FC = () => {
  const [role, setRole] = useState<'teacher' | 'student' | null>(null);
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);

  // Global Audio Unlock
  useEffect(() => {
    const handleFirstClick = () => {
      toggleBackgroundMusic(false); // Init context only
    };
    window.addEventListener('click', handleFirstClick, { once: true });
    return () => window.removeEventListener('click', handleFirstClick);
  }, []);

  // Sync Logic
  useEffect(() => {
    const unsubscribe = subscribeToGameEvents((event: GameEvent) => {
      if (role === 'teacher') {
        if (event.type === 'PLAYER_JOIN') {
          playSound('slice'); // Sound effect when player joins
          setGameState(prev => {
             if (prev.players.find(p => p.id === event.payload.id)) return prev;
             const newState = { ...prev, players: [...prev.players, event.payload] };
             broadcastEvent({ type: 'SYNC_STATE', payload: newState });
             return newState;
          });
        }
        else if (event.type === 'PLAYER_UPDATE') {
           setGameState(prev => ({
             ...prev,
             players: prev.players.map(p => 
               p.id === event.payload.id 
                 ? { ...p, score: event.payload.score, lives: event.payload.lives }
                 : p
             )
           }));
        }
      } 
      else if (role === 'student') {
        if (event.type === 'SYNC_STATE') setGameState(event.payload);
        if (event.type === 'HOST_START') {
           setGameState(prev => ({ ...prev, phase: GamePhase.PLAYING, startTime: event.payload.startTime }));
           playSound('start');
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
    toggleBackgroundMusic(false); // Student plays own music when game starts
  };

  return (
    <div className="min-h-screen font-sans overflow-hidden text-white relative bg-gradient-to-br from-[#120c29] via-[#302b63] to-[#24243e]">
       {/* Background Particles */}
       <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-10 left-20 w-32 h-32 bg-purple-500 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-10 right-20 w-48 h-48 bg-blue-500 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
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
         <div className="uppercase tracking-widest">Conflict Ninja</div>
         <div>Group 4</div>
      </div>
    </div>
  );
};

export default App;