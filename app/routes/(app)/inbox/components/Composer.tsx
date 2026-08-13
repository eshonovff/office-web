import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Mic, Paperclip, Send, Square, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { channelsApi } from '~/api/channels';
import { conversationsApi } from '~/api/conversations';
import { CustomSelect } from '~/components/shared/CustomSelect';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { Progress } from '~/components/ui/progress';
import { Switch } from '~/components/ui/switch';
import { Textarea } from '~/components/ui/textarea';
import { isOwnerOrAdmin, Permissions } from '~/config/permissions';
import { useCan } from '~/hooks/useCan';
import { formatWindowRemaining } from '~/lib/format';
import { cn } from '~/lib/utils';
import { useAuthStore } from '~/store/useAuthStore';
import type { ConversationDetail } from '~/types/conversation';
import type { Message } from '~/types/message';

interface ComposerProps {
  conversation: ConversationDetail;
}

function isWindowOpen(windowExpiresAt: string | null): boolean {
  return !!windowExpiresAt && dayjs(windowExpiresAt).isAfter(dayjs());
}

const MEDIA_LIMITS = {
  image: 5 * 1024 * 1024,
  audioVideo: 16 * 1024 * 1024,
  document: 100 * 1024 * 1024,
} as const;

interface MessagesPage {
  items: Message[];
  totalCount: number;
  page: number;
  pageSize: number;
}

interface MessagesCache {
  pages: MessagesPage[];
  pageParams: unknown[];
}

function classifyFile(file: File) {
  if (file.type.startsWith('image/')) return { type: 'image', maxBytes: MEDIA_LIMITS.image };
  if (file.type.startsWith('audio/') || file.type.startsWith('video/')) return { type: 'audioVideo', maxBytes: MEDIA_LIMITS.audioVideo };
  return { type: 'document', maxBytes: MEDIA_LIMITS.document };
}

function formatLimit(bytes: number) {
  return `${bytes / (1024 * 1024)} MB`;
}

function appendPendingMessage(queryClient: ReturnType<typeof useQueryClient>, conversationId: string, message: Message) {
  queryClient.setQueryData<MessagesCache>(['conversations', conversationId, 'messages'], (old) => {
    if (!old) return old;
    const [first, ...rest] = old.pages;
    if (!first || first.items.some((item) => item.id === message.id)) return old;
    return { ...old, pages: [{ ...first, items: [message, ...first.items], totalCount: first.totalCount + 1 }, ...rest] };
  });
}

/**
 * Sending (text, media, voice note, notes) is gated to the assignee on the
 * backend — ConversationAssignmentPolicy.CanSend — so a non-assignee's POST
 * always 403s. Rather than let the composer look usable and fail on submit,
 * this mirrors that same rule client-side and swaps in a disabled state with
 * an explicit "who owns this" message and a takeover escape hatch.
 */
function ReadOnlyComposer({ conversation }: ComposerProps) {
  const { t } = useTranslation('inbox');
  const queryClient = useQueryClient();

  const { mutate: takeover, isPending } = useMutation({
    mutationFn: () => conversationsApi.takeover(conversation.id),
    onSuccess: (updated) => {
      queryClient.setQueryData(['conversations', updated.id], updated);
      void queryClient.invalidateQueries({ queryKey: ['conversations'], exact: false });
      toast.success(t('takeoverSuccess'));
    },
    onError: () => toast.error(t('takeoverFailed')),
  });

  return (
    <div className="border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="bg-muted/50 flex items-center justify-between gap-3 rounded-lg border p-2.5">
        <div className="min-w-0">
          <p className="text-sm font-medium">{t('readOnlyTitle')}</p>
          <p className="text-muted-foreground mt-0.5 text-2xs">
            {t('readOnlyOwnedBy', { name: conversation.assignedToName })}
          </p>
        </div>
        <Button type="button" size="sm" disabled={isPending} onClick={() => takeover()} className="shrink-0">
          {t('takeOver')}
        </Button>
      </div>
    </div>
  );
}

export function Composer({ conversation }: ComposerProps) {
  const { t } = useTranslation('inbox');
  const { can } = useCan();
  const canManageChannels = can(Permissions.Channels.Manage);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const roles = useAuthStore((s) => s.roles);
  const queryClient = useQueryClient();

  // Same formula as the backend's ConversationAssignmentPolicy.CanSend.
  const canSend = isOwnerOrAdmin(roles) || !conversation.assignedTo || conversation.assignedTo === currentUserId;

  const [body, setBody] = useState('');
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordElapsed, setRecordElapsed] = useState(0);
  const [recordError, setRecordError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const shouldSendRecordingRef = useRef(false);
  // Flips true only on a 409 mid-send — the render-time `windowOpen` check
  // already covers the common case (window already closed before typing).
  const [windowClosedDuringSend, setWindowClosedDuringSend] = useState(false);
  // A note never reaches the customer, so it doesn't care about the 24h
  // window — toggling it on bypasses the template-required branch entirely.
  const [isNoteMode, setIsNoteMode] = useState(false);

  // Switching conversations keeps this same component instance mounted
  // (MessageThread/Composer aren't re-keyed per conversationId) — reset so a
  // note left armed on one chat can't silently apply to the next one opened.
  useEffect(() => {
    setIsNoteMode(false);
  }, [conversation.id]);

  const windowOpen = isWindowOpen(conversation.windowExpiresAt);
  const isWhatsApp = conversation.channelType === 'WhatsApp';
  const showTemplates = !isNoteMode && (!windowOpen || windowClosedDuringSend) && isWhatsApp;

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
      // Someone else took over between this render and the request landing —
      // refetch so `canSend` recomputes false and the read-only view takes over.
      if (status === 403) {
        void queryClient.invalidateQueries({ queryKey: ['conversations', conversation.id] });
      }
    },
  });

  const { mutate: uploadMedia, isPending: isUploading } = useMutation({
    mutationFn: (file: File) =>
      conversationsApi.uploadMedia(conversation.id, file, (event) => {
        if (!event.total) return;
        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      }),
    onSuccess: (message) => {
      appendPendingMessage(queryClient, conversation.id, message);
      clearSelectedFile();
      void queryClient.invalidateQueries({ queryKey: ['conversations'], exact: false });
    },
    onError: () => {
      setUploadProgress(0);
      setFileError(t('uploadFailed'));
    },
  });

  const { mutate: uploadVoiceNote, isPending: isUploadingVoiceNote } = useMutation({
    mutationFn: (file: File) =>
      conversationsApi.uploadVoiceNote(conversation.id, file, (event) => {
        if (!event.total) return;
        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      }),
    onSuccess: (message) => {
      appendPendingMessage(queryClient, conversation.id, message);
      setUploadProgress(0);
      void queryClient.invalidateQueries({ queryKey: ['conversations'], exact: false });
    },
    onError: () => {
      setUploadProgress(0);
      setRecordError(t('voiceUploadFailed'));
    },
  });

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      stopRecordingTimer();
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function stopRecordingTimer() {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  function clearSelectedFile() {
    setSelectedFile(null);
    setFileError(null);
    setUploadProgress(0);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    clearSelectedFile();
    if (!file) return;

    const { maxBytes } = classifyFile(file);
    if (file.size > maxBytes) {
      setFileError(t('fileTooLarge', { max: formatLimit(maxBytes) }));
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/')) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  function handleUploadMedia() {
    if (!selectedFile || isUploading) return;
    setUploadProgress(0);
    uploadMedia(selectedFile);
  }

  async function startVoiceRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setRecordError(t('voiceUnsupported'));
      return;
    }

    try {
      setRecordError(null);
      setRecordElapsed(0);
      recordingChunksRef.current = [];
      shouldSendRecordingRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stopRecordingTimer();
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        setRecording(false);

        if (!shouldSendRecordingRef.current) return;
        const blob = new Blob(recordingChunksRef.current, { type: mimeType });
        if (blob.size > MEDIA_LIMITS.audioVideo) {
          setRecordError(t('fileTooLarge', { max: formatLimit(MEDIA_LIMITS.audioVideo) }));
          return;
        }
        const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: mimeType });
        setUploadProgress(0);
        uploadVoiceNote(file);
      };

      recorder.start();
      setRecording(true);
      recordingTimerRef.current = window.setInterval(() => setRecordElapsed((value) => value + 1), 1000);
    } catch {
      setRecordError(t('voicePermissionDenied'));
    }
  }

  function stopVoiceRecording(send: boolean) {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    shouldSendRecordingRef.current = send;
    recorder.stop();
  }

  function handleSendText() {
    const trimmed = body.trim();
    if (!trimmed || isPending) return;
    sendMessage({ body: trimmed, isInternalNote: isNoteMode });
  }

  // Attach/voice-record are hidden in note mode (notes are text-only on the
  // backend) — clear anything already queued so switching modes can't leave
  // a real attachment silently waiting behind the note toggle.
  function toggleNoteMode(next: boolean) {
    setIsNoteMode(next);
    if (next) clearSelectedFile();
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

  // Checked after every hook above (rules-of-hooks) but before any markup —
  // a stale `canSend` (e.g. someone else just took over) still gets caught
  // server-side by the same 403, handled in sendMessage's onError below.
  if (!canSend) {
    return <ReadOnlyComposer conversation={conversation} />;
  }

  return (
    <div className="border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-2 pb-1.5">
        <Switch
          id={`note-toggle-${conversation.id}`}
          size="sm"
          checked={isNoteMode}
          onCheckedChange={toggleNoteMode}
          disabled={isPending}
        />
        <Label htmlFor={`note-toggle-${conversation.id}`} className="text-muted-foreground cursor-pointer text-2xs font-normal">
          {t('internalNoteToggleLabel')}
        </Label>
      </div>

      {showTemplates ? (
        <div className="space-y-2">
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
      ) : (
        <div className="space-y-1.5">
          {!isNoteMode && windowOpen && conversation.windowExpiresAt && isWhatsApp && (
            <p className="text-muted-foreground text-2xs">{formatWindowRemaining(conversation.windowExpiresAt)}</p>
          )}
          <div className="flex items-end gap-2">
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
            {!isNoteMode && (
              <>
                <Button type="button" variant="outline" size="icon" disabled={isPending || isUploading} onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant={recording ? 'default' : 'outline'}
                  size="icon"
                  disabled={isPending || isUploading || isUploadingVoiceNote}
                  onClick={() => (recording ? stopVoiceRecording(true) : startVoiceRecording())}>
                  {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </>
            )}
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isNoteMode ? t('internalNotePlaceholder') : t('composerPlaceholder')}
              rows={2}
              className={cn('flex-1', isNoteMode && 'bg-warning/10 border-warning/30')}
            />
            <Button
              type="button"
              disabled={!body.trim() || isPending}
              onClick={handleSendText}
              aria-label={isNoteMode ? t('sendNote') : t('send')}
              className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              {isNoteMode ? t('sendNote') : t('send')}
            </Button>
          </div>
          {!isNoteMode && (selectedFile || fileError) && (
            <div className="bg-muted/50 space-y-2 rounded-lg border p-2">
              <div className="flex items-start gap-2">
                {previewUrl && selectedFile?.type.startsWith('image/') && (
                  <img src={previewUrl} alt={selectedFile.name} className="h-14 w-14 rounded-md object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  {selectedFile && <p className="truncate text-sm font-medium">{selectedFile.name}</p>}
                  {fileError && <p className="text-destructive text-2xs">{fileError}</p>}
                  {isUploading && <Progress value={uploadProgress} className="mt-2 h-1.5" />}
                </div>
                <Button type="button" variant="ghost" size="icon-sm" disabled={isUploading} onClick={clearSelectedFile}>
                  <X className="h-3.5 w-3.5" />
                </Button>
                {selectedFile && (
                  <Button type="button" size="sm" disabled={isUploading} onClick={handleUploadMedia} className="gap-1.5">
                    <Send className="h-3.5 w-3.5" />
                    {isUploading ? t('uploading') : t('sendFile')}
                  </Button>
                )}
              </div>
            </div>
          )}
          {!isNoteMode && (recording || recordError || isUploadingVoiceNote) && (
            <div className="bg-muted/50 flex items-center gap-2 rounded-lg border p-2">
              <Mic className="h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {recording
                    ? t('recordingVoice', { duration: `${Math.floor(recordElapsed / 60)}:${String(recordElapsed % 60).padStart(2, '0')}` })
                    : t('voiceNote')}
                </p>
                {recordError && <p className="text-destructive text-2xs">{recordError}</p>}
                {isUploadingVoiceNote && <Progress value={uploadProgress} className="mt-2 h-1.5" />}
              </div>
              {recording && (
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => stopVoiceRecording(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
