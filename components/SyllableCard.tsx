
import React from 'react';

interface SyllableCardProps {
  text: string;
}

const SyllableCard: React.FC<SyllableCardProps> = ({ text }) => {
  return (
    <div className="
      bg-white 
      border border-[#CCCCCC]
      rounded-xl
      px-8 py-6 md:px-10 md:py-8
      min-w-[120px] 
      flex items-center justify-center 
      shadow-sm
    ">
      <span className="text-6xl md:text-8xl font-bold text-black font-sans tracking-tight leading-none">
        {text}
      </span>
    </div>
  );
};

export default SyllableCard;
