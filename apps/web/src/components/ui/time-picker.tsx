"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { Input } from "@web/src/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent
} from "@web/src/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@web/src/components/ui/select";
import { cn } from "@web/src/components/ui/utils";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 00, 05, 10, ..., 55
const AMPM = ["AM", "PM"] as const;

function parseTime(value: string | null | undefined): {
  hour12: number;
  minute: number;
  ampm: "AM" | "PM";
} {
  if (!value) return { hour12: 12, minute: 0, ampm: "AM" };
  const [h, m] = value.split(":").map(Number);
  const hour24 = Number.isNaN(h) ? 0 : h;
  const minute = Number.isNaN(m) ? 0 : Math.floor(m / 5) * 5; // snap to 5-min
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const ampm = hour24 >= 12 ? "PM" : "AM";
  return { hour12, minute: Math.min(55, minute), ampm };
}

function toTimeString(
  hour12: number,
  minute: number,
  ampm: "AM" | "PM"
): string {
  let hour24 = hour12;
  if (ampm === "PM" && hour12 !== 12) hour24 += 12;
  if (ampm === "AM" && hour12 === 12) hour24 = 0;
  return `${hour24.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

function formatDisplay(value: string | null | undefined): string {
  if (!value) return "";
  const { hour12, minute, ampm } = parseTime(value);
  return `${hour12}:${minute.toString().padStart(2, "0")} ${ampm}`;
}

type TimePickerProps = {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
};

export function TimePicker({
  value,
  onChange,
  placeholder = "Select time",
  className
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const { hour12, minute, ampm } = parseTime(value);

  const handleChange = React.useCallback(
    (h: number, m: number, a: "AM" | "PM") => {
      onChange(toTimeString(h, m, a));
    },
    [onChange]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <span>
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpen((o) => !o);
              }
            }}
            className={cn(
              "border-input flex h-9 w-full min-w-0 cursor-pointer items-center gap-2 rounded-lg border bg-input-background px-3 py-1 text-sm transition-[color,box-shadow]",
              "focus-visible:border-ring focus-visible:ring-ring focus-visible:ring-1 focus-visible:outline-none",
              "hover:border-input/80",
              className
            )}
            onClick={() => setOpen(true)}
          >
            <Clock className="size-4 shrink-0 text-muted-foreground" />
            <span className={cn(!value && "text-muted-foreground/50")}>
              {formatDisplay(value) || placeholder}
            </span>
          </div>
        </span>
      </PopoverAnchor>
      <PopoverContent align="start" className="w-auto p-3">
        <div className="flex items-center gap-2">
          <Select
            value={hour12.toString()}
            onValueChange={(v) => handleChange(Number(v), minute, ampm)}
          >
            <SelectTrigger className="w-18 font-body" size="sm">
              <SelectValue placeholder="Hr" />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map((h) => (
                <SelectItem key={h} value={h.toString()}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground font-medium">:</span>
          <Select
            value={minute.toString()}
            onValueChange={(v) => handleChange(hour12, Number(v), ampm)}
          >
            <SelectTrigger className="w-18 font-body" size="sm">
              <SelectValue placeholder="Min" />
            </SelectTrigger>
            <SelectContent>
              {MINUTES.map((m) => (
                <SelectItem key={m} value={m.toString()}>
                  {m.toString().padStart(2, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={ampm}
            onValueChange={(v) =>
              handleChange(hour12, minute, v as "AM" | "PM")
            }
          >
            <SelectTrigger className="w-18 font-body" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AMPM.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}
