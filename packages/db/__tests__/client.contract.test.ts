describe("@db/client contract", () => {
  it("exports db instance, schema tables, and query helpers", async () => {
    const mod = await import("../client");

    expect(mod.db).toBeDefined();
    expect(mod.listings).toBeDefined();
    expect(typeof mod.eq).toBe("function");
    expect(typeof mod.and).toBe("function");
    expect(typeof mod.inArray).toBe("function");
    expect(typeof mod.desc).toBe("function");
  });
});
