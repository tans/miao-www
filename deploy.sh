#!/bin/bash
set -e

echo "Building Astro project..."
bun run build

echo "Deploying to /opt/1panel/www/sites/miao-test.clawos.cc/index..."
rm -rf /opt/1panel/www/sites/miao-test.clawos.cc/index/*
cp -r dist/* /opt/1panel/www/sites/miao-test.clawos.cc/index/

echo "Deploy complete!"
