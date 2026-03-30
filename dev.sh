#!/usr/bin/env bash
set -e

# Grade Mailer — dev launcher
# Requires: bun (https://bun.sh)

if ! command -v bun &> /dev/null; then
  echo "❌ bun n'est pas installé."
  echo "   → curl -fsSL https://bun.sh/install | bash"
  exit 1
fi

cd "$(dirname "$0")"

if [ ! -d "node_modules" ]; then
  echo "📦 Installation des dépendances..."
  bun install
fi

echo "🚀 Lancement en mode dev..."
bun run dev
