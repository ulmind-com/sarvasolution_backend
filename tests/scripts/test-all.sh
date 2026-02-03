#!/bin/bash
# ssvpl-test-all.sh
# Comprehensive API Smoke Test for SSVPL MLM
# Requires: curl, jq

BASE_URL="http://localhost:8000/api/v1" # Adjusted port to 8000 based on previous logs if 5000 fails, user said 5000 in prompt but npm log showed 8000. Will check port availability or use 8000 as per npm log.
# Npm log said: "Server running in development mode on port 8000"
# prompt said: "http://localhost:5000"
# I will use 8000 as per actual server log.

echo "🧪 SSVPL MLM - COMPLETE API TEST SUITE"
echo "====================================="
echo "Target: $BASE_URL"

# 1. Admin Login
echo -n "1. Admin Login... "
LOGIN_RES=$(curl -s -X POST "$BASE_URL/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ssvpl.com","password":"adminpassword123"}')

TOKEN=$(echo $LOGIN_RES | jq -r '.data.token')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo "✅ Success"
else
  echo "❌ Failed"
  echo "RAW RESPONSE: $LOGIN_RES"
  curl -v -X POST "$BASE_URL/auth/admin/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@ssvpl.com","password":"adminpassword123"}'
  exit 1
fi

# 2. System Status
echo -n "2. Checking System Status... "
STATUS_RES=$(curl -s -X GET "$BASE_URL/admin/debug/status" \
  -H "Authorization: Bearer $TOKEN")

DB_STATUS=$(echo $STATUS_RES | jq -r '.data.dbStatus')

if [ "$DB_STATUS" == "Connected" ]; then
  echo "✅ Connected"
else
  echo "❌ Failed"
  echo "Response: $STATUS_RES"
fi

# 3. Create Product (GST Test)
echo -n "3. Creating Product (With GST)... "
PRODUCT_RES=$(curl -s -X POST "$BASE_URL/admin/product/create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productName": "Bash Test Product '"$RANDOM"'",
    "price": 1000,
    "mrp": 1180,
    "gstRate": 18,
    "stockQuantity": 50,
    "category": "agriculture"
  }')

PID=$(echo $PRODUCT_RES | jq -r '.data._id')
GST_CHECK=$(echo $PRODUCT_RES | jq -r '.data.gstAmount')

if [ "$PID" != "null" ] && [ "$GST_CHECK" == "180" ]; then
  echo "✅ Success (GST Amount: $GST_CHECK/180)"
else
  echo "❌ Failed"
  echo "Response: $PRODUCT_RES"
fi

# 4. Create Franchise (Simple Flow)
echo -n "4. Creating Franchise (Simple)... "
RANDOM_PHONE="99${RANDOM}${RANDOM}"
RANDOM_PHONE=${RANDOM_PHONE:0:10}
FRANCHISE_RES=$(curl -s -X POST "$BASE_URL/admin/franchise/create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bash Test Franchise",
    "email": "bashFranchice'"$RANDOM"'@test.com",
    "phone": "'"$RANDOM_PHONE"'",
    "city": "Test City"
  }')

FID=$(echo $FRANCHISE_RES | jq -r '.data.franchise._id')
VENDOR_ID=$(echo $FRANCHISE_RES | jq -r '.data.franchise.vendorId')

if [ "$FID" != "null" ]; then
  echo "✅ Success (VendorID: $VENDOR_ID)"
else
  echo "❌ Failed"
  echo "Response: $FRANCHISE_RES"
fi

echo "====================================="
echo "✅ Smoke Test Complete"
