import type {
  ListingOpenHouseEvent,
  ListingPropertyDetails
} from "@shared/types/models";
import { format, isValid, parse, parseISO } from "date-fns";

const ISO_DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})/;
const OPEN_HOUSE_DATE_FORMATS = [
  "yyyy-MM-dd",
  "yyyy-M-d",
  "M/d/yyyy",
  "MM/dd/yyyy",
  "MMM d, yyyy",
  "MMMM d, yyyy",
  "EEE, MMM d, yyyy",
  "EEEE, MMM d, yyyy",
  "EEE, MMM d",
  "EEEE, MMM d",
  "EEE MMM d",
  "EEEE MMM d",
  "MMM d",
  "MMMM d"
] as const;

type NormalizedOpenHouseEvent = {
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  parsedDate: Date | null;
  startMinutes: number | null;
  endMinutes: number | null;
};

export type ListingOpenHouseContext = {
  hasAnyEvent: boolean;
  hasSchedule: boolean;
  selectedEvent: {
    date: string | null;
    startTime: string | null;
    endTime: string | null;
    dateLabel: string;
    timeLabel: string;
    dateTimeLabel: string;
  } | null;
  openHouseDateTimeLabel: string;
  openHouseOverlayLabel: string;
  listingAddressLine: string;
};

function toOrdinal(day: number): string {
  const mod10 = day % 10;
  const mod100 = day % 100;
  if (mod10 === 1 && mod100 !== 11) return `${day}st`;
  if (mod10 === 2 && mod100 !== 12) return `${day}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${day}rd`;
  return `${day}th`;
}

function parseOpenHouseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  const normalizedIsoDate = trimmed.match(ISO_DATE_PREFIX)?.[1];
  if (normalizedIsoDate) {
    const parsedIsoPrefix = parse(normalizedIsoDate, "yyyy-MM-dd", new Date());
    if (isValid(parsedIsoPrefix)) {
      return parsedIsoPrefix;
    }
  }

  const parsedIso = parseISO(trimmed);
  if (isValid(parsedIso)) {
    return parsedIso;
  }

  for (const dateFormat of OPEN_HOUSE_DATE_FORMATS) {
    const parsedDate = parse(trimmed, dateFormat, new Date());
    if (isValid(parsedDate)) {
      return parsedDate;
    }
  }

  return null;
}

function parseTimeMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const time24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (time24) {
    const hour = Number(time24[1]);
    const minute = Number(time24[2]);
    if (
      Number.isInteger(hour) &&
      Number.isInteger(minute) &&
      hour >= 0 &&
      hour <= 23 &&
      minute >= 0 &&
      minute <= 59
    ) {
      return hour * 60 + minute;
    }
  }

  const time12 = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])$/);
  if (time12) {
    const rawHour = Number(time12[1]);
    const minute = Number(time12[2] ?? "0");
    if (
      Number.isInteger(rawHour) &&
      Number.isInteger(minute) &&
      rawHour >= 1 &&
      rawHour <= 12 &&
      minute >= 0 &&
      minute <= 59
    ) {
      const meridiem = time12[3].toUpperCase();
      let hour24 = rawHour % 12;
      if (meridiem === "PM") {
        hour24 += 12;
      }
      return hour24 * 60 + minute;
    }
  }

  return null;
}

function formatMinutesCompact(totalMinutes: number): {
  value: string;
  suffix: "AM" | "PM";
} {
  const hour24 = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const suffix: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  const minuteText = minute === 0 ? "" : `:${minute.toString().padStart(2, "0")}`;
  return {
    value: `${hour12}${minuteText}`,
    suffix
  };
}

function formatTimeLabel(
  startMinutes: number | null,
  endMinutes: number | null
): string {
  if (startMinutes === null && endMinutes === null) {
    return "";
  }

  if (startMinutes !== null && endMinutes !== null) {
    const start = formatMinutesCompact(startMinutes);
    const end = formatMinutesCompact(endMinutes);
    if (start.suffix === end.suffix) {
      return `${start.value}-${end.value}${end.suffix}`;
    }
    return `${start.value}${start.suffix}-${end.value}${end.suffix}`;
  }

  if (startMinutes !== null) {
    const start = formatMinutesCompact(startMinutes);
    return `${start.value}${start.suffix}`;
  }

  const end = formatMinutesCompact(endMinutes as number);
  return `until ${end.value}${end.suffix}`;
}

function formatDateLabel(date: Date): string {
  return `${format(date, "MMM")} ${toOrdinal(date.getDate())}`;
}

function normalizeEvent(entry: ListingOpenHouseEvent): NormalizedOpenHouseEvent {
  const parsedDate = parseOpenHouseDate(entry.date);
  return {
    date: entry.date?.trim() || null,
    startTime: entry.start_time?.trim() || null,
    endTime: entry.end_time?.trim() || null,
    parsedDate,
    startMinutes: parseTimeMinutes(entry.start_time),
    endMinutes: parseTimeMinutes(entry.end_time)
  };
}

function compareEventOrder(
  a: NormalizedOpenHouseEvent,
  b: NormalizedOpenHouseEvent
): number {
  const aDate = a.parsedDate ? a.parsedDate.getTime() : Number.POSITIVE_INFINITY;
  const bDate = b.parsedDate ? b.parsedDate.getTime() : Number.POSITIVE_INFINITY;
  if (aDate !== bDate) return aDate - bDate;

  const aStart = a.startMinutes ?? Number.POSITIVE_INFINITY;
  const bStart = b.startMinutes ?? Number.POSITIVE_INFINITY;
  return aStart - bStart;
}

function resolveIsUpcoming(event: NormalizedOpenHouseEvent, now: Date): boolean {
  if (!event.parsedDate) return false;

  const eventDate = new Date(
    event.parsedDate.getFullYear(),
    event.parsedDate.getMonth(),
    event.parsedDate.getDate()
  );
  const nowDayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (eventDate.getTime() > nowDayStart.getTime()) {
    return true;
  }
  if (eventDate.getTime() < nowDayStart.getTime()) {
    return false;
  }

  if (event.endMinutes !== null) {
    const eventEnd = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate(),
      Math.floor(event.endMinutes / 60),
      event.endMinutes % 60
    );
    return eventEnd.getTime() >= now.getTime();
  }

  if (event.startMinutes !== null) {
    const eventStart = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate(),
      Math.floor(event.startMinutes / 60),
      event.startMinutes % 60
    );
    return eventStart.getTime() >= now.getTime();
  }

  return true;
}

function getListingAddressLine(
  listingAddress: string | null | undefined,
  details: ListingPropertyDetails | null | undefined
): string {
  const resolved = details?.address?.trim() || listingAddress?.trim() || "";
  return resolved;
}

export function resolveListingOpenHouseContext(params: {
  listingPropertyDetails?: ListingPropertyDetails | null;
  listingAddress?: string | null;
  now?: Date;
}): ListingOpenHouseContext {
  const details = params.listingPropertyDetails ?? null;
  const events = details?.open_house_events ?? [];
  const normalizedEvents = events.map(normalizeEvent);
  const now = params.now ?? new Date();
  const validEvents = normalizedEvents.filter((event) => event.parsedDate);
  const listingAddressLine = getListingAddressLine(params.listingAddress, details);

  const upcoming = validEvents
    .filter((event) => resolveIsUpcoming(event, now))
    .sort(compareEventOrder);
  const selected = (upcoming[0] ?? [...validEvents].sort(compareEventOrder)[0]) ?? null;

  if (!selected || !selected.parsedDate) {
    return {
      hasAnyEvent: normalizedEvents.length > 0,
      hasSchedule: false,
      selectedEvent: null,
      openHouseDateTimeLabel: "",
      openHouseOverlayLabel: "",
      listingAddressLine
    };
  }

  const dateLabel = formatDateLabel(selected.parsedDate);
  const timeLabel = formatTimeLabel(selected.startMinutes, selected.endMinutes);
  const dateTimeLabel = timeLabel ? `${dateLabel}, ${timeLabel}` : dateLabel;

  return {
    hasAnyEvent: normalizedEvents.length > 0,
    hasSchedule: true,
    selectedEvent: {
      date: selected.date,
      startTime: selected.startTime,
      endTime: selected.endTime,
      dateLabel,
      timeLabel,
      dateTimeLabel
    },
    openHouseDateTimeLabel: dateTimeLabel,
    openHouseOverlayLabel: dateTimeLabel,
    listingAddressLine
  };
}
