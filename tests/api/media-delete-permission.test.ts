import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DELETE as deleteMedia } from "@/app/api/media/[id]/route";
import { fakeSession, seedBasics, resetDb } from "../helpers/fixtures";
import type { Session } from "next-auth";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/image-upload", () => ({ deleteImage: vi.fn().mockResolvedValue(undefined) }));

const mockedAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

// DELETE permanently removes a Media row + its stored file — irreversible,
// so it must require products.delete, not products.update. A role with
// update-but-not-delete on products should not be able to destroy assets.
describe("DELETE /api/media/[id] - permission", () => {
  let fx: Awaited<ReturnType<typeof seedBasics>>;
  let mediaId: string;

  beforeEach(async () => {
    fx = await seedBasics(10);
    const media = await prisma.media.create({
      data: {
        filename: "test.png",
        stored_filename: `test-${fx.userId.slice(0, 8)}.png`,
        file_path: "/uploads/test.png",
        mime_type: "image/png",
        file_size: 10,
      },
    });
    mediaId = media.id;
  });

  afterEach(async () => {
    await resetDb();
    await prisma.media.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects a caller with only products.update", async () => {
    mockedAuth.mockResolvedValue(
      fakeSession({ userId: fx.userId, permissions: ["products.view", "products.update"] }),
    );

    const res = await deleteMedia(
      new NextRequest(`http://localhost/api/media/${mediaId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: mediaId }) },
    );
    expect(res.status).toBe(403);

    const stillThere = await prisma.media.findUnique({ where: { id: mediaId } });
    expect(stillThere).not.toBeNull();
  });

  it("allows a caller with products.delete", async () => {
    mockedAuth.mockResolvedValue(
      fakeSession({ userId: fx.userId, permissions: ["products.view", "products.delete"] }),
    );

    const res = await deleteMedia(
      new NextRequest(`http://localhost/api/media/${mediaId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: mediaId }) },
    );
    expect(res.status).toBe(200);

    const gone = await prisma.media.findUnique({ where: { id: mediaId } });
    expect(gone).toBeNull();
  });
});
