#!/bin/sh

if [ -z "$WEB_SERVER" ]; then
    echo "Starting zap2xml in periodic mode..."
    SLEEP_TIME=${SLEEP_TIME:-21600}

    while true; do
        DATE=$(date)
        echo "Starting zap2xml at: $DATE"
        node dist/index.js
        EXIT_CODE=$?
        echo "Application exited with code: $EXIT_CODE"
        echo "Last run time: $DATE"
        echo "Will run in $((SLEEP_TIME / 60)) minutes"
        sleep "$SLEEP_TIME"
    done
else
    echo "Starting zap2xml web server..."
    node dist/index.js
fi
