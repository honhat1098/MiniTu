export enum GamePhase {
  LOBBY = 'LOBBY',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED'
}

export enum NinjaGameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export interface Player {
  id: string;
  name: string;
  score: number;
  lives: number;
  avatarId: number;
}

export interface GameState {
  pin: string;
  phase: GamePhase;
  players: Player[];
  startTime: number | null;
}

export type GameEvent = 
  | { type: 'SYNC_STATE'; payload: GameState }
  | { type: 'PLAYER_JOIN'; payload: Player }
  | { type: 'PLAYER_UPDATE'; payload: { id: string; score: number; lives: number } } // Realtime score update
  | { type: 'HOST_START'; payload: { startTime: number } }
  | { type: 'HOST_END'; payload: {} };

// Physics Types
export interface WordEntity {
  id: string;
  text: string;
  type: 'BAD' | 'GOOD'; 
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  radius: number;
  sliced: boolean;
  scale: number;
  color?: string;
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

// Scenario Types
export interface ScenarioOption {
  id: string;
  text: string;
  strategy: string;
  isOptimal: boolean;
  npcReaction: string;
  tensionChange: number;
  trustChange: number;
  explanation: string;
}

export interface ScenarioNode {
  id: string;
  opponentName: string;
  opponentAvatarId: number;
  situationContext: string;
  npcDialogue: string;
  timeLimit: number;
  options: ScenarioOption[];
}