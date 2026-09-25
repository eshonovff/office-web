import { MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useIsMobile } from '~/hooks/use-mobile';
import { ChatList } from './components/ChatList';
import { ChatThread } from './components/ChatThread';

// A мизоҷ's Instagram chats. Access is the (account) layout's мизоҷ session; every call below
// goes to /api/public, where the tenant filter shows only this мизоҷ's chats. Reading needs no
// plan (it is their own data) — replying does, and ChatComposer says so.
export default function ChatsPage() {
  const { t } = useTranslation('customerAuth');
  const isMobile = useIsMobile();
  // The open chat lives in the URL (?c=), so a reload or the back button keeps it.
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('c');

  const select = (id: string | null) => setSearchParams(id ? { c: id } : {}, { replace: !isMobile });

  if (isMobile) {
    return (
      <div className="bg-background -m-3 h-[calc(100%+1.5rem)]">
        {selectedId ? (
          <ChatThread conversationId={selectedId} onBack={() => select(null)} />
        ) : (
          <ChatList selectedId={null} onSelect={select} />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-xl border">
      <div className="w-80 shrink-0 border-r lg:w-96">
        <ChatList selectedId={selectedId} onSelect={select} />
      </div>
      <div className="min-w-0 flex-1">
        {selectedId ? (
          <ChatThread key={selectedId} conversationId={selectedId} />
        ) : (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm">
            <MessageSquare className="size-8" />
            {t('chats.pickOne')}
          </div>
        )}
      </div>
    </div>
  );
}
