#!/bin/bash

BASE_URL="http://localhost:3000"

# Step 1: Upload PDF and get analysis
echo "=== Step 1: Uploading PDF for analysis ==="
RESPONSE=$(curl -s -X POST \
  -F "file=@test.pdf" \
  -F "name=Juan Perez" \
  -F "email=test@example.com" \
  -F "plate=RMNP" \
  "$BASE_URL/api/analyze")

echo "Response: $RESPONSE"
REQUEST_ID=$(echo "$RESPONSE" | grep -o '"requestId":"[^"]*' | cut -d'"' -f4)
echo "Request ID: $REQUEST_ID"

if [ -z "$REQUEST_ID" ]; then
  echo "Error: Could not extract requestId from response"
  exit 1
fi

# Step 2: Check analysis results
echo -e "\n=== Step 2: Checking analysis results ==="
RESULTS=$(curl -s "$BASE_URL/api/results/$REQUEST_ID")
echo "Results: $RESULTS" | head -c 500
echo "..."

# Step 3: Trigger payment webhook
echo -e "\n=== Step 3: Processing mock payment ==="
PAYMENT=$(curl -s "$BASE_URL/api/payment/webhook?requestId=$REQUEST_ID&status=approved" -L)
echo "Payment response (first 500 chars): ${PAYMENT:0:500}"

# Step 4: Download report
echo -e "\n=== Step 4: Downloading report ==="
curl -s "$BASE_URL/api/download/$REQUEST_ID?format=report" > report.html
echo "Report downloaded (size: $(wc -c < report.html) bytes)"

# Step 5: Download drafts
echo -e "\n=== Step 5: Downloading drafts ==="
curl -s "$BASE_URL/api/download/$REQUEST_ID?format=drafts" > drafts.txt
echo "Drafts downloaded (size: $(wc -c < drafts.txt) bytes)"

# Step 6: Download combined JSON
echo -e "\n=== Step 6: Downloading combined JSON ==="
curl -s "$BASE_URL/api/download/$REQUEST_ID" > combined.json
echo "Combined JSON downloaded (size: $(wc -c < combined.json) bytes)"

echo -e "\n=== End-to-end test complete ==="
