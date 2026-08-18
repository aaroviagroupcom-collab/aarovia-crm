#!/bin/bash
set -e

cd backend
npm install --legacy-peer-deps
npm run build
npx prisma generate
npx prisma db push --skip-generate --accept-data-loss
npm run prisma:seed
