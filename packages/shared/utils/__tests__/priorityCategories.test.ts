import {
  getDurationSecondsForCategory,
  isPriorityCategory,
  normalizeRoomCategory
} from "../priorityCategories";
import {
  DEFAULT_PRIORITY_DURATION_SECONDS,
  DEFAULT_STANDARD_DURATION_SECONDS
} from "../../types/video/priorityCategories";

describe("utils/priorityCategories", () => {
  it("normalizes numbered room category suffixes", () => {
    expect(normalizeRoomCategory("kitchen-1")).toBe("kitchen");
    expect(normalizeRoomCategory("living-room-12")).toBe("living-room");
    expect(normalizeRoomCategory("exterior-front")).toBe("exterior-front");
  });

  it("detects priority categories with and without numeric suffixes", () => {
    expect(isPriorityCategory("kitchen")).toBe(true);
    expect(isPriorityCategory("kitchen-2")).toBe(true);
    expect(isPriorityCategory("exterior-front-3")).toBe(true);
    expect(isPriorityCategory("bathroom")).toBe(false);
  });

  it("returns expected duration by category priority", () => {
    expect(getDurationSecondsForCategory("living-room-1")).toBe(
      DEFAULT_PRIORITY_DURATION_SECONDS
    );
    expect(getDurationSecondsForCategory("bathroom")).toBe(
      DEFAULT_STANDARD_DURATION_SECONDS
    );
  });
});
