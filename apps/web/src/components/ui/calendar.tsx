"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "./utils";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("relative p-3", className)}
      classNames={{
        months: "flex flex-col",
        month: "flex flex-col gap-3",
        month_caption: "flex justify-center relative items-center h-8",
        caption_label: "font-body text-sm font-medium text-foreground",
        nav: "flex items-center gap-1",
        button_previous: cn(
          "absolute left-0 size-8 rounded-full p-0 inline-flex items-center justify-center",
          "text-foreground hover:bg-secondary transition-colors"
        ),
        button_next: cn(
          "absolute right-0 size-8 rounded-full p-0 inline-flex items-center justify-center",
          "text-foreground hover:bg-secondary transition-colors"
        ),
        month_grid: "w-full flex flex-col gap-0.5",
        weekdays: "grid grid-cols-7",
        weekday: cn(
          "w-9 flex items-center justify-center font-body text-[0.7rem] font-normal",
          "text-muted-foreground"
        ),
        week: "grid grid-cols-7 mt-0.5",
        day: "size-9 p-0 text-center text-sm text-foreground",
        day_button: cn(
          "size-9 rounded-full inline-flex items-center justify-center",
          "font-body font-medium text-inherit",
          "hover:bg-secondary/80 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        ),
        selected:
          "rounded-full bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        today: "rounded-full bg-secondary text-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-40",
        hidden: "invisible",
        range_start: "rounded-l-full",
        range_end: "rounded-r-full",
        range_middle: "rounded-none bg-secondary/50",
        ...classNames
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          ),
        ...components
      }}
      {...props}
    />
  );
}

export { Calendar };
