import { type NextRequest, NextResponse } from "next/server"
import * as fal from "@fal-ai/serverless-client"

fal.config({
  credentials: process.env.FAL_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    console.log("[v0] Generating portrait with fal.ai for prompt:", prompt)

    const enhancedPrompt = `${prompt}, well-lit, bright lighting, clear details, high quality, professional lighting, vibrant colors, detailed features`

    // Generate image using the fal schnell model (optimized for fast, high-quality image generation)
    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt: enhancedPrompt,
        image_size: "portrait_4_3",
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: false, // Disabled safety checker to allow NSFW content
      },
    })

    console.log("[v0] fal.ai response:", result)

    // Extract the image URL from the result
    const imageUrl = result.images?.[0]?.url

    if (!imageUrl) {
      console.log("[v0] No image URL found in response")
      throw new Error("No image generated")
    }

    console.log("[v0] Image URL found:", imageUrl)

    return NextResponse.json({ imageUrl })
  } catch (error) {
    console.error("[v0] Error generating portrait:", error)
    return NextResponse.json({ error: "Failed to generate portrait" }, { status: 500 })
  }
}
