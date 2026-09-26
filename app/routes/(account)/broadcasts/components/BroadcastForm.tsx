import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { ImagePlus, Link2, Loader2, UserRound, X } from 'lucide-react';
import { type ReactNode, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { customerBroadcastKeys, customerBroadcastsApi } from '~/api/customerBroadcasts';
import { customerContactKeys, customerContactsApi } from '~/api/customerContacts';
import { customerFlowsApi } from '~/api/customerFlows';
import { ConfirmDialog } from '~/components/shared/ConfirmDialog';
import { CustomSelect } from '~/components/shared/CustomSelect';
import { DateInputField } from '~/components/shared/DateInputField';
import { Modal } from '~/components/shared/Modal';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { formatDate } from '~/lib/format';
import { cn } from '~/lib/utils';
import type { CustomerChannel } from '~/types/customerChannels';
import type { CreateBroadcastRequest } from '~/types/customerBroadcasts';

// The server's limits (Office.Api/Features/CustomerBroadcasts/Validators.cs) — checked here only
// to say so early; the server checks them again.
const LIMITS = { name: 200, text: 1000, buttonTitle: 20, buttonUrl: 500, imageBytes: 8 * 1024 * 1024, aheadDays: 30 };
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const FIRST_NAME = '{{firstName}}';

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

interface BroadcastFormProps {
  /** The мизоҷ's Instagram accounts. */
  channels: CustomerChannel[];
  onClose: () => void;
  onCreated: (id: string) => void;
}

/** A small either/or switch — two buttons, one chosen. */
function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="bg-muted inline-flex rounded-lg p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-md px-3 py-1 text-sm transition-colors',
            value === option.value
              ? 'bg-background font-medium shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Problem({ show, children }: { show: boolean; children: ReactNode }) {
  return show ? <p className="text-destructive text-xs">{children}</p> : null;
}

// A new broadcast, top to bottom: name → to whom (and how many that reaches now) → what → when →
// confirm. Everything goes to /api/public, which checks again that the account, the tags' people
// and the automation are this мизоҷ's own.
export function BroadcastForm({ channels, onClose, onCreated }: BroadcastFormProps) {
  const { t } = useTranslation('customerAuth');
  const queryClient = useQueryClient();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [channelId, setChannelId] = useState(channels[0]?.id ?? '');
  const [name, setName] = useState('');
  const [audience, setAudience] = useState<'all' | 'tags'>('all');
  const [tags, setTags] = useState<string[]>([]);
  const [kind, setKind] = useState<'message' | 'flow'>('message');
  const [text, setText] = useState('');
  const [image, setImage] = useState<{ mediaId: string; preview: string | null } | null>(null);
  const [withButton, setWithButton] = useState(false);
  const [buttonTitle, setButtonTitle] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [flowId, setFlowId] = useState<string | null>(null);
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState('10:00');
  const [tried, setTried] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const channel = channels.find((c) => c.id === channelId);
  const chosenTags = audience === 'tags' ? tags : [];

  const { data: tagCounts = [] } = useQuery({
    queryKey: customerContactKeys.tags(channelId),
    queryFn: () => customerContactsApi.tags(channelId),
    enabled: !!channelId,
  });
  const { data: flows = [] } = useQuery({
    queryKey: ['channels', channelId, 'flows'],
    queryFn: () => customerFlowsApi.list(channelId),
    enabled: !!channelId && kind === 'flow',
  });
  const activeFlows = flows.filter((f) => f.isActive);
  const reachEnabled = !!channelId && (audience === 'all' || tags.length > 0);
  const reach = useQuery({
    queryKey: customerBroadcastKeys.audience(channelId, chosenTags),
    queryFn: () => customerBroadcastsApi.audience(channelId, chosenTags),
    enabled: reachEnabled,
  });
  // The number for exactly this choice — not the previous one's, kept on screen while this loads.
  const reachReady = reachEnabled && reach.isSuccess && !reach.isPlaceholderData;
  const reachable = reachReady ? (reach.data?.reachable ?? 0) : 0;

  const upload = useMutation({
    mutationFn: (file: File) => customerFlowsApi.uploadMedia(channelId, file),
    onSuccess: (result) => {
      if (result.blockType !== 'image') {
        toast.error(t('broadcasts.form.imageOnly'));
        return;
      }
      setImage({ mediaId: result.mediaId, preview: result.previewDataUri ?? null });
    },
  });

  const scheduledAt = when === 'later' && date && time ? dayjs(`${date}T${time}`) : null;

  // Every problem at once; shown after the first try to send.
  const problems = {
    channel: !channel || !channel.isActive || channel.requiresReconnect,
    name: !name.trim() || name.length > LIMITS.name,
    tags: audience === 'tags' && tags.length === 0,
    content: kind === 'message' ? !text.trim() && !image : !flowId,
    text: kind === 'message' && text.length > LIMITS.text,
    button:
      kind === 'message' &&
      withButton &&
      (!buttonTitle.trim() ||
        buttonTitle.length > LIMITS.buttonTitle ||
        !isHttpUrl(buttonUrl.trim()) ||
        buttonUrl.length > LIMITS.buttonUrl ||
        !text.trim()),
    when:
      when === 'later' &&
      (!scheduledAt || !scheduledAt.isAfter(dayjs()) || scheduledAt.isAfter(dayjs().add(LIMITS.aheadDays, 'day'))),
    nobody: when === 'now' && reachReady && reachable === 0,
  };
  const hasProblem = Object.values(problems).some(Boolean);

  const payload = (): CreateBroadcastRequest => {
    const message = kind === 'message';
    const button = message && withButton;
    return {
      channelId,
      name: name.trim(),
      tags: chosenTags,
      text: message && text.trim() ? text : null,
      mediaId: message ? (image?.mediaId ?? null) : null,
      mediaPreviewDataUri: message ? (image?.preview ?? null) : null,
      buttonTitle: button ? buttonTitle.trim() : null,
      buttonUrl: button ? buttonUrl.trim() : null,
      flowId: message ? null : flowId,
      scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
    };
  };

  const create = useMutation({
    mutationFn: () => customerBroadcastsApi.create(payload()),
    onSuccess: (created) => {
      toast.success(t(when === 'now' ? 'broadcasts.done.createdNow' : 'broadcasts.done.createdLater'));
      void queryClient.invalidateQueries({ queryKey: customerBroadcastKeys.all });
      onCreated(created.id);
    },
    onSettled: () => setConfirming(false),
  });

  const changeChannel = (id: string) => {
    // Tags, the automation and an uploaded image all belong to one account.
    setChannelId(id);
    setTags([]);
    setFlowId(null);
    setImage(null);
  };

  const insertFirstName = () => {
    const el = textRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    setText((text.slice(0, start) + FIRST_NAME + text.slice(end)).slice(0, LIMITS.text));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + FIRST_NAME.length, start + FIRST_NAME.length);
    });
  };

  const pickImage = (file: File | undefined) => {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      toast.error(t('broadcasts.form.imageOnly'));
      return;
    }
    if (file.size > LIMITS.imageBytes) {
      toast.error(t('broadcasts.form.imageTooBig'));
      return;
    }
    upload.mutate(file);
  };

  const submit = () => {
    setTried(true);
    if (!hasProblem) setConfirming(true);
  };

  const footer = (
    <>
      <Button type="button" variant="outline" onClick={onClose}>
        {t('broadcasts.form.cancel')}
      </Button>
      <Button
        type="button"
        onClick={submit}
        disabled={create.isPending || upload.isPending || (when === 'now' && reachEnabled && !reachReady)}>
        {t(when === 'now' ? 'broadcasts.form.sendNow' : 'broadcasts.form.schedule')}
      </Button>
    </>
  );

  return (
    <Modal open onClose={onClose} title={t('broadcasts.new')} footer={footer} className="sm:max-w-xl">
      <div className="space-y-6">
        <Step title={t('broadcasts.form.name')}>
          <Input
            aria-label={t('broadcasts.form.name')}
            placeholder={t('broadcasts.form.namePlaceholder')}
            value={name}
            maxLength={LIMITS.name}
            onChange={(e) => setName(e.target.value)}
          />
          <Problem show={tried && problems.name}>{t('broadcasts.form.problems.name')}</Problem>
        </Step>

        {channels.length > 1 && (
          <Step title={t('broadcasts.form.account')}>
            <CustomSelect
              isClearable={false}
              placeholder={t('broadcasts.form.account')}
              options={channels.map((c) => ({ value: c.id, label: c.name }))}
              value={channelId}
              onChange={(v) => v && changeChannel(String(v))}
            />
          </Step>
        )}
        {channel && (!channel.isActive || channel.requiresReconnect) && (
          <p className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-xs">
            {t('broadcasts.form.problems.channel')}{' '}
            <Link to="/account/settings" className="underline">
              {t('contacts.connectInstagram')}
            </Link>
          </p>
        )}

        <Step title={t('broadcasts.form.to')}>
          <Choice
            label={t('broadcasts.form.to')}
            value={audience}
            onChange={setAudience}
            options={[
              { value: 'all', label: t('broadcasts.form.everyone') },
              { value: 'tags', label: t('broadcasts.form.byTag') },
            ]}
          />
          {audience === 'tags' && (
            <CustomSelect
              isMulti
              placeholder={t('broadcasts.form.pickTags')}
              options={tagCounts.map((x) => ({ value: x.tag, label: `${x.tag} (${x.count})` }))}
              value={tags}
              onChange={(v) => setTags(v.map(String))}
            />
          )}
          <Problem show={tried && problems.tags}>{t('broadcasts.form.problems.tags')}</Problem>
          {reachEnabled && reach.data && (
            <p
              className={cn('bg-primary/5 rounded-lg px-3 py-2 text-sm', !reachReady && 'opacity-60')}
              aria-live="polite">
              {t('broadcasts.form.reach', { count: reach.data.reachable, total: reach.data.audience })}
              <span className="text-muted-foreground block text-xs">{t('broadcasts.form.reachHint')}</span>
            </p>
          )}
          <Problem show={tried && problems.nobody}>{t('broadcasts.form.problems.nobody')}</Problem>
        </Step>

        <Step title={t('broadcasts.form.what')}>
          <Choice
            label={t('broadcasts.form.what')}
            value={kind}
            onChange={setKind}
            options={[
              { value: 'message', label: t('broadcasts.form.message') },
              { value: 'flow', label: t('broadcasts.form.flow') },
            ]}
          />

          {kind === 'message' ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Textarea
                  ref={textRef}
                  aria-label={t('broadcasts.form.text')}
                  placeholder={t('broadcasts.form.textPlaceholder')}
                  value={text}
                  maxLength={LIMITS.text}
                  rows={4}
                  onChange={(e) => setText(e.target.value)}
                />
                <div className="flex items-center justify-between gap-2">
                  <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2" onClick={insertFirstName}>
                    <UserRound className="size-3.5" />
                    {t('broadcasts.form.insertName')}
                  </Button>
                  <span className="text-muted-foreground text-xs">
                    {text.length}/{LIMITS.text}
                  </span>
                </div>
                {text.includes(FIRST_NAME) && (
                  <p className="text-muted-foreground text-xs">
                    {t('broadcasts.form.nameHint', { token: FIRST_NAME })}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept={IMAGE_TYPES.join(',')}
                  aria-label={t('broadcasts.form.image')}
                  className="hidden"
                  onChange={(e) => {
                    pickImage(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                {image ? (
                  <div className="relative">
                    {image.preview ? (
                      <img
                        src={image.preview}
                        alt={t('broadcasts.form.image')}
                        className="size-16 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="bg-muted flex size-16 items-center justify-center rounded-lg">
                        <ImagePlus className="size-5" />
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-xs"
                      aria-label={t('broadcasts.form.removeImage')}
                      className="absolute -top-2 -right-2 rounded-full"
                      onClick={() => setImage(null)}>
                      <X className="size-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={upload.isPending || !channelId}
                    onClick={() => fileRef.current?.click()}>
                    {upload.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <ImagePlus className="size-3.5" />
                    )}
                    {t('broadcasts.form.addImage')}
                  </Button>
                )}
                {!withButton && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setWithButton(true)}>
                    <Link2 className="size-3.5" />
                    {t('broadcasts.form.addButton')}
                  </Button>
                )}
              </div>

              {withButton && (
                <div className="bg-muted/40 space-y-2 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{t('broadcasts.form.button')}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t('broadcasts.form.removeButton')}
                      onClick={() => {
                        setWithButton(false);
                        setButtonTitle('');
                        setButtonUrl('');
                      }}>
                      <X className="size-3" />
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
                    <Input
                      aria-label={t('broadcasts.form.buttonTitle')}
                      placeholder={t('broadcasts.form.buttonTitle')}
                      value={buttonTitle}
                      maxLength={LIMITS.buttonTitle}
                      onChange={(e) => setButtonTitle(e.target.value)}
                    />
                    <Input
                      aria-label={t('broadcasts.form.buttonUrl')}
                      placeholder="https://"
                      inputMode="url"
                      value={buttonUrl}
                      maxLength={LIMITS.buttonUrl}
                      onChange={(e) => setButtonUrl(e.target.value)}
                    />
                  </div>
                  <Problem show={tried && problems.button}>{t('broadcasts.form.problems.button')}</Problem>
                </div>
              )}
            </div>
          ) : activeFlows.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t('broadcasts.form.noFlows')}{' '}
              <Link to="/account/automations" className="text-primary hover:underline">
                {t('sidebar.automations')}
              </Link>
            </p>
          ) : (
            <CustomSelect
              placeholder={t('broadcasts.form.pickFlow')}
              options={activeFlows.map((f) => ({ value: f.id, label: f.name }))}
              value={flowId}
              onChange={(v) => setFlowId(v ? String(v) : null)}
            />
          )}
          <Problem show={tried && problems.content}>
            {t(kind === 'message' ? 'broadcasts.form.problems.message' : 'broadcasts.form.problems.flow')}
          </Problem>
        </Step>

        <Step title={t('broadcasts.form.when')}>
          <Choice
            label={t('broadcasts.form.when')}
            value={when}
            onChange={setWhen}
            options={[
              { value: 'now', label: t('broadcasts.form.now') },
              { value: 'later', label: t('broadcasts.form.later') },
            ]}
          />
          {when === 'later' && (
            <div className="flex flex-wrap gap-2">
              <DateInputField
                className="w-44"
                value={date}
                onChange={setDate}
                minDate={dayjs().startOf('day').toDate()}
                maxDate={dayjs().add(LIMITS.aheadDays, 'day').toDate()}
                placeholder={t('broadcasts.form.date')}
              />
              <Input
                type="time"
                aria-label={t('broadcasts.form.time')}
                className="w-28"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          )}
          <Problem show={tried && problems.when}>{t('broadcasts.form.problems.when')}</Problem>
        </Step>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        type="info"
        title={t('broadcasts.confirm.send.title')}
        description={
          scheduledAt
            ? t('broadcasts.confirm.send.later', { date: formatDate(scheduledAt.toDate(), true), count: reachable })
            : t('broadcasts.confirm.send.now', { count: reachable })
        }
        confirmText={t(when === 'now' ? 'broadcasts.form.sendNow' : 'broadcasts.form.schedule')}
        isLoading={create.isPending}
        onConfirm={() => create.mutate()}
      />
    </Modal>
  );
}
