import { useEffect, useRef, useState } from 'react';

// 기존에 가져오던 외부 Event 타입 사용을 제거하고 로컬 타입 정의
type EventLike = {
  start: string | number | Date;
  end: string | number | Date;
};

type DragEndCallback = (newStart: Date, newEnd: Date) => void;

interface UseDragMoveEventReturn {
  dragRef: (el: HTMLElement | null) => void;
  isDragging: boolean;
  previewStart: Date | null;
  previewEnd: Date | null;
}

interface UseDragMoveEventOptions {
  lockTime?: boolean;
  pxPerDay?: number;
  pxPerMinute?: number;
}

/**
 * useDragMoveEvent
 * - element에 마우스/터치 드래그로 이벤트를 이동시키는 기능 제공
 * - 드래그 종료 시 onDragEnd(newStart, newEnd) 호출
 *
 * 기본 매핑:
 * - 세로 이동(deltaY): 40px 당 1일
 * - 가로 이동(deltaX): 1px 당 1분
 *
 * 필요시 매핑 값은 훅 내부에서 조정하세요.
 */
export default function useDragMoveEvent(
  event: EventLike | null,
  onDragEnd?: DragEndCallback,
  options: UseDragMoveEventOptions = {}
): UseDragMoveEventReturn {
  const lockTime = options.lockTime ?? false;
  const pxPerDay = options.pxPerDay ?? 40; // 세로 40px -> 1일
  const pxPerMinute = options.pxPerMinute ?? 1; // 가로 1px -> 1분

  const nodeRef = useRef<HTMLElement | null>(null);
  const draggingRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const originalStartRef = useRef<Date | null>(null);
  const originalEndRef = useRef<Date | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [previewStart, setPreviewStart] = useState<Date | null>(null);
  const [previewEnd, setPreviewEnd] = useState<Date | null>(null);

  useEffect(() => {
    // update originals when event changes
    if (event && 'start' in event && 'end' in event) {
      originalStartRef.current = new Date(event.start);
      originalEndRef.current = new Date(event.end);
    } else {
      originalStartRef.current = null;
      originalEndRef.current = null;
    }
    setPreviewStart(null);
    setPreviewEnd(null);
  }, [event]);

  useEffect(() => {
    const el = nodeRef.current;
    if (!el) return;

    const getPos = (e: { clientX: number; clientY: number }) => {
      // MouseEvent와 Touch는 clientX/clientY를 가집니다.
      // 타입스크립트에서 안전하게 접근
      return { x: e.clientX, y: e.clientY };
    };

    const onMove = (clientX: number, clientY: number) => {
      if (!draggingRef.current || !originalStartRef.current || !originalEndRef.current) return;
      const start = startPosRef.current!;
      const deltaX = clientX - start.x;
      const deltaY = clientY - start.y;
      const dayOffset = Math.round(deltaY / pxPerDay);
      const minuteOffset = lockTime ? 0 : Math.round(deltaX / pxPerMinute);

      const newStart = new Date(originalStartRef.current.getTime());
      if (!lockTime) {
        newStart.setMinutes(newStart.getMinutes() + minuteOffset);
      }

      const hoveredElement =
        typeof document !== 'undefined' ? document.elementFromPoint(clientX, clientY) : null;
      const dateAttr =
        hoveredElement instanceof Element
          ? hoveredElement.closest('[data-calendar-date]')?.getAttribute('data-calendar-date')
          : null;

      if (dateAttr) {
        const [year, month, day] = dateAttr.split('-').map((value) => Number(value));
        if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
          newStart.setFullYear(year, month - 1, day);
        }
      } else {
        newStart.setDate(newStart.getDate() + dayOffset);
      }

      const duration = originalEndRef.current.getTime() - originalStartRef.current.getTime();
      const newEnd = new Date(newStart.getTime() + duration);

      setPreviewStart(newStart);
      setPreviewEnd(newEnd);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!originalStartRef.current) return;
      draggingRef.current = true;
      startPosRef.current = getPos(e);
      setIsDragging(true);
      e.preventDefault();
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (!originalStartRef.current) return;
      const t = e.touches[0];
      draggingRef.current = true;
      startPosRef.current = getPos(t);
      setIsDragging(true);
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      onMove(e.clientX, e.clientY);
      e.preventDefault();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!draggingRef.current) return;
      const t = e.touches[0];
      onMove(t.clientX, t.clientY);
      e.preventDefault();
    };

    const endDrag = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setIsDragging(false);
      const finalStart = previewStart;
      const finalEnd = previewEnd;

      if (finalStart && finalEnd && onDragEnd) {
        onDragEnd(previewStart, previewEnd);
      }
      // reset preview (caller may update event)
      setPreviewStart(null);
      setPreviewEnd(null);
      startPosRef.current = null;
    };

    const handleMouseUp = () => endDrag();
    const handleTouchEnd = () => endDrag();
    const handleTouchCancel = () => endDrag();

    el.addEventListener('mousedown', handleMouseDown);
    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchCancel);

    return () => {
      el.removeEventListener('mousedown', handleMouseDown);
      el.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [onDragEnd, previewStart, previewEnd, lockTime, pxPerDay, pxPerMinute]);

  // 드래그 상태에 따라 커서 변경을 별도 effect로 처리
  useEffect(() => {
    const prev = document.body.style.cursor || '';
    if (isDragging) {
      document.body.style.cursor = 'grabbing';
    } else {
      // 명시적으로 clearing 하지 않고 이전값 복원
      document.body.style.cursor = prev;
    }
    return () => {
      document.body.style.cursor = prev;
    };
  }, [isDragging]);

  const dragRef = (el: HTMLElement | null) => {
    nodeRef.current = el;
  };

  return { dragRef, isDragging, previewStart, previewEnd };
}
