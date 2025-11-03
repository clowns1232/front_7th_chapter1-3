import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import React from 'react';

import useDragMoveEvent from '../hooks/useDragMoveEvent';
import { Event as CalendarEvent } from '../types'; // 변경: 프로젝트 Event 타입을 별칭으로 가져옴

type DialogMode = 'edit' | 'delete';

const DIALOG_CONFIG = {
  edit: {
    title: '반복 일정 수정',
    message: '해당 일정만 수정하시겠어요?',
  },
  delete: {
    title: '반복 일정 삭제',
    message: '해당 일정만 삭제하시겠어요?',
  },
} as const;

const BUTTON_TEXT = {
  cancel: '취소',
  no: '아니오',
  yes: '예',
} as const;

/**
 * 컴포넌트 로컬 EventLike 타입 — hooks와 호환되도록 최소 필드만 정의
 */
type EventLike = {
  start: string | number | Date;
  end: string | number | Date;
};

interface RecurringEventDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (editSingleOnly: boolean) => void;
  event: CalendarEvent | null; // 변경: DOM Event 충돌을 피하기 위해 별칭 사용
  mode?: DialogMode;
  onDragEnd?: (newStart: Date, newEnd: Date) => void;
}

const RecurringEventDialog = ({
  open,
  onClose,
  onConfirm,
  mode = 'edit',
  event,
  onDragEnd,
}: RecurringEventDialogProps) => {
  const handleSingleOperation = () => {
    onConfirm(true);
  };

  const handleSeriesOperation = () => {
    onConfirm(false);
  };

  // 안전하게 event에서 start/end를 추출해 hooks에 넘김 (타입 가드 사용)
  let eventLike: EventLike | null = null;
  if (event && 'start' in event && 'end' in event) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    eventLike = { start: (event as any).start, end: (event as any).end };
  }

  const { dragRef, isDragging, previewStart, previewEnd } = useDragMoveEvent(eventLike, onDragEnd);

  if (!open) return null;

  const config = DIALOG_CONFIG[mode];

  const formatDateTime = (d: Date | null) =>
    d
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate()
        ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
          d.getMinutes()
        ).padStart(2, '0')}`
      : '';

  // 안전하게 현재 이벤트 시간 얻기 (hooks와 동일한 방식)
  const currentStart = eventLike ? new Date(eventLike.start) : null;
  const currentEnd = eventLike ? new Date(eventLike.end) : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="recurring-event-dialog-title"
      aria-describedby="recurring-event-dialog-description"
    >
      <DialogTitle id="recurring-event-dialog-title">{config.title}</DialogTitle>

      <DialogContent>
        <div
          // 드래그 대상 영역
          ref={(el) => {
            if (el) dragRef(el as unknown as HTMLElement);
          }}
          style={{
            userSelect: 'none',
            touchAction: 'none',
            padding: 8,
            borderRadius: 4,
            border: '1px dashed transparent',
            cursor: isDragging ? 'grabbing' : 'grab',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
          }}
        >
          <Typography id="recurring-event-dialog-description">{config.message}</Typography>

          {isDragging && (
            <Typography variant="body2" style={{ marginTop: 8 }}>
              이동 중: {formatDateTime(previewStart)} — {formatDateTime(previewEnd)}
            </Typography>
          )}

          {eventLike && !isDragging && (
            <Typography variant="body2" style={{ marginTop: 8 }}>
              현재: {formatDateTime(currentStart)} — {formatDateTime(currentEnd)}
            </Typography>
          )}
        </div>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {BUTTON_TEXT.cancel}
        </Button>
        <Button onClick={handleSeriesOperation} variant="outlined" color="primary">
          {BUTTON_TEXT.no}
        </Button>
        <Button onClick={handleSingleOperation} variant="contained" color="primary">
          {BUTTON_TEXT.yes}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RecurringEventDialog;
