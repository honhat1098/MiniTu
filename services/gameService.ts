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

// --- Audio System (Updated for Soft/Zen Feel) ---
const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
let bgMusicAudio: HTMLAudioElement | null = null;

export const toggleBackgroundMusic = (shouldPlay: boolean) => {
  if (audioCtx.state === 'suspended') audioCtx.resume();

  if (!bgMusicAudio) {
    // Nhạc nền Zen/Action nhẹ nhàng hơn
    bgMusicAudio = new Audio('https://cdn.pixabay.com/download/audio/2022/11/22/audio_febc508520.mp3?filename=action-cinematic-hero-14987.mp3'); 
    bgMusicAudio.loop = true;
    bgMusicAudio.volume = 0.3;
  }

  if (shouldPlay) {
    bgMusicAudio.play().catch(() => console.log("User interaction needed for music"));
  } else {
    bgMusicAudio.pause();
  }
};

export const playSound = (type: 'slice' | 'explosion' | 'wrong' | 'start' | 'victory') => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const now = audioCtx.currentTime;
  const gainNode = audioCtx.createGain();
  gainNode.connect(audioCtx.destination);

  switch (type) {
    case 'slice':
      // Tiếng vút kiếm sắc bén (High frequency whoosh)
      const osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
      break;

    case 'explosion':
      // Tiếng nổ bong bóng (Soft Pop/Chime)
      const osc2 = audioCtx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(400, now);
      osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc2.start(now);
      osc2.stop(now + 0.3);
      break;

    case 'wrong':
      // Tiếng kính vỡ / bass trầm (Dull thud)
      const osc3 = audioCtx.createOscillator();
      osc3.type = 'sawtooth';
      osc3.frequency.setValueAtTime(100, now);
      osc3.frequency.linearRampToValueAtTime(50, now + 0.3);
      gainNode.gain.setValueAtTime(0.5, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
      osc3.start(now);
      osc3.stop(now + 0.3);
      break;

    case 'victory':
      // Hợp âm chiến thắng
      const oscV1 = audioCtx.createOscillator();
      const oscV2 = audioCtx.createOscillator();
      oscV1.frequency.setValueAtTime(523.25, now);
      oscV2.frequency.setValueAtTime(783.99, now);
      oscV1.connect(gainNode);
      oscV2.connect(gainNode);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 2);
      oscV1.start(now); oscV1.stop(now + 2);
      oscV2.start(now); oscV2.stop(now + 2);
      break;
  }
};