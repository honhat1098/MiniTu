export enum GamePhase {
  LOBBY = 'LOBBY',
  PLAYING = 'PLAYING', // Đang trong thời gian chọn
  ROUND_RESULT = 'ROUND_RESULT', // Hết giờ, hiện đáp án vòng đó
  FINISHED = 'FINISHED' // Tổng kết
}

export interface Player {
  id: string;
  name: string;
  score: number;
  avatarId: number;
  lastAnswer?: string; // Câu trả lời của player trong vòng hiện tại
  lastAnswerTime?: number;
  lives?: number;
}

export interface GameRound {
  id: number;
  question: string;
  correctWords: string[]; // Có thể có nhiều từ đúng tùy ngữ cảnh, nhưng thường là 1 best choice
  allWords: string[]; // Danh sách 20-30 từ hiển thị
  duration: number;
}

export interface GameState {
  pin: string;
  phase: GamePhase;
  players: Player[];
  currentRoundIndex: number;
  roundStartTime: number | null;
  rounds: GameRound[];
}

export type GameEvent = 
  | { type: 'SYNC_STATE'; payload: GameState }
  | { type: 'PLAYER_JOIN'; payload: Player }
  | { type: 'PLAYER_SUBMIT'; payload: { id: string; answer: string; timeTaken: number } }
  | { type: 'HOST_NEXT_ROUND'; payload: { roundIndex: number; startTime: number } }
  | { type: 'HOST_SHOW_RESULT'; payload: {} }
  | { type: 'HOST_END'; payload: {} };

export interface ScenarioNode {
  id: string;
  opponentName: string;
  opponentAvatarId: number;
  situationContext: string;
  npcDialogue: string;
  timeLimit: number;
  options: {
    id: string;
    text: string;
    strategy: string;
    isOptimal: boolean;
    npcReaction: string;
    tensionChange: number;
    trustChange: number;
    explanation: string;
  }[];
}

export enum NinjaGameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export interface WordEntity {
  id: string;
  text: string;
  type: 'GOOD' | 'BAD';
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  radius: number;
  sliced: boolean;
  scale: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}