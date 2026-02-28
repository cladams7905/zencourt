import * as React from "react";
import { format } from "date-fns";
import { Button } from "@web/src/components/ui/button";
import { Calendar } from "@web/src/components/ui/calendar";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from "@web/src/components/ui/card";
import { Input } from "@web/src/components/ui/input";
import { TimePicker } from "@web/src/components/ui/time-picker";
import { Label } from "@web/src/components/ui/label";
import {
  Popover,
  PopoverAnchor,
  PopoverContent
} from "@web/src/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@web/src/components/ui/table";
import {
  formatDateDisplay,
  parseReviewDate
} from "@web/src/components/listings/review/shared/formatters";
import type { ListingOpenHouseEvent } from "@shared/types/models";

type ReviewOpenHouseEventsCardProps = {
  openHouseEvents: ListingOpenHouseEvent[];
  setOpenHouseEvents: (next: ListingOpenHouseEvent[]) => void;
  triggerAutoSave: () => void;
};

type OpenHouseEventRowProps = {
  entry: ListingOpenHouseEvent;
  index: number;
  openHouseEvents: ListingOpenHouseEvent[];
  setOpenHouseEvents: (next: ListingOpenHouseEvent[]) => void;
  triggerAutoSave: () => void;
};

function OpenHouseEventRow({
  entry,
  index,
  openHouseEvents,
  setOpenHouseEvents,
  triggerAutoSave
}: OpenHouseEventRowProps) {
  const [pickerOpen, setPickerOpen] = React.useState(false);

  const selectedDate = React.useMemo(() => {
    return parseReviewDate(entry.date);
  }, [entry.date]);

  const updateEntry = React.useCallback(
    (updates: Partial<ListingOpenHouseEvent>) => {
      const updated = [...openHouseEvents];
      updated[index] = { ...updated[index], ...updates };
      setOpenHouseEvents(updated);
    },
    [index, openHouseEvents, setOpenHouseEvents]
  );

  const handleDateSelect = React.useCallback(
    (d: Date | undefined) => {
      updateEntry({ date: d ? format(d, "yyyy-MM-dd") : null });
    },
    [updateEntry]
  );

  const openPicker = React.useCallback(() => setPickerOpen(true), []);

  return (
    <TableRow>
      <TableCell>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverAnchor asChild>
            <span>
              <Input
                type="text"
                value={formatDateDisplay(entry.date)}
                placeholder="Select date"
                readOnly
                className="cursor-pointer"
                onClick={openPicker}
                onBlur={triggerAutoSave}
              />
            </span>
          </PopoverAnchor>
          <PopoverContent align="start" className="w-auto p-0">
            <Card className="overflow-hidden rounded-xl border-0 shadow-none">
              <CardContent className="p-4 pb-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  defaultMonth={selectedDate}
                  showOutsideDays={false}
                />
              </CardContent>
              <CardFooter className="flex flex-col gap-4 border-t border-border px-4 py-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor={`oh-start-${index}`}
                    className="font-body text-sm font-semibold text-foreground"
                  >
                    Start Time
                  </Label>
                  <TimePicker
                    value={entry.start_time}
                    onChange={(v) => {
                      updateEntry({ start_time: v });
                      triggerAutoSave();
                    }}
                    placeholder="Select time"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor={`oh-end-${index}`}
                    className="font-body text-sm font-semibold text-foreground"
                  >
                    End Time
                  </Label>
                  <TimePicker
                    value={entry.end_time}
                    onChange={(v) => {
                      updateEntry({ end_time: v });
                      triggerAutoSave();
                    }}
                    placeholder="Select time"
                  />
                </div>
              </CardFooter>
            </Card>
          </PopoverContent>
        </Popover>
      </TableCell>
      <TableCell>
        <TimePicker
          value={entry.start_time}
          onChange={(v) => {
            const next = [...openHouseEvents];
            next[index] = { ...next[index], start_time: v };
            setOpenHouseEvents(next);
            triggerAutoSave();
          }}
          placeholder="Select time"
        />
      </TableCell>
      <TableCell>
        <TimePicker
          value={entry.end_time}
          onChange={(v) => {
            const next = [...openHouseEvents];
            next[index] = { ...next[index], end_time: v };
            setOpenHouseEvents(next);
            triggerAutoSave();
          }}
          placeholder="Select time"
        />
      </TableCell>
      <TableCell>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const next = openHouseEvents.filter((_, idx) => idx !== index);
            setOpenHouseEvents(next);
          }}
        >
          Remove
        </Button>
      </TableCell>
    </TableRow>
  );
}

export const ReviewOpenHouseEventsCard = ({
  openHouseEvents,
  setOpenHouseEvents,
  triggerAutoSave
}: ReviewOpenHouseEventsCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Open house events</CardTitle>
        <CardAction>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpenHouseEvents([...openHouseEvents, {}])}
          >
            Add event
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        {openHouseEvents.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No open house events added.
          </p>
        ) : (
          <Table>
            <TableHeader className="bg-transparent">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-body font-bold text-sm">
                  Date
                </TableHead>
                <TableHead className="font-body font-bold text-sm">
                  Start time
                </TableHead>
                <TableHead className="font-body font-bold text-sm">
                  End time
                </TableHead>
                <TableHead className="font-body font-bold text-sm" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {openHouseEvents.map((entry, index) => (
                <OpenHouseEventRow
                  key={`open-house-${index}`}
                  entry={entry}
                  index={index}
                  openHouseEvents={openHouseEvents}
                  setOpenHouseEvents={setOpenHouseEvents}
                  triggerAutoSave={triggerAutoSave}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
