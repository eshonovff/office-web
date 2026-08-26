import { useDroppable } from '@dnd-kit/core';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { cn } from '~/lib/utils';
import type { ProjectMember } from '~/types/project';

export const ASSIGNEE_DROP_PREFIX = 'assignee:';

interface AssigneeAvatarProps {
  member: ProjectMember;
}

export function AssigneeAvatar({ member }: AssigneeAvatarProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `${ASSIGNEE_DROP_PREFIX}${member.userId}` });

  const initials = member.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      ref={setNodeRef}
      title={member.fullName}
      className={cn('rounded-full transition-all', isOver && 'ring-primary ring-2 ring-offset-2')}>
      <Avatar>
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
    </div>
  );
}
