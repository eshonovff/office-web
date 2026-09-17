import { useMutation } from '@tanstack/react-query';
import { Braces, Mic, Paperclip, Plus, Square, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { flowsApi } from '~/api/flows';
import { CustomSelect } from '~/components/shared/CustomSelect';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Progress } from '~/components/ui/progress';
import { Textarea } from '~/components/ui/textarea';
import type { MessageBlock, MessageButton, MessageNodeConfig } from '~/types/flow';

// Built-in-ҳои ҳамешагӣ (FlowEngine.BuildContactFields) — на аз рӯи flow муайян, ҳамеша дастрасанд.
const BUILT_IN_VARIABLES = ['firstName', 'lastName', 'fullName', 'username', 'clientId', 'chatLink'] as const;

// Messenger Platform (Facebook/Instagram) — ҳудуди ЯГОНА барои ҳар навъи attachment, на
// алоҳида барои расм/видео/овоз (ниг. MediaUploadValidator.MessengerAttachmentMaxBytes дар
// backend — ҳамин рақам, чунки Flow ҳамеша канали Instagram аст, санҷиши дуюм дар сервер аст).
const MAX_MEDIA_BYTES = 25 * 1024 * 1024;

interface MessageNodePanelProps {
  config: MessageNodeConfig;
  channelId: string;
  customVariableKeys: string[];
  onChange: (config: MessageNodeConfig) => void;
}

// Ҳар нод якто блоки матн ва якто блоки media (расм/видео/овоз/файл) дастгирӣ мекунад — на
// зиёда: Send API-и Meta як message object мегирад (ниг. FlowEngine.ExecuteMessageNodeAsync).
// Барои дуюм media, нодаи дигари паём илова кунед.
export function MessageNodePanel({ config, channelId, customVariableKeys, onChange }: MessageNodePanelProps) {
  const { t } = useTranslation('flows');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordElapsed, setRecordElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<number | null>(null);

  // Ҳимояи дифоъӣ: config-и маълумоти кӯҳна/вайроншуда метавонад ин майдонҳоро надошта бошад.
  const buttons = config.buttons ?? [];
  const blocks = config.blocks ?? [];
  const text = blocks.find((b) => b.type === 'text')?.text ?? '';
  const mediaBlock = blocks.find((b) => b.type !== 'text') ?? null;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (recordingTimerRef.current !== null) window.clearInterval(recordingTimerRef.current);
    };
  }, [previewUrl]);

  const { mutate: uploadMedia, isPending: isUploading } = useMutation({
    mutationFn: (file: File) =>
      flowsApi.uploadMedia(channelId, file, (event) => {
        if (!event.total) return;
        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      }),
    onSuccess: (result) => {
      setUploadProgress(0);
      setMediaBlockValue({ type: result.blockType, text: null, mediaId: result.mediaId });
    },
    onError: () => {
      setUploadProgress(0);
      setMediaError(t('nodePanels.message.uploadFailed'));
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    },
  });

  function setText(value: string) {
    const next: MessageBlock[] = [{ type: 'text', text: value, mediaId: null }];
    if (mediaBlock) next.push(mediaBlock);
    onChange({ ...config, blocks: next });
  }

  function setMediaBlockValue(block: MessageBlock | null) {
    const next: MessageBlock[] = [];
    if (text) next.push({ type: 'text', text, mediaId: null });
    if (block) next.push(block);
    onChange({ ...config, blocks: next });
  }

  function removeMedia() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setMediaError(null);
    setMediaBlockValue(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    setMediaError(null);
    if (file.size > MAX_MEDIA_BYTES) {
      setMediaError(t('nodePanels.message.fileTooLarge', { max: `${MAX_MEDIA_BYTES / (1024 * 1024)} MB` }));
      event.target.value = '';
      return;
    }

    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      setPreviewUrl(URL.createObjectURL(file));
    }
    uploadMedia(file);
  }

  function stopRecordingTimer() {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  async function startRecording() {
    if (recording || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      if (typeof MediaRecorder === 'undefined') setMediaError(t('nodePanels.message.voiceUnsupported'));
      return;
    }

    try {
      setMediaError(null);
      setRecordElapsed(0);
      recordingChunksRef.current = [];
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

        const blob = new Blob(recordingChunksRef.current, { type: mimeType });
        if (blob.size === 0) return;
        if (blob.size > MAX_MEDIA_BYTES) {
          setMediaError(t('nodePanels.message.fileTooLarge', { max: `${MAX_MEDIA_BYTES / (1024 * 1024)} MB` }));
          return;
        }
        uploadMedia(new File([blob], `voice-${Date.now()}.webm`, { type: mimeType }));
      };

      recorder.start();
      setRecording(true);
      recordingTimerRef.current = window.setInterval(() => setRecordElapsed((v) => v + 1), 1000);
    } catch {
      setMediaError(t('nodePanels.message.voicePermissionDenied'));
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    recorder.stop();
  }

  // Тағйирёбандаро дар нуқтаи курсор мегузорад (на танҳо дар охир) — курсор баъд аз он
  // рост баъди {{key}} мемонад, то корбар фавран идома дода тавонад.
  function insertVariable(key: string) {
    const el = textareaRef.current;
    const token = `{{${key}}}`;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + token + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  function updateButton(index: number, patch: Partial<MessageButton>) {
    onChange({ ...config, buttons: buttons.map((b, i) => (i === index ? { ...b, ...patch } : b)) });
  }

  function addButton() {
    if (buttons.length >= 3) return; // Messenger button template max
    onChange({ ...config, buttons: [...buttons, { title: '', action: 'next', url: null, allowRepeat: false }] });
  }

  function removeButton(index: number) {
    onChange({ ...config, buttons: buttons.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t('nodePanels.message.textLabel')}</Label>
        <Textarea
          ref={textareaRef}
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('nodePanels.message.textPlaceholder')}
        />
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" className="gap-1.5" />}>
            <Braces className="h-3.5 w-3.5" />
            {t('nodePanels.message.insertVariable')}
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t('nodePanels.message.builtInVariables')}</DropdownMenuLabel>
              {BUILT_IN_VARIABLES.map((key) => (
                <DropdownMenuItem key={key} onClick={() => insertVariable(key)}>
                  {`{{${key}}}`}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            {customVariableKeys.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{t('nodePanels.message.customVariables')}</DropdownMenuLabel>
                  {customVariableKeys.map((key) => (
                    <DropdownMenuItem key={key} onClick={() => insertVariable(key)}>
                      {`{{${key}}}`}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-1.5">
        <Label>{t('nodePanels.message.mediaLabel')}</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*"
          className="hidden"
          onChange={handleFileSelected}
        />
        {mediaBlock ? (
          <div className="bg-muted/50 flex items-center gap-2 rounded-lg border p-2">
            {previewUrl && mediaBlock.type === 'image' && (
              <img src={previewUrl} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
            )}
            {previewUrl && mediaBlock.type === 'video' && (
              <video src={previewUrl} muted className="h-12 w-12 shrink-0 rounded object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t(`nodePanels.message.mediaType.${mediaBlock.type}`)}</p>
              {!previewUrl && <p className="text-muted-foreground text-2xs">{t('nodePanels.message.mediaAttachedNoPreview')}</p>}
            </div>
            <Button type="button" variant="ghost" size="icon-sm" onClick={removeMedia}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : buttons.length > 0 ? (
          <p className="text-muted-foreground text-2xs">{t('nodePanels.message.mediaDisabledWithButtons')}</p>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="h-3.5 w-3.5" />
              {t('nodePanels.message.attachFile')}
            </Button>
            <Button
              type="button"
              variant={recording ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5"
              disabled={isUploading}
              onClick={() => (recording ? stopRecording() : startRecording())}>
              {recording ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              {recording
                ? `${Math.floor(recordElapsed / 60)}:${String(recordElapsed % 60).padStart(2, '0')}`
                : t('nodePanels.message.recordVoice')}
            </Button>
          </div>
        )}
        {isUploading && <Progress value={uploadProgress} className="h-1.5" />}
        {mediaError && <p className="text-destructive text-2xs">{mediaError}</p>}
      </div>

      <div className="space-y-2">
        <Label>{t('nodePanels.message.buttonsLabel')}</Label>
        {buttons.map((button, index) => (
          <div key={index} className="border-border space-y-2 rounded-lg border p-2.5">
            <div className="flex items-center gap-2">
              <Input
                className="flex-1"
                placeholder={t('nodePanels.message.buttonTitlePlaceholder')}
                maxLength={30}
                value={button.title}
                onChange={(e) => updateButton(index, { title: e.target.value })}
              />
              <Button variant="ghost" size="icon" onClick={() => removeButton(index)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <CustomSelect
              options={[
                { value: 'next', label: t('nodePanels.message.buttonAction.next') },
                { value: 'url', label: t('nodePanels.message.buttonAction.url') },
              ]}
              value={button.action}
              onChange={(v) => updateButton(index, { action: (v as 'next' | 'url') ?? 'next' })}
            />
            {button.action === 'url' && (
              <Input
                placeholder="https://..."
                value={button.url ?? ''}
                onChange={(e) => updateButton(index, { url: e.target.value })}
              />
            )}
            <label className="text-2xs flex w-fit items-center gap-2">
              <Checkbox
                checked={button.allowRepeat}
                onCheckedChange={(checked) => updateButton(index, { allowRepeat: checked === true })}
              />
              {t('nodePanels.message.allowRepeat')}
            </label>
          </div>
        ))}
        {buttons.length < 3 && (
          <Button type="button" variant="outline" size="sm" className="w-full gap-1.5" onClick={addButton}>
            <Plus className="h-3.5 w-3.5" />
            {t('nodePanels.message.addButton')}
          </Button>
        )}
      </div>
    </div>
  );
}
