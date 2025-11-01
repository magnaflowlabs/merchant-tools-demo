import React, { useState, useMemo, useCallback, useRef } from 'react';

interface VirtualTableProps<T> {
  data: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
}

export function VirtualTable<T>({
  data,
  height,
  itemHeight,
  renderItem,
  overscan = 5,
  className = '',
}: VirtualTableProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const { visibleItems, totalHeight, offsetY } = useMemo(() => {
    const containerHeight = height;
    const totalHeight = data.length * itemHeight;

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      data.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const visibleItems = data.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
    }));

    const offsetY = startIndex * itemHeight;

    return {
      visibleItems,
      totalHeight,
      offsetY,
    };
  }, [data, height, itemHeight, scrollTop, overscan]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map(({ item, index }) => (
            <div key={index} style={{ height: itemHeight }}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface VirtualTableBodyProps<T> {
  data: T[];
  height: number;
  itemHeight: number;
  renderRow: (item: T, index: number) => React.ReactNode;
  overscan?: number;
}

export function VirtualTableBody<T>({
  data,
  height,
  itemHeight,
  renderRow,
  overscan = 5,
}: VirtualTableBodyProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const { visibleItems, totalHeight, offsetY } = useMemo(() => {
    const containerHeight = height;
    const totalHeight = data.length * itemHeight;

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      data.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const visibleItems = data.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
    }));

    const offsetY = startIndex * itemHeight;

    return {
      visibleItems,
      totalHeight,
      offsetY,
    };
  }, [data, height, itemHeight, scrollTop, overscan]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={scrollElementRef}
      className="overflow-auto"
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          <table className="w-full">
            <tbody>{visibleItems.map(({ item, index }) => renderRow(item, index))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
