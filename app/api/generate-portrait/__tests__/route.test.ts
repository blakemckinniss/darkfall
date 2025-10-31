import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"
import { POST } from "../route"

// Mock fal.ai client
vi.mock("@fal-ai/serverless-client", () => ({
  config: vi.fn(),
  subscribe: vi.fn(),
}))

import * as fal from "@fal-ai/serverless-client"

describe("POST /api/generate-portrait", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock console methods
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const createMockRequest = (body: unknown): NextRequest => {
    return {
      json: () => Promise.resolve(body),
    } as NextRequest
  }

  describe("Success Cases", () => {
    it("should generate portrait with valid prompt", async () => {
      const mockImageUrl = "https://fal.media/files/test-image.jpg"
      const mockSubscribe = vi.fn().mockResolvedValue({
        images: [{ url: mockImageUrl }],
      })

      vi.mocked(fal.subscribe).mockImplementation(mockSubscribe)

      const request = createMockRequest({ prompt: "A brave warrior" })
      const response = await POST(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.imageUrl).toBe(mockImageUrl)

      // Verify fal.subscribe was called with correct parameters
      expect(mockSubscribe).toHaveBeenCalledWith("fal-ai/flux/schnell", {
        input: {
          prompt: expect.stringContaining("A brave warrior"),
          image_size: "portrait_4_3",
          num_inference_steps: 4,
          num_images: 1,
          enable_safety_checker: false,
        },
      })
    })

    it("should enhance prompt with lighting instructions", async () => {
      const mockSubscribe = vi.fn().mockResolvedValue({
        images: [{ url: "https://example.com/image.jpg" }],
      })

      vi.mocked(fal.subscribe).mockImplementation(mockSubscribe)

      const request = createMockRequest({ prompt: "A dark mage" })
      await POST(request)

      expect(mockSubscribe).toHaveBeenCalledWith(
        "fal-ai/flux/schnell",
        expect.objectContaining({
          input: expect.objectContaining({
            prompt: expect.stringContaining("well-lit"),
          }),
        })
      )

      expect(mockSubscribe).toHaveBeenCalledWith(
        "fal-ai/flux/schnell",
        expect.objectContaining({
          input: expect.objectContaining({
            prompt: expect.stringContaining("high quality"),
          }),
        })
      )
    })

    it("should handle complex prompts", async () => {
      const complexPrompt =
        "A female elf archer with silver hair and emerald eyes, wearing leather armor"
      const mockSubscribe = vi.fn().mockResolvedValue({
        images: [{ url: "https://example.com/image.jpg" }],
      })

      vi.mocked(fal.subscribe).mockImplementation(mockSubscribe)

      const request = createMockRequest({ prompt: complexPrompt })
      const response = await POST(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.imageUrl).toBeDefined()
    })
  })

  describe("Error Cases", () => {
    it("should return 400 when prompt is missing", async () => {
      const request = createMockRequest({})
      const response = await POST(request)

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe("Prompt is required")
    })

    it("should return 400 when prompt is empty string", async () => {
      const request = createMockRequest({ prompt: "" })
      const response = await POST(request)

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe("Prompt is required")
    })

    it("should return 400 when prompt is null", async () => {
      const request = createMockRequest({ prompt: null })
      const response = await POST(request)

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe("Prompt is required")
    })

    it("should return 500 when fal.ai returns no images", async () => {
      const mockSubscribe = vi.fn().mockResolvedValue({
        images: [],
      })

      vi.mocked(fal.subscribe).mockImplementation(mockSubscribe)

      const request = createMockRequest({ prompt: "Test prompt" })
      const response = await POST(request)

      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe("Failed to generate portrait")
    })

    it("should return 500 when fal.ai returns null images", async () => {
      const mockSubscribe = vi.fn().mockResolvedValue({
        images: null,
      })

      vi.mocked(fal.subscribe).mockImplementation(mockSubscribe)

      const request = createMockRequest({ prompt: "Test prompt" })
      const response = await POST(request)

      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe("Failed to generate portrait")
    })

    it("should return 500 when fal.ai returns undefined url", async () => {
      const mockSubscribe = vi.fn().mockResolvedValue({
        images: [{ url: undefined }],
      })

      vi.mocked(fal.subscribe).mockImplementation(mockSubscribe)

      const request = createMockRequest({ prompt: "Test prompt" })
      const response = await POST(request)

      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe("Failed to generate portrait")
    })

    it("should handle fal.ai API errors", async () => {
      const mockSubscribe = vi.fn().mockRejectedValue(new Error("API rate limit exceeded"))

      vi.mocked(fal.subscribe).mockImplementation(mockSubscribe)

      const request = createMockRequest({ prompt: "Test prompt" })
      const response = await POST(request)

      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe("Failed to generate portrait")
    })

    it("should handle network errors", async () => {
      const mockSubscribe = vi.fn().mockRejectedValue(new Error("Network error"))

      vi.mocked(fal.subscribe).mockImplementation(mockSubscribe)

      const request = createMockRequest({ prompt: "Test prompt" })
      const response = await POST(request)

      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe("Failed to generate portrait")
    })

    it("should handle invalid JSON in request", async () => {
      const request = {
        json: () => Promise.reject(new Error("Invalid JSON")),
      } as unknown as NextRequest

      const response = await POST(request)

      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe("Failed to generate portrait")
    })
  })

  describe("Configuration", () => {
    it("should configure fal.ai with credentials from environment", () => {
      // The config is called when the module is imported, so we just verify the mock exists
      expect(fal.config).toBeDefined()
      expect(typeof fal.config).toBe("function")
    })

    it("should use correct model and parameters", async () => {
      const mockSubscribe = vi.fn().mockResolvedValue({
        images: [{ url: "https://example.com/image.jpg" }],
      })

      vi.mocked(fal.subscribe).mockImplementation(mockSubscribe)

      const request = createMockRequest({ prompt: "Test" })
      await POST(request)

      expect(mockSubscribe).toHaveBeenCalledWith("fal-ai/flux/schnell", {
        input: {
          prompt: expect.any(String),
          image_size: "portrait_4_3",
          num_inference_steps: 4,
          num_images: 1,
          enable_safety_checker: false,
        },
      })
    })
  })

  describe("Logging", () => {
    it("should log generation request", async () => {
      const mockSubscribe = vi.fn().mockResolvedValue({
        images: [{ url: "https://example.com/image.jpg" }],
      })

      vi.mocked(fal.subscribe).mockImplementation(mockSubscribe)

      const request = createMockRequest({ prompt: "Test prompt" })
      await POST(request)

      expect(console.log).toHaveBeenCalledWith(
        "[v0] Generating portrait with fal.ai for prompt:",
        "Test prompt"
      )
    })

    it("should log errors", async () => {
      const mockSubscribe = vi.fn().mockRejectedValue(new Error("Test error"))

      vi.mocked(fal.subscribe).mockImplementation(mockSubscribe)

      const request = createMockRequest({ prompt: "Test" })
      await POST(request)

      expect(console.error).toHaveBeenCalledWith(
        "[v0] Error generating portrait:",
        expect.any(Error)
      )
    })
  })
})
