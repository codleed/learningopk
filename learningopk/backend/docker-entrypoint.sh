#!/bin/sh
set -e

echo "Starting LearningoPK backend..."
exec node dist/src/server.js
