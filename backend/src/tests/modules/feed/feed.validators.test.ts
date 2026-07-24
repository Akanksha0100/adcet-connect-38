import { describe, expect, it } from "@jest/globals";
import { createPostSchema } from "../../../modules/feed/feed.validators.js";

const img = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ key: `post/i${i}.jpg`, type: "IMAGE" as const }));
const vid = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ key: `post/v${i}.mp4`, type: "VIDEO" as const }));

const parse = (input: unknown) => createPostSchema.safeParse(input);

describe("modules/feed/validators — createPostSchema", () => {
  it("accepts text only, media only, and text with media", () => {
    expect(parse({ content: "hello" }).success).toBe(true);
    expect(parse({ media: img(1) }).success).toBe(true);
    expect(parse({ content: "hello", media: vid(1) }).success).toBe(true);
  });

  it("rejects a fully empty post, including whitespace-only text", () => {
    expect(parse({}).success).toBe(false);
    expect(parse({ content: "   \n " }).success).toBe(false);
  });

  it("caps media at 2 images or 1 video and forbids mixing the two", () => {
    expect(parse({ media: img(2) }).success).toBe(true);
    expect(parse({ media: img(3) }).success).toBe(false);
    expect(parse({ media: vid(2) }).success).toBe(false);
    expect(parse({ media: [...img(1), ...vid(1)] }).success).toBe(false);
  });

  it("defaults media to an empty array", () => {
    const res = parse({ content: "hi" });
    expect(res.success && res.data.media).toEqual([]);
  });
});
