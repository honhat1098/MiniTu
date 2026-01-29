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

// --- Audio System (Updated for Upbeat/Funky Feel) ---
const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
let bgMusicAudio: HTMLAudioElement | null = null;

export const toggleBackgroundMusic = (shouldPlay: boolean) => {
  if (audioCtx.state === 'suspended') audioCtx.resume();

  if (!bgMusicAudio) {
    // New Upbeat / Funky Track suitable for gameshows
    bgMusicAudio = new Audio('https://cdn.pixabay.com/download/audio/2021/11/01/audio_00fa556552.mp3?filename=funky-life-112188.mp3'); 
    bgMusicAudio.loop = true;
    bgMusicAudio.volume = 0.25;
  }

  if (shouldPlay) {
    bgMusicAudio.play().catch(() => console.log("User interaction needed for music"));
  } else {
    bgMusicAudio.pause();
  }
};

export const playSound = (type: 'slice' | 'explosion' | 'wrong' | 'start' | 'victory' | 'join' | 'correct' | 'tick' | 'click') => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const now = audioCtx.currentTime;
  const gainNode = audioCtx.createGain();
  gainNode.connect(audioCtx.destination);

  switch (type) {
    case 'slice':
      // Sharp Woosh
      const osc = audioCtx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;

    case 'explosion':
      // Soft Pop
      const osc2 = audioCtx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(200, now);
      osc2.frequency.exponentialRampToValueAtTime(50, now + 0.3);
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
      osc2.start(now);
      osc2.stop(now + 0.3);
      break;

    case 'wrong':
      // Low Error Buzz
      const osc3 = audioCtx.createOscillator();
      osc3.type = 'sawtooth';
      osc3.frequency.setValueAtTime(150, now);
      osc3.frequency.linearRampToValueAtTime(100, now + 0.3);
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
      osc3.start(now);
      osc3.stop(now + 0.3);
      break;

    case 'victory':
      // Arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = 'square';
        o.frequency.value = freq;
        o.connect(g);
        g.connect(audioCtx.destination);
        const startTime = now + i * 0.1;
        g.gain.setValueAtTime(0.1, startTime);
        g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
        o.start(startTime);
        o.stop(startTime + 0.5);
      });
      break;

    case 'start':
      // Power Up
      const oscStart = audioCtx.createOscillator();
      oscStart.type = 'triangle';
      oscStart.frequency.setValueAtTime(220, now);
      oscStart.frequency.linearRampToValueAtTime(880, now + 0.4);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.4);
      oscStart.start(now); oscStart.stop(now + 0.4);
      break;

    case 'join':
      // Ding
      const oscJoin = audioCtx.createOscillator();
      oscJoin.type = 'sine';
      oscJoin.frequency.setValueAtTime(1200, now);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      oscJoin.start(now); oscJoin.stop(now + 0.5);
      break;

    case 'correct':
      // High Ding
      const oscCorrect = audioCtx.createOscillator();
      oscCorrect.type = 'sine';
      oscCorrect.frequency.setValueAtTime(880, now);
      oscCorrect.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
      oscCorrect.start(now); oscCorrect.stop(now + 0.2);
      break;

    case 'tick':
      // Wood block click
      const oscTick = audioCtx.createOscillator();
      oscTick.type = 'square';
      oscTick.frequency.setValueAtTime(1200, now);
      gainNode.gain.setValueAtTime(0.05, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      oscTick.start(now); oscTick.stop(now + 0.03);
      break;

    case 'click':
      // Modern UI Click (Crisp)
      const oscClick = audioCtx.createOscillator();
      oscClick.type = 'triangle';
      oscClick.frequency.setValueAtTime(600, now);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      oscClick.start(now); oscClick.stop(now + 0.08);
      break;
  }
};
