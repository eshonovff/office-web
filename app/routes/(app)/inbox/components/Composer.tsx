import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Mic, Paperclip, Send, Square, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { channelsApi } from '~/api/channels';
import { conversationsApi } from '~/api/conversations';
import { CustomSelect } from '~/components/shared/CustomSelect';
import { Button } from '~/components/ui/button';
import { Progress } from '~/components/ui/progress';
import { Textarea } from '~/components/ui/textarea';
import { Permissions } from '~/config/permissions';
import { useCan } from '~/hooks/useCan';
import { formatWindowRemaining } from '~/lib/format';
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

export function Composer({ conversation }: ComposerProps) {
  const { t } = useTranslation('inbox');
  const { can } = useCan();
  const canManageChannels = can(Permissions.Channels.Manage);
  const queryClient = useQueryClient();

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
  // getUserMedia is async (the permission prompt alone can take a while) —
  // guards against a second tap starting a second recording/getUserMedia
  // call before `recording` has flipped true.
  const startingRecordingRef = useRef(false);
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
    if (startingRecordingRef.current || recording) return;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setRecordError(t('voiceUnsupported'));
      return;
    }

    startingRecordingRef.current = true;
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
    } finally {
      startingRecordingRef.current = false;
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
      <div className="space-y-2 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
    <div className="space-y-1.5 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {windowOpen && conversation.windowExpiresAt && isWhatsApp && (
        <p className="text-muted-foreground text-2xs">{formatWindowRemaining(conversation.windowExpiresAt)}</p>
      )}
      <div className="flex items-end gap-2">
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
        <Button type="button" variant="outline" size="icon" disabled={isPending || isUploading} onClick={() => fileInputRef.current?.click()}>
          <Paperclip className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={recording ? 'default' : 'outline'}
          size="icon"
          className="touch-manipulation"
          disabled={isPending || isUploading || isUploadingVoiceNote}
          onClick={() => (recording ? stopVoiceRecording(true) : startVoiceRecording())}>
          {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
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
      {(selectedFile || fileError) && (
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
      {(recording || recordError || isUploadingVoiceNote) && (
        <div className="bg-muted/50 flex items-center gap-2 rounded-lg border p-2">
          <Mic className="h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {recording ? t('recordingVoice', { duration: `${Math.floor(recordElapsed / 60)}:${String(recordElapsed % 60).padStart(2, '0')}` }) : t('voiceNote')}
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
  );
}
