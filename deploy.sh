#!/bin/bash
set -e

MODE="${1:-}"

if ! command -v bun >/dev/null 2>&1; then
  echo "bun 未安装，无法执行 miao-www 部署"
  exit 1
fi

# 强制用 Bun runtime 执行 Astro，避免落回系统旧版 Node。
BUILD_CMD="bun run --bun build"

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
