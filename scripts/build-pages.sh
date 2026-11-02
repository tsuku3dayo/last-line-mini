#!/usr/bin/env bash
# GitHub Pages に置く 1 つの公開物（site/）を作る（LLM-ADR-0001・LLM-SA-0001 §2）。
#   site/          … 本番：最新のリリースのタグ v*（まだなければ「準備中」のページ）
#   site/preview/  … プレビュー：main の最新
# 使い方（CI）：bash scripts/build-pages.sh   ※ git の履歴とタグがすべて要る（fetch-depth: 0）
set -euo pipefail

ROOT="$(pwd)"
OUT="$ROOT/site"
WT="$(mktemp -d)/wt"
rm -rf "$OUT"
mkdir -p "$OUT"

build() { # $1: git の ref  $2: チャンネル  $3: 置き場所
  git worktree add --detach "$WT" "$1"
  (
    cd "$WT"
    npm ci --no-audit --no-fund
    APP_CHANNEL="$2" npm run build
    node scripts/check-dist.mjs --channel "$2"
  )
  mkdir -p "$3"
  cp -R "$WT/dist/." "$3"
  # 画面の試作はプレビューにだけ置く（SW のキャッシュには入れない。vite.config.ts の globIgnores）
  if [ "$2" = "preview" ] && [ -d "$WT/prototype" ]; then
    cp -R "$WT/prototype" "$3/prototype"
  fi
  git worktree remove --force "$WT"
}

TAG="$(git tag -l 'v*' --sort=-v:refname | head -n 1)"
if [ -n "$TAG" ]; then
  echo "本番：$TAG"
  build "$TAG" production "$OUT"
else
  echo "本番：リリースのタグがまだないので「準備中」のページを置く"
  cp "$ROOT/pages-placeholder/index.html" "$OUT/index.html"
fi

echo "プレビュー：origin/main（$(git rev-parse --short origin/main)）"
build origin/main preview "$OUT/preview"

echo "公開物："
find "$OUT" -maxdepth 2 | sort
