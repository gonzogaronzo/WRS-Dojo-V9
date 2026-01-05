
import React, { useState, useRef, useEffect } from 'react';

interface DraggableProps {
  children: React.ReactNode;
  initialPos?: { x: number; y: number };
  onDragEnd?: (pos: { x: number; y: number }) => void;
  className?: string;
  disabled?: boolean;
  positionStrategy?: 'absolute' | 'fixed';
  style?: React.CSSProperties;
}

const Draggable: React.FC<DraggableProps> = ({ 
  children, 
  initialPos = { x: 0, y: 0 }, 
  onDragEnd, 
  className = '',
  disabled = false,
  positionStrategy = 'absolute',
  style
}) => {
  const [pos, setPos] = useState(initialPos);
  const [isDragging, setIsDragging] = useState(false);
  const [rel, setRel] = useState({ x: 0, y: 0 }); // Position relative to cursor
  const nodeRef = useRef<HTMLDivElement>(null);
  
  // Track movement to distinguish click vs drag
  const startPosRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  // Sync internal state if prop changes
  useEffect(() => {
    setPos(initialPos);
  }, [initialPos.x, initialPos.y]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled || e.button !== 0) return;
    setIsDragging(true);
    hasMovedRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    
    if (nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect();
      setRel({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      
      nodeRef.current.setPointerCapture(e.pointerId);
    }
    
    e.stopPropagation();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    
    // Check if moved enough to consider it a drag
    if (!hasMovedRef.current) {
      const dx = Math.abs(e.clientX - startPosRef.current.x);
      const dy = Math.abs(e.clientY - startPosRef.current.y);
      if (dx > 3 || dy > 3) {
        hasMovedRef.current = true;
      }
    }
    
    // For fixed positioning, we use client coordinates directly (viewport).
    // For absolute, we need to account for offsetParent.
    let x, y;
    
    if (positionStrategy === 'fixed') {
       x = e.clientX - rel.x;
       y = e.clientY - rel.y;
    } else {
       const parent = nodeRef.current?.offsetParent as HTMLElement;
       const parentRect = parent?.getBoundingClientRect() || { left: 0, top: 0 };
       x = e.clientX - parentRect.left - rel.x;
       y = e.clientY - parentRect.top - rel.y;
    }

    setPos({ x, y });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (nodeRef.current) {
      nodeRef.current.releasePointerCapture(e.pointerId);
    }
    
    if (onDragEnd) {
      onDragEnd(pos);
    }
  };
  
  const handleClick = (e: React.MouseEvent) => {
     if (hasMovedRef.current) {
       e.preventDefault();
       e.stopPropagation();
     }
  };

  return (
    <div
      ref={nodeRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={handleClick}
      className={`${positionStrategy} touch-none cursor-grab active:cursor-grabbing ${className} ${isDragging ? 'scale-105 shadow-2xl' : ''}`}
      style={{
        left: pos.x,
        top: pos.y,
        transition: isDragging ? 'none' : 'transform 0.1s, left 0.1s, top 0.1s', 
        ...style,
        zIndex: isDragging ? 9999 : style?.zIndex,
      }}
    >
      {children}
    </div>
  );
};

export default Draggable;
