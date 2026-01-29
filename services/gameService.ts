import { createClient, RealtimeChannel } from "@supabase/supabase-js";
import { GameEvent } from "../types";

// --- CẤU HÌNH SUPABASE ---
const SUPABASE_URL = 'https://depaeokhrsfwxczqckjr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlcGFlb2tocnNmd3hjenFja2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDU4NzgsImV4cCI6MjA4NTA4MTg3OH0.P4IiK6T3QL6HLNq61Az93B1boNNV5KNB_14xfoQPHVM'; 
// ---------------------------------------------

let supabase: any = null;
let currentChannel: RealtimeChannel | null = null;

try {
  if (SUPABASE_KEY && SUPABASE_URL) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
} catch (e) {
  console.error("Supabase init failed", e);
}

let onGameEvent: ((event: GameEvent) => void) | null = null;

export const connectToGameRoom = async (pin: string) => {
  if (!supabase) return;
  if (currentChannel) await supabase.removeChannel(currentChannel);

  currentChannel = supabase.channel(`ninja_room_${pin}`, {
    config: { broadcast: { self: true } },
  });

  currentChannel
    .on('broadcast', { event: 'game-event' }, (payload: { payload: GameEvent }) => {
      if (onGameEvent) onGameEvent(payload.payload);
    })
    .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') console.log("Connected to room", pin);
    });
};

export const subscribeToGameEvents = (callback: (event: GameEvent) => void) => {
  onGameEvent = callback;
  return () => { onGameEvent = null; };
};

export const broadcastEvent = async (event: GameEvent) => {
  if (!currentChannel) return;
  await currentChannel.send({
    type: 'broadcast',
    event: 'game-event',
    payload: event,
  });
};

export const generatePin = () => Math.floor(100000 + Math.random() * 900000).toString();
export const getAvatarUrl = (id: number) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`;
export const getQrCodeUrl = (data: string) => `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;

// --- Audio System (Modern & Clean - No 8-bit) ---
let audioCtx: AudioContext | null = null;
let bgMusicAudio: HTMLAudioElement | null = null;

// Helper to safely get or create AudioContext
const getAudioCtx = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtx;
};

export const toggleBackgroundMusic = (shouldPlay: boolean) => {
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') ctx.resume();

  if (!bgMusicAudio) {
    // Updated Track: Comedy Funny Quirky (Modern, Fun)
    bgMusicAudio = new Audio('https://cdn.pixabay.com/download/audio/2025/07/24/audio_a01817ef77.mp3?filename=comedy-funny-quirky-background-music-379525.mp3'); 
    bgMusicAudio.loop = true;
    bgMusicAudio.volume = 0.3; // Volume vừa phải
  }

  if (shouldPlay) {
    bgMusicAudio.play().catch(() => console.log("User interaction needed for music"));
  } else {
    bgMusicAudio.pause();
  }
};

export const playSound = (type: 'slice' | 'explosion' | 'wrong' | 'start' | 'victory' | 'join' | 'correct' | 'tick' | 'click') => {
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
  
  const now = ctx.currentTime;
  const gainNode = ctx.createGain();
  // Master compressor for better sound quality
  const compressor = ctx.createDynamicsCompressor();
  
  gainNode.connect(compressor);
  compressor.connect(ctx.destination);

  switch (type) {
    case 'click':
      // Modern "Pop" / Bubble sound (High Sine wave with fast decay)
      const oscClick = ctx.createOscillator();
      oscClick.type = 'sine';
      oscClick.frequency.setValueAtTime(800, now);
      oscClick.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      
      oscClick.connect(gainNode);
      oscClick.start(now);
      oscClick.stop(now + 0.1);
      break;

    case 'join':
      // "Bloop" sound (Water drop style)
      const oscJoin = ctx.createOscillator();
      oscJoin.type = 'sine';
      oscJoin.frequency.setValueAtTime(400, now);
      oscJoin.frequency.linearRampToValueAtTime(800, now + 0.2);
      
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.linearRampToValueAtTime(0.01, now + 0.2);
      
      oscJoin.connect(gainNode);
      oscJoin.start(now);
      oscJoin.stop(now + 0.2);
      break;

    case 'correct':
      // Pleasant Chime (Major Third Harmony)
      [523.25, 659.25].forEach((freq, i) => { // C5, E5
        const osc = ctx.createOscillator();
        osc.type = 'sine'; // Sine is smooth, not 8-bit
        osc.frequency.setValueAtTime(freq, now);
        
        const g = ctx.createGain();
        g.connect(compressor);
        
        g.gain.setValueAtTime(0.15, now);
        g.gain.exponentialRampToValueAtTime(0.01, now + 0.6); // Long sustain
        
        osc.connect(g);
        osc.start(now + i * 0.05); // Slight stagger (strum effect)
        osc.stop(now + 0.7);
      });
      break;

    case 'wrong':
      // Soft "Bonk" (Low Triangle wave)
      const oscWrong = ctx.createOscillator();
      oscWrong.type = 'triangle'; // Warmer than square/sawtooth
      oscWrong.frequency.setValueAtTime(150, now);
      oscWrong.frequency.exponentialRampToValueAtTime(100, now + 0.2);
      
      gainNode.gain.setValueAtTime(0.4, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      
      oscWrong.connect(gainNode);
      oscWrong.start(now);
      oscWrong.stop(now + 0.2);
      break;

    case 'slice':
      // Clean "Swoosh" (High pitch sine slide down)
      const oscSlice = ctx.createOscillator();
      oscSlice.type = 'sine';
      oscSlice.frequency.setValueAtTime(2000, now);
      oscSlice.frequency.exponentialRampToValueAtTime(200, now + 0.2);
      
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.linearRampToValueAtTime(0.01, now + 0.2);
      
      oscSlice.connect(gainNode);
      oscSlice.start(now);
      oscSlice.stop(now + 0.2);
      break;

    case 'tick':
      // Woodblock-like (Sine with very fast attack/decay)
      const oscTick = ctx.createOscillator();
      oscTick.type = 'sine';
      oscTick.frequency.setValueAtTime(1000, now);
      
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      
      oscTick.connect(gainNode);
      oscTick.start(now);
      oscTick.stop(now + 0.05);
      break;

    case 'victory':
      // Fanfare (Chord Stack - Sine/Triangle mix)
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.value = freq;
        
        const g = ctx.createGain();
        g.connect(compressor);
        
        const start = now + i * 0.1;
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.15, start + 0.1);
        g.gain.exponentialRampToValueAtTime(0.01, start + 2);
        
        osc.connect(g);
        osc.start(start);
        osc.stop(start + 2.5);
      });
      break;
      
    case 'start':
      // Uplifting Sweep
      const oscStart = ctx.createOscillator();
      oscStart.type = 'sine';
      oscStart.frequency.setValueAtTime(200, now);
      oscStart.frequency.exponentialRampToValueAtTime(1000, now + 0.6);
      
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.6);
      
      oscStart.connect(gainNode);
      oscStart.start(now);
      oscStart.stop(now + 0.6);
      break;
      
    case 'explosion':
      // Since we can't use noise easily without a buffer, use a rapid low cluster
      // to simulate a "thump"
      [100, 120, 150].forEach(f => {
         const o = ctx.createOscillator();
         o.type = 'triangle';
         o.frequency.setValueAtTime(f, now);
         o.frequency.exponentialRampToValueAtTime(50, now + 0.3);
         const g = ctx.createGain();
         g.connect(compressor);
         g.gain.setValueAtTime(0.2, now);
         g.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
         o.connect(g);
         o.start(now);
         o.stop(now + 0.3);
      });
      break;
  }
};
