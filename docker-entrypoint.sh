#!/bin/sh
set -e

echo "Running database migrations..."
./node_modules/.bin/prisma db push

echo "Starting NF CRM application..."
exec node server.js

