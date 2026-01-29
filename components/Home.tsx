import React from 'react';
import { Monitor, Smartphone, Zap } from 'lucide-react';

interface HomeProps {
  onHost: () => void;
  onJoin: () => void;
}

export const Home: React.FC<HomeProps> = ({ onHost, onJoin }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
      <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-brand-accent font-bold text-sm mb-6 border border-white/10 animate-pop">
         <Zap size={16} fill="currentColor" /> GROUP 4 PRESENTS
      </div>
      
      <h2 className="text-5xl md:text-7xl font-black mb-4 leading-tight tracking-tight">
        MASTER OF <br/>
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent via-white to-brand-secondary drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
          CONFLICT
        </span>
      </h2>
      <p className="text-xl text-indigo-100 mb-12 max-w-xl opacity-80">
        Trò chơi tương tác thời gian thực. Nhanh tay, tinh mắt và chọn giải pháp đúng đắn!
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        {/* Host Button */}
        <button 
          onClick={onHost}
          className="group relative bg-white text-brand-darker p-8 rounded-3xl shadow-[0_8px_0_#cbd5e1] active:shadow-none active:translate-y-2 transition-all duration-150 flex flex-col items-center hover:bg-indigo-50"
        >
          <div className="bg-brand-light/20 p-6 rounded-2xl mb-6 group-hover:scale-110 transition-transform group-hover:bg-brand-light/30">
            <Monitor className="w-12 h-12 text-brand-purple" />
          </div>
          <h3 className="text-2xl font-black mb-2 uppercase tracking-wide">Chủ trì</h3>
          <p className="text-gray-500 font-medium">Tạo phòng và điều khiển game trên màn hình lớn.</p>
        </button>

        {/* Join Button */}
        <button 
          onClick={onJoin}
          className="group relative bg-gradient-to-br from-brand-accent to-cyan-600 text-white p-8 rounded-3xl shadow-[0_8px_0_#0e7490] active:shadow-none active:translate-y-2 transition-all duration-150 flex flex-col items-center hover:brightness-110"
        >
          <div className="bg-white/20 p-6 rounded-2xl mb-6 group-hover:scale-110 transition-transform">
            <Smartphone className="w-12 h-12 text-white" />
          </div>
          <h3 className="text-2xl font-black mb-2 uppercase tracking-wide">Người chơi</h3>
          <p className="text-cyan-100 font-medium">Tham gia trả lời câu hỏi bằng thiết bị cá nhân.</p>
        </button>
      </div>

      <div className="mt-16 text-sm text-white/30 font-mono">
        v2.0 • CyberPop Edition
      </div>
    </div>
  );
};
