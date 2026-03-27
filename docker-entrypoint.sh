#!/bin/sh
set -e

# Apply any pending database migrations before starting the server
npx prisma migrate deploy

exec node server.js
