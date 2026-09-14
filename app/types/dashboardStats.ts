// Every chart shares this envelope — sufficient=false means "don't chart this, the shape would
// be noise, not signal" (see the dashboard/stats build report for exact per-chart thresholds).
export interface ChartResult<T> {
  data: T[];
  sampleSize: number;
  sufficient: boolean;
}

export interface DayVolumePoint {
  date: string;
  inbound: number;
  outbound: number;
}

export interface ChannelVolumePoint {
  channelId: string;
  channelName: string;
  channelType: string;
  activeConversations: number;
}

export interface OperatorLoadPoint {
  userId: string;
  userName: string;
  openConversations: number;
}

// dayOfWeek: .NET DayOfWeek encoding — 0=Sunday..6=Saturday, NOT ISO (Monday=1).
export interface HeatmapPoint {
  dayOfWeek: number;
  hour: number;
  count: number;
}

export interface ResponseTimeBucket {
  bucket: string;
  count: number;
}

export interface MessageStatusPoint {
  status: string;
  count: number;
}

// No label field on purpose — the backend intentionally only sends the raw code, the frontend
// translates it (see ../routes/(app)/dashboard/failureCode.ts). Shared with the Overview tab's
// failedMessages card, which used to expect a ready-made label the backend no longer sends.
export interface FailedMessageGroup {
  failureCode: string | null;
  count: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
}

export interface DashboardStatsResponse {
  volumeByDay: ChartResult<DayVolumePoint>;
  byChannel: ChartResult<ChannelVolumePoint>;
  operatorLoad: ChartResult<OperatorLoadPoint>;
  hourlyHeatmap: ChartResult<HeatmapPoint>;
  // The odd one out — carries `unanswered` alongside the usual envelope fields.
  responseTimeBuckets: ChartResult<ResponseTimeBucket> & { unanswered: number };
  messageStatus: ChartResult<MessageStatusPoint>;
  failureBreakdown: ChartResult<FailedMessageGroup>;
  funnel: ChartResult<FunnelStage>;
}

export const STATS_DAYS_OPTIONS = [7, 14, 30, 90] as const;
export type StatsDays = (typeof STATS_DAYS_OPTIONS)[number];
