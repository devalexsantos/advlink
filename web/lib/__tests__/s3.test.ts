import { describe, it, expect, vi, beforeEach } from "vitest"

const sendMock = vi.fn().mockResolvedValue({ LocationConstraint: null })

vi.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: class {
      send = sendMock
    },
    PutObjectCommand: class {
      constructor(public input: unknown) {}
    },
    GetBucketLocationCommand: class {
      constructor(public input: unknown) {}
    },
  }
})

import { uploadToS3 } from "@/lib/s3"

describe("uploadToS3()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sendMock.mockResolvedValue({ LocationConstraint: null })
  })

  it("uploads and returns a public URL", async () => {
    const result = await uploadToS3({
      key: "avatars/test.jpg",
      contentType: "image/jpeg",
      body: Buffer.from("fake-image"),
    })

    expect(result.url).toContain("avatars%2Ftest.jpg")
    expect(result.url).toContain("s3")
    expect(result.url).toContain("amazonaws.com")
    expect(sendMock).toHaveBeenCalled()
  })

  it("includes the key in the URL", async () => {
    const result = await uploadToS3({
      key: "gallery/photo.png",
      contentType: "image/png",
      body: Buffer.from("data"),
    })

    expect(result.url).toContain("gallery%2Fphoto.png")
  })
})
