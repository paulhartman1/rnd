#!/bin/bash

# Ping Supabase database to prevent 7-day inactivity pause
# This script should run every 6 days via cron

PROJECT_DIR="/home/paul/Documents/codes/rnd/rnd"
LOG_FILE="$PROJECT_DIR/scripts/db-ping.log"

cd "$PROJECT_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Pinging database..." >> "$LOG_FILE"

# Simple query to keep database active
supabase db query "SELECT COUNT(*) FROM leads;" 2>&1 >> "$LOG_FILE"

if [ $? -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Database ping successful" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Database ping failed" >> "$LOG_FILE"
fi

# Keep only last 100 lines of log
tail -n 100 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
