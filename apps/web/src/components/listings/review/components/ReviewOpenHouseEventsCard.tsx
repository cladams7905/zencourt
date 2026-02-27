import * as React from "react";
import { Button } from "@web/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@web/src/components/ui/card";
import { Input } from "@web/src/components/ui/input";
import { Label } from "@web/src/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@web/src/components/ui/table";
import type { ListingOpenHouseEvent } from "@shared/types/models";
import { toNullableString } from "@web/src/components/listings/review/shared/formatters";

type ReviewOpenHouseEventsCardProps = {
  openHouseEvents: ListingOpenHouseEvent[];
  setOpenHouseEvents: (next: ListingOpenHouseEvent[]) => void;
  triggerAutoSave: () => void;
};

export const ReviewOpenHouseEventsCard = ({
  openHouseEvents,
  setOpenHouseEvents,
  triggerAutoSave
}: ReviewOpenHouseEventsCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Open house events</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Events</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpenHouseEvents([...openHouseEvents, {}])}
          >
            Add event
          </Button>
        </div>
        {openHouseEvents.length === 0 ? (
          <p className="text-xs text-muted-foreground">No open house events added.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Start time</TableHead>
                <TableHead>End time</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {openHouseEvents.map((entry, index) => (
                <TableRow key={`open-house-${index}`}>
                  <TableCell>
                    <Input
                      value={entry.date ?? ""}
                      placeholder="2026-03-07"
                      onChange={(event) => {
                        const next = [...openHouseEvents];
                        next[index] = {
                          ...next[index],
                          date: toNullableString(event.target.value)
                        };
                        setOpenHouseEvents(next);
                      }}
                      onBlur={triggerAutoSave}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={entry.start_time ?? ""}
                      placeholder="7:00 AM"
                      onChange={(event) => {
                        const next = [...openHouseEvents];
                        next[index] = {
                          ...next[index],
                          start_time: toNullableString(event.target.value)
                        };
                        setOpenHouseEvents(next);
                      }}
                      onBlur={triggerAutoSave}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={entry.end_time ?? ""}
                      placeholder="10:00 AM"
                      onChange={(event) => {
                        const next = [...openHouseEvents];
                        next[index] = {
                          ...next[index],
                          end_time: toNullableString(event.target.value)
                        };
                        setOpenHouseEvents(next);
                      }}
                      onBlur={triggerAutoSave}
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
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
