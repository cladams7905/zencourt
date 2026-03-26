import { getTableConfig } from "drizzle-orm/pg-core";

import { videoClips, videoClipVersions } from "../drizzle/schema";

describe("db schema relationship contracts", () => {
  it("keeps a unique index for addressing clip versions by clip and id", () => {
    const config = getTableConfig(videoClipVersions);

    expect(
      config.indexes.some((index) => {
        const columns = index.config.columns.map((column) =>
          "name" in column ? column.name : null
        );

        return (
          index.config.unique &&
          columns.length === 2 &&
          columns[0] === "video_clip_id" &&
          columns[1] === "id"
        );
      })
    ).toBe(true);
  });

  it("enforces that a clip current version belongs to the same clip", () => {
    const config = getTableConfig(videoClips);

    expect(
      config.foreignKeys.some((foreignKey) => {
        const reference = foreignKey.reference();
        const localColumns = reference.columns.map((column) => column.name);
        const foreignColumns = reference.foreignColumns.map((column) => column.name);

        return (
          localColumns.length === 2 &&
          localColumns[0] === "id" &&
          localColumns[1] === "current_video_clip_version_id" &&
          foreignColumns.length === 2 &&
          foreignColumns[0] === "video_clip_id" &&
          foreignColumns[1] === "id"
        );
      })
    ).toBe(true);
  });
});
