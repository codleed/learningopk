#!/bin/sh
set -e

echo "Starting LearningoPK backend..."
exec node dist/server.js
