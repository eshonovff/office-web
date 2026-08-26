import { useDroppable } from '@dnd-kit/core';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { cn } from '~/lib/utils';

export const ASSIGNEE_DROP_PREFIX = 'assignee:';

interface AssigneeAvatarOption {
  userId: string;
  fullName: string;
}

interface AssigneeAvatarProps {
  member: AssigneeAvatarOption;
}

// Same shape as projects/id/components/AssigneeAvatar.tsx — reused pattern,
// not the same file, since the member type differs (ProjectMember vs a
// plain {userId, fullName} pair here) and this one has no project coupling.
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
      <Avatar size="sm">
        <AvatarFallback className="text-2xs">{initials}</AvatarFallback>
      </Avatar>
    </div>
  );
}
