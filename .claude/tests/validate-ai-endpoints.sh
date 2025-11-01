#!/bin/bash
# AI Endpoint Validation Script
# Tests all three AI generation endpoints

set -e

BASE_URL="http://localhost:3000"
BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BOLD}${BLUE}=== AI Endpoint Validation ===${NC}\n"

# Check if dev server is running
if ! curl -s "${BASE_URL}" > /dev/null 2>&1; then
    echo -e "${RED}❌ Dev server is not running at ${BASE_URL}${NC}"
    echo "Please run: pnpm dev"
    exit 1
fi

echo -e "${GREEN}✓ Dev server is running${NC}\n"

# Test 1: Portrait Generation (fal.ai)
echo -e "${BOLD}1. Testing Portrait Generation (fal.ai)...${NC}"
PORTRAIT_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/generate-portrait" \
    -H "Content-Type: application/json" \
    -d '{"prompt":"a mysterious elven warrior with silver hair"}')

if echo "$PORTRAIT_RESPONSE" | jq -e '.imageUrl' > /dev/null 2>&1; then
    IMAGE_URL=$(echo "$PORTRAIT_RESPONSE" | jq -r '.imageUrl')
    echo -e "${GREEN}✓ Portrait generated successfully${NC}"
    echo -e "  Image URL: ${IMAGE_URL:0:60}..."
else
    echo -e "${RED}❌ Portrait generation failed${NC}"
    echo "$PORTRAIT_RESPONSE" | jq '.'
fi

echo ""

# Test 2: Item Generation (Groq AI)
echo -e "${BOLD}2. Testing Item Generation (Groq AI)...${NC}"
ITEM_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/generate-item" \
    -H "Content-Type: application/json" \
    -d '{"prompt":"a legendary flaming sword that burns with eternal fire"}')

if echo "$ITEM_RESPONSE" | jq -e '.item' > /dev/null 2>&1; then
    ITEM_NAME=$(echo "$ITEM_RESPONSE" | jq -r '.item.name')
    ITEM_RARITY=$(echo "$ITEM_RESPONSE" | jq -r '.item.rarity')
    ITEM_VALUE=$(echo "$ITEM_RESPONSE" | jq -r '.item.value')
    echo -e "${GREEN}✓ Item generated successfully${NC}"
    echo -e "  Name: ${ITEM_NAME}"
    echo -e "  Rarity: ${ITEM_RARITY}"
    echo -e "  Value: ${ITEM_VALUE}g"
else
    echo -e "${RED}❌ Item generation failed${NC}"
    echo "$ITEM_RESPONSE" | jq '.'
fi

echo ""

# Test 3: Narrative Generation (Groq AI)
echo -e "${BOLD}3. Testing Narrative Generation (Groq AI)...${NC}"
NARRATIVE_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/generate-narrative" \
    -H "Content-Type: application/json" \
    -d '{"playerStats":{"health":100,"maxHealth":100,"level":5,"gold":50}}')

if echo "$NARRATIVE_RESPONSE" | jq -e '.event' > /dev/null 2>&1; then
    ENTITY_NAME=$(echo "$NARRATIVE_RESPONSE" | jq -r '.event.entity')
    ENTITY_RARITY=$(echo "$NARRATIVE_RESPONSE" | jq -r '.event.entityRarity')
    DESCRIPTION=$(echo "$NARRATIVE_RESPONSE" | jq -r '.event.description')
    REGISTERED_ID=$(echo "$NARRATIVE_RESPONSE" | jq -r '.registeredEntity // "none"')
    echo -e "${GREEN}✓ Narrative generated successfully${NC}"
    echo -e "  Entity: ${ENTITY_NAME} (${ENTITY_RARITY})"
    echo -e "  Description: ${DESCRIPTION:0:80}..."
    echo -e "  Registered Entity ID: ${REGISTERED_ID}"
else
    echo -e "${RED}❌ Narrative generation failed${NC}"
    echo "$NARRATIVE_RESPONSE" | jq '.'
fi

echo ""
echo -e "${BOLD}${GREEN}=== All Tests Complete ===${NC}"
