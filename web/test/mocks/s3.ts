import { vi } from "vitest"

export const uploadToS3Mock = vi.fn().mockResolvedValue({
  url: "https://advoga-site.s3.amazonaws.com/test-key",
})

vi.mock("@/lib/s3", () => ({
  uploadToS3: uploadToS3Mock,
}))
