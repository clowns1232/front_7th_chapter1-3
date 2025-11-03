import { Box, BoxProps } from '@mui/material';
import { SxProps, Theme } from '@mui/material/styles';
import { ReactNode, useMemo } from 'react';

import useDragMoveEvent from '../hooks/useDragMoveEvent';
import { Event } from '../types';

type DragRenderProps = {
  isDragging: boolean;
  previewStart: Date | null;
  previewEnd: Date | null;
};

interface DraggableCalendarEventProps {
  event: Event;
  onDragComplete?: (event: Event, newStart: Date, newEnd: Date) => void;
  render: (props: DragRenderProps) => ReactNode;
  sx?: SxProps<Theme>;
  boxProps?: Omit<BoxProps, 'sx' | 'ref'>;
  lockTime?: boolean;
}

const toDate = (date: string, time: string) => {
  const [year, month, day] = date.split('-').map((value) => Number(value));
  const [hours, minutes] = time.split(':').map((value) => Number(value));
  const result = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return result;
};

const DraggableCalendarEvent = ({
  event,
  onDragComplete,
  render,
  sx,
  boxProps,
  lockTime = true,
}: DraggableCalendarEventProps) => {
  const eventLike = useMemo(
    () => ({
      start: toDate(event.date, event.startTime),
      end: toDate(event.date, event.endTime),
    }),
    [event.date, event.endTime, event.startTime]
  );

  const { dragRef, isDragging, previewStart, previewEnd } = useDragMoveEvent(
    eventLike,
    onDragComplete
      ? (newStart, newEnd) => {
          onDragComplete(event, newStart, newEnd);
        }
      : undefined,
    { lockTime }
  );

  const baseSx = {
    userSelect: 'none' as const,
    touchAction: 'none' as const,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const combinedSx: SxProps<Theme> = Array.isArray(sx)
    ? [baseSx, ...sx]
    : sx
      ? [baseSx, sx]
      : [baseSx];

  const { ...restBoxProps } = boxProps ?? {};

  return (
    <Box
      ref={dragRef}
      sx={combinedSx}
      onClick={(event) => event.stopPropagation()}
      {...restBoxProps}
    >
      {render({ isDragging, previewStart, previewEnd })}
    </Box>
  );
};

export default DraggableCalendarEvent;
