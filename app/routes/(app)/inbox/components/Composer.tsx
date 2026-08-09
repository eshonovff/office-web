import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Send } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { channelsApi } from '~/api/channels';
import { conversationsApi } from '~/api/conversations';
import { CustomSelect } from '~/components/shared/CustomSelect';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { Permissions } from '~/config/permissions';
import { useCan } from '~/hooks/useCan';
import { formatWindowRemaining } from '~/lib/format';
import type { ConversationDetail } from '~/types/conversation';

interface ComposerProps {
  conversation: ConversationDetail;
}

function isWindowOpen(windowExpiresAt: string | null): boolean {
  return !!windowExpiresAt && dayjs(windowExpiresAt).isAfter(dayjs());
}

export function Composer({ conversation }: ComposerProps) {
  const { t } = useTranslation('inbox');
  const { can } = useCan();
  const canManageChannels = can(Permissions.Channels.Manage);
  const queryClient = useQueryClient();

  const [body, setBody] = useState('');
  const [templateName, setTemplateName] = useState<string | null>(null);
  // Flips true only on a 409 mid-send — the render-time `windowOpen` check
  // already covers the common case (window already closed before typing).
  const [windowClosedDuringSend, setWindowClosedDuringSend] = useState(false);

  const windowOpen = isWindowOpen(conversation.windowExpiresAt);
  const isWhatsApp = conversation.channelType === 'WhatsApp';
  const showTemplates = (!windowOpen || windowClosedDuringSend) && isWhatsApp;

  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['channels', conversation.channelId, 'whatsapp-templates'],
    queryFn: () => channelsApi.listWhatsAppTemplates(conversation.channelId),
    enabled: showTemplates && canManageChannels,
    staleTime: 5 * 60_000,
  });

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: (payload: Parameters<typeof conversationsApi.sendMessage>[1]) =>
      conversationsApi.sendMessage(conversation.id, payload),
    onSuccess: () => {
      setBody('');
      setTemplateName(null);
      setWindowClosedDuringSend(false);
      void queryClient.invalidateQueries({ queryKey: ['conversations', conversation.id, 'messages'] });
      void queryClient.invalidateQueries({ queryKey: ['conversations'], exact: false });
    },
    onError: (error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setWindowClosedDuringSend(true);
        void queryClient.invalidateQueries({ queryKey: ['conversations', conversation.id] });
      }
    },
  });

  function handleSendText() {
    const trimmed = body.trim();
    if (!trimmed || isPending) return;
    sendMessage({ body: trimmed });
  }

  function handleSendTemplate() {
    if (!templateName || isPending) return;
    const template = templates.find((tpl) => tpl.name === templateName);
    sendMessage({ templateName, templateLanguage: template?.language });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  }

  if (showTemplates) {
    return (
      <div className="space-y-2 border-t p-3">
        <div className="bg-warning/10 border-warning/30 rounded-lg border p-2.5">
          <p className="text-warning text-sm font-medium">{t('windowClosedTitle')}</p>
          <p className="text-muted-foreground mt-0.5 text-2xs">
            {windowClosedDuringSend ? t('windowClosedDuringSend') : t('windowClosedExplanation')}
          </p>
        </div>

        {!canManageChannels ? (
          <p className="text-muted-foreground text-2xs">{t('templatesUnavailable')}</p>
        ) : (
          <div className="flex items-end gap-2">
            <CustomSelect
              options={templates.map((tpl) => ({ value: tpl.name, label: tpl.name }))}
              value={templateName}
              onChange={(value) => setTemplateName((value as string) ?? null)}
              placeholder={t('selectTemplate')}
              emptyText={isLoadingTemplates ? t('loadingMessages') : t('noTemplates')}
              className="flex-1"
            />
            <Button type="button" disabled={!templateName || isPending} onClick={handleSendTemplate} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              {t('sendTemplate')}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5 border-t p-3">
      {windowOpen && conversation.windowExpiresAt && isWhatsApp && (
        <p className="text-muted-foreground text-2xs">{formatWindowRemaining(conversation.windowExpiresAt)}</p>
      )}
      <div className="flex items-end gap-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('composerPlaceholder')}
          rows={2}
          className="flex-1"
        />
        <Button type="button" disabled={!body.trim() || isPending} onClick={handleSendText} className="gap-1.5">
          <Send className="h-3.5 w-3.5" />
          {t('send')}
        </Button>
      </div>
    </div>
  );
}
