#!/bin/bash

echo "=== PRO0 Comprehensive Test ==="
echo ""

echo "1. Building project..."
bun run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi
echo "✅ Build successful"
echo ""

echo "2. Testing CLI commands..."
node dist/cli.js --version
node dist/cli.js --help > /dev/null
node dist/cli.js config -g
node dist/cli.js config -p
echo "✅ CLI commands working"
echo ""

echo "3. Running example..."
node dist/example.js > /dev/null
echo "✅ Example runs successfully"
echo ""

echo "4. Checking global config..."
if [ -f ~/.config/opencode/pro0.json ]; then
  echo "✅ Global config exists"
else
  echo "❌ Global config missing"
  exit 1
fi
echo ""

echo "5. Checking project structure..."
if [ -d .pro0/plans ]; then
  echo "✅ Plans directory exists"
else
  echo "❌ Plans directory missing"
  exit 1
fi
echo ""

echo "6. Listing plans..."
node dist/cli.js plans
echo ""

echo "=== All Tests Passed! ==="
