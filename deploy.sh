#!/bin/bash
set -e

MODE="${1:-}"

if ! command -v bun >/dev/null 2>&1; then
  echo "bun 未安装，无法执行 miao-www 部署"
  exit 1
fi

ASTRO_ENTRY="./node_modules/astro/bin/astro.mjs"
if [ ! -f "$ASTRO_ENTRY" ]; then
  echo "缺少 Astro CLI，先执行 bun install"
  bun install
fi

if [ ! -f "$ASTRO_ENTRY" ]; then
  echo "Astro CLI 仍不可用，部署终止"
  exit 1
fi

# 强制用 Bun runtime 直连 Astro CLI，避免系统旧版 Node 或 .bin 软链解析异常。
BUILD_CMD="bun --bun $ASTRO_ENTRY build"

if [ "$MODE" = "prod" ]; then
  export PUBLIC_API_URL="${PUBLIC_API_URL:-https://miao.jisuhudong.com}"
  echo "Building Astro project for prod with Bun runtime..."
  $BUILD_CMD
  exit 0
fi

export PUBLIC_API_URL="${PUBLIC_API_URL:-https://miao-test.clawos.cc}"

echo "Building Astro project with Bun runtime..."
$BUILD_CMD

echo "Deploying to /opt/1panel/www/sites/miao-test.clawos.cc/index..."
rm -rf /opt/1panel/www/sites/miao-test.clawos.cc/index/*
cp -r dist/* /opt/1panel/www/sites/miao-test.clawos.cc/index/

echo "Deploy complete!"
