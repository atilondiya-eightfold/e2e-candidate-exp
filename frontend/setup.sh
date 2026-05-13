#!/usr/bin/env bash
set -euo pipefail

# ─── Forge Frontend Setup ────────────────────────────────────────────
# Bootstraps a fresh macOS machine for frontend development.
# Installs: Xcode CLT, Homebrew, Git, nvm, Node.js, pnpm, and
# project dependencies (if frontend/ exists).
#
# Safe to re-run — each step is guarded and skips if already installed.
# ─────────────────────────────────────────────────────────────────────

NODE_VERSION="22"
NVM_VERSION="0.40.3"
DRY_RUN=false

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

info()  { printf "\033[1;34m[info]\033[0m  %s\n" "$1"; }
ok()    { printf "\033[1;32m[ok]\033[0m    %s\n" "$1"; }
err()   { printf "\033[1;31m[error]\033[0m %s\n" "$1" >&2; }
dry()   { printf "\033[1;33m[dry]\033[0m   would run: %s\n" "$1"; }

run() {
  if $DRY_RUN; then
    dry "$*"
  else
    "$@"
  fi
}

trap 'err "Setup failed at line $LINENO. Re-run after fixing the issue."' ERR

# ── macOS gate ──────────────────────────────────────────────────────
if [[ "$(uname)" != "Darwin" ]]; then
  err "This script is for macOS only."
  exit 1
fi

echo ""
printf "\033[1;36m"
cat << 'BANNER'
 _____     _            _     _____
|_   _|_ _| | ___ _ __ | |_  |  ___|__  _ __ __ _  ___
  | |/ _` | |/ _ \ '_ \| __| | |_ / _ \| '__/ _` |/ _ \
  | | (_| | |  __/ | | | |_  |  _| (_) | | | (_| |  __/
  |_|\__,_|_|\___|_| |_|\__| |_|  \___/|_|  \__, |\___|
                                             |___/
BANNER
printf "\033[0m"
echo ""

$DRY_RUN && info "Running in dry-run mode — nothing will be installed."

# ── Xcode Command Line Tools ───────────────────────────────────────
if ! xcode-select -p &>/dev/null; then
  if $DRY_RUN; then
    dry "xcode-select --install"
  else
    info "Installing Xcode Command Line Tools..."
    xcode-select --install

    info "Waiting for Xcode CLT installation to complete..."
    until xcode-select -p &>/dev/null; do
      sleep 5
    done
  fi
else
  ok "Xcode Command Line Tools (already installed)"
fi

# ── Homebrew ────────────────────────────────────────────────────────
if ! command -v brew &>/dev/null; then
  if $DRY_RUN; then
    dry "curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh | bash"
  else
    info "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # Add brew to PATH for the rest of this script
    if [[ -f /opt/homebrew/bin/brew ]]; then
      eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [[ -f /usr/local/bin/brew ]]; then
      eval "$(/usr/local/bin/brew shellenv)"
    fi
  fi
else
  ok "Homebrew ($(brew --version | head -1)) (already installed)"
fi

# ── Git ─────────────────────────────────────────────────────────────
if ! command -v git &>/dev/null; then
  if $DRY_RUN; then
    dry "brew install git"
  else
    info "Installing Git..."
    brew install git
  fi
else
  ok "Git ($(git --version)) (already installed)"
fi

# ── nvm + Node.js ──────────────────────────────────────────────────
export NVM_DIR="${HOME}/.nvm"

if [[ ! -d "$NVM_DIR" ]]; then
  if $DRY_RUN; then
    dry "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v${NVM_VERSION}/install.sh | bash"
  else
    info "Installing nvm v${NVM_VERSION}..."
    curl -o- "https://raw.githubusercontent.com/nvm-sh/nvm/v${NVM_VERSION}/install.sh" | bash
  fi
else
  ok "nvm (already installed)"
fi

# Load nvm for this script (needed even in dry-run for version checks)
# shellcheck source=/dev/null
[[ -s "$NVM_DIR/nvm.sh" ]] && . "$NVM_DIR/nvm.sh"

if command -v nvm &>/dev/null; then
  if ! nvm ls "$NODE_VERSION" &>/dev/null; then
    if $DRY_RUN; then
      dry "nvm install ${NODE_VERSION}"
    else
      info "Installing Node.js ${NODE_VERSION}..."
      nvm install "$NODE_VERSION"
    fi
  else
    ok "Node.js $(node -v) (already installed)"
  fi

  if ! $DRY_RUN; then
    nvm use "$NODE_VERSION"
  fi
fi

# ── pnpm via corepack ──────────────────────────────────────────────
if ! command -v pnpm &>/dev/null; then
  if $DRY_RUN; then
    dry "corepack enable && corepack prepare pnpm@10 --activate"
  else
    info "Installing pnpm via corepack..."
    corepack enable
    corepack prepare pnpm@10 --activate
  fi
else
  ok "pnpm ($(pnpm -v)) (already installed)"
fi

# ── Frontend Dependencies ──────────────────────────────────────────
FRONTEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -f "$FRONTEND_DIR/package.json" ]]; then
  if $DRY_RUN; then
    dry "cd $FRONTEND_DIR && pnpm install"
  else
    info "Installing frontend dependencies..."
    (cd "$FRONTEND_DIR" && pnpm install)
    ok "Frontend dependencies installed"
  fi
else
  info "No package.json found in script directory — skipping dependency install."
fi

# ── Summary ─────────────────────────────────────────────────────────
echo ""
echo "──────────────────────────────────────"
if $DRY_RUN; then
  ok "Dry run complete — no changes were made."
else
  ok "Setup complete!"
  echo ""
  echo "  Node.js : $(node -v)"
  echo "  pnpm    : $(pnpm -v)"
  echo "  nvm     : $(nvm --version)"
  echo "  Git     : $(git --version | cut -d' ' -f3)"
  echo ""
  echo "  Open a new terminal to ensure PATH changes take effect."
fi
echo "──────────────────────────────────────"
