
import React from 'react';
import { TileData, getTileColor } from '../utils';

interface TileProps {
  data: TileData;
  size?: 'sm' | 'md' | 'lg';
}

const Tile: React.FC<TileProps> = ({ data, size = 'md' }) => {
  // If it's a space, render a gap
  if (data.type === 'space') {
    return <div className={`${size === 'lg' ? 'w-8' : size === 'md' ? 'w-6' : 'w-3'} h-full transition-all`} />;
  }

  const sizeClasses = {
    // Min width approx 48px as requested
    sm: 'h-14 min-w-[3rem] text-xl px-3', 
    md: 'h-24 min-w-[4.5rem] text-5xl px-4',
    lg: 'h-32 min-w-[6rem] text-7xl px-6',
  };

  return (
    <div
      className={`
        ${sizeClasses[size]} 
        ${getTileColor(data.type)} 
        relative
        flex items-center justify-center 
        font-bold 
        text-black
        border-b-[4px] border-r border-l border-t
        rounded-xl
        shadow-sm
        select-none 
        cursor-default
        transition-all
      `}
      style={{
        fontFamily: '"Inter", sans-serif'
      }}
    >
      <span className="z-10">{data.text}</span>
    </div>
  );
};

export default Tile;
