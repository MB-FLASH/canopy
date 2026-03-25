#!/bin/bash
export PATH="/root/.kiex/elixirs/elixir-1.17.3-25/bin:$PATH"
export MIX_ENV=prod
export DATABASE_URL="postgresql://canopy:canopy_operiq_2026@localhost/canopy_prod"
export SECRET_KEY_BASE="canopy_operiq_secret_2026_minimum_64_chars_long_enough_padding_here_yes_ok_done"
export GUARDIAN_SECRET_KEY="canopy_guardian_secret_2026_minimum_64_chars_needed_here_padding_enough_yes_ok"
export PHX_HOST="main.operiq.net"
export PORT=9089
cd /opt/canopy/backend
exec mix phx.server
