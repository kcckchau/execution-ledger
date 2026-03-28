import { TickMarkType, type Time } from 'lightweight-charts';

function chartTimeToMs(time: Time): number {
  if (typeof time === 'number') return time * 1000;
  if (typeof time === 'string') return new Date(time).getTime();
  const bd = time as { year: number; month: number; day: number };
  return Date.UTC(bd.year, bd.month - 1, bd.day);
}

/**
 * Formats time-scale ticks and crosshair labels in `timeZone` (e.g. America/New_York → Eastern,
 * UTC-4 during EDT) so the chart matches session JSON wall-clock, independent of the viewer's locale.
 */
export function createSessionTimezoneChartFormatters(timeZone: string) {
  const timeHm = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  });
  const monthDay = new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
  });
  const monthDayYear = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  function timeFormatter(time: Time): string {
    return timeHm.format(new Date(chartTimeToMs(time)));
  }

  function tickMarkFormatter(time: Time, tickMarkType: TickMarkType, locale: string): string | null {
    void locale;
    const ms = chartTimeToMs(time);
    const d = new Date(ms);
    switch (tickMarkType) {
      case TickMarkType.Year:
      case TickMarkType.Month:
        return monthDayYear.format(d);
      case TickMarkType.DayOfMonth:
        return monthDay.format(d);
      case TickMarkType.Time:
      case TickMarkType.TimeWithSeconds:
      default:
        return timeHm.format(d);
    }
  }

  return { timeFormatter, tickMarkFormatter };
}
