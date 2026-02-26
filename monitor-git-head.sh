#!/bin/bash
# Monitor script to track when .git/HEAD gets cleared
# Run this in the background to see what's happening

LOG_FILE="git-head-monitor.log"
REPO_PATH="/Users/adamhart/Desktop/NotSus_Landing_2"

cd "$REPO_PATH" || exit 1

echo "$(date): Starting HEAD file monitor" >> "$LOG_FILE"

while true; do
    HEAD_CONTENT=$(cat .git/HEAD 2>/dev/null)
    HEAD_SIZE=$(stat -f%z .git/HEAD 2>/dev/null || echo "0")
    
    if [ -z "$HEAD_CONTENT" ] || [ "$HEAD_SIZE" -eq 0 ]; then
        echo "$(date): ⚠️  HEAD FILE IS EMPTY OR MISSING!" >> "$LOG_FILE"
        echo "$(date): Process list:" >> "$LOG_FILE"
        ps aux | grep -E "(git|cursor)" | grep -v grep >> "$LOG_FILE"
        echo "$(date): Lock files:" >> "$LOG_FILE"
        ls -la .git/*.lock 2>/dev/null >> "$LOG_FILE" || echo "No lock files" >> "$LOG_FILE"
        echo "---" >> "$LOG_FILE"
    fi
    
    # Check for lock files
    if [ -f .git/index.lock ]; then
        LOCK_AGE=$(($(date +%s) - $(stat -f%m .git/index.lock 2>/dev/null || echo 0)))
        if [ "$LOCK_AGE" -gt 60 ]; then
            echo "$(date): ⚠️  Stale index.lock detected (age: ${LOCK_AGE}s)" >> "$LOG_FILE"
        fi
    fi
    
    sleep 2
done

