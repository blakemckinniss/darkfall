---
allowed-tools: Bash(curl:*)
description: Test AI integration endpoints (portrait and item generation)
---

# Test AI Integrations

Verify that AI generation endpoints are working correctly.

## Environment Check

Environment variables status: !`env | grep -E '(FAL_KEY|GROQ_API_KEY)' | sed 's/=.*/=***/'`

## Tasks

1. **Check Environment Variables**
   - Verify FAL_KEY is set (portrait generation)
   - Verify GROQ_API_KEY is set (item generation)
   - Warn if either is missing

2. **Test Portrait Generation** (`/api/generate-portrait`)
   - Attempt a simple portrait generation request
   - Check response format and imageUrl
   - Verify fal.ai flux/schnell model is accessible

3. **Test Item Generation** (`/api/generate-item`)
   - Test with different rarity tiers
   - Verify Groq mixtral-8x7b-32768 model response
   - Check returned item structure matches expected schema

4. **Report Results**
   - Summarize success/failure for each endpoint
   - Provide troubleshooting steps for any failures
   - Estimate API costs if successful

**Note**: Only run this if the dev server is running on localhost:3000
