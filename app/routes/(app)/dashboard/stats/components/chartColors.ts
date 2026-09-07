// The theme's 5-color chart palette (app/styles/global.css --chart-1..5, light/dark aware) —
// cycled by index for series that don't map naturally to a fixed semantic color (channels,
// operators, failure codes), unlike e.g. volumeByDay's inbound/outbound which get their own
// deliberate config entries.
export const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

export function chartColorAt(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]!;
}
