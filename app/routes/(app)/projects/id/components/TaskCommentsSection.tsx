import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tasksApi } from '~/api/tasks';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { formatDate } from '~/lib/format';
import type { ProjectMember } from '~/types/project';

interface TaskCommentsSectionProps {
  taskId: string;
  members: ProjectMember[];
  canComment: boolean;
}

function initialsOf(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function TaskCommentsSection({ taskId, members, canComment }: TaskCommentsSectionProps) {
  const { t } = useTranslation('board');
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  const { data: comments = [] } = useQuery({
    queryKey: ['tasks', taskId, 'comments'],
    queryFn: () => tasksApi.listComments(taskId),
  });

  const { mutate: createComment, isPending } = useMutation({
    mutationFn: (text: string) => tasksApi.createComment(taskId, { body: text }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', taskId, 'comments'] });
      void queryClient.invalidateQueries({ queryKey: ['tasks', taskId, 'activity'] });
      setBody('');
    },
  });

  const mentionMatches = useMemo(() => {
    if (mentionQuery === null) return [];
    const query = mentionQuery.toLowerCase();
    return members.filter((m) => m.fullName.toLowerCase().includes(query)).slice(0, 6);
  }, [mentionQuery, members]);

  function handleChange(value: string) {
    setBody(value);
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const beforeCursor = value.slice(0, cursor);
    const match = /(?:^|\s)@([\p{L}]*)$/u.exec(beforeCursor);
    setMentionQuery(match ? match[1] : null);
  }

  function insertMention(member: ProjectMember) {
    const cursor = textareaRef.current?.selectionStart ?? body.length;
    const beforeCursor = body.slice(0, cursor);
    const afterCursor = body.slice(cursor);
    const replaced = beforeCursor.replace(/@[\p{L}]*$/u, `@${member.fullName} `);
    setBody(replaced + afterCursor);
    setMentionQuery(null);
    textareaRef.current?.focus();
  }

  return (
    <div className="space-y-3">
      <Label>{t('comments')}</Label>

      {comments.length > 0 && (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2.5">
              <Avatar size="sm">
                <AvatarFallback className="text-2xs">{initialsOf(comment.authorName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{comment.authorName}</span>
                  <span className="text-muted-foreground text-2xs">{formatDate(comment.createdAt, true)}</span>
                </div>
                <p className="text-sm break-words whitespace-pre-wrap">{comment.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {canComment && (
        <div className="relative space-y-2">
          <Textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={t('commentPlaceholder')}
            rows={2}
          />

          {mentionMatches.length > 0 && (
            <div className="bg-popover absolute z-10 w-64 space-y-0.5 rounded-lg border p-1 shadow-md">
              {mentionMatches.map((member) => (
                <button
                  key={member.userId}
                  type="button"
                  className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
                  onClick={() => insertMention(member)}>
                  <Avatar size="sm">
                    <AvatarFallback className="text-2xs">{initialsOf(member.fullName)}</AvatarFallback>
                  </Avatar>
                  {member.fullName}
                </button>
              ))}
            </div>
          )}

          <Button type="button" size="sm" disabled={isPending || !body.trim()} onClick={() => createComment(body.trim())}>
            {t('sendComment')}
          </Button>
        </div>
      )}
    </div>
  );
}
