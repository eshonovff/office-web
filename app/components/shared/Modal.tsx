import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { cn } from '~/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * Base modal component.
 *
 * - Content scrolls inside the dialog while header and footer stay fixed — and only when it is
 *   taller than the screen allows (the dialog may use all but 1rem above and below).
 * - The shared Dialog wrapper owns the overlay and focus behavior.
 */
export function Modal({ open, onClose, title, children, footer, className }: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={cn('bg-sidebar flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-lg', className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className={cn('flex-1 overflow-y-auto py-3')}>{children}</div>

        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
