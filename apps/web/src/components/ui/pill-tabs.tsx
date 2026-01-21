"use client";

import * as React from "react";
import { Button } from "./button";
import { cn } from "./utils";

type PillTabOption<T extends string> = {
  value: T;
  label: React.ReactNode;
};

interface PillTabsProps<T extends string> {
  value: T;
  onValueChange?: (value: T) => void;
  options: PillTabOption<T>[];
  className?: string;
  buttonClassName?: string;
  size?: React.ComponentProps<typeof Button>["size"];
}

function PillTabs<T extends string>({
  value,
  onValueChange,
  options,
  className,
  buttonClassName,
  size = "sm"
}: PillTabsProps<T>) {
  return (
    <div
      className={cn(
        "flex w-fit items-center rounded-lg bg-secondary border border-border/60 p-1",
        className
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <Button
            key={option.value}
            type="button"
            size={size}
            variant={isActive ? "default" : "ghost"}
            className={cn(
              "rounded-lg px-4",
              !isActive && "text-muted-foreground hover:text-foreground",
              buttonClassName
            )}
            onClick={() => onValueChange?.(option.value)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}

export { PillTabs };
