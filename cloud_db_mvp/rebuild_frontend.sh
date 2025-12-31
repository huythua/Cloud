#!/bin/bash

set -e

echo "=========================================="
echo "Cleanup và Rebuild Frontend"
echo "=========================================="

echo ""
echo "1. Kiểm tra dung lượng disk..."
df -h / | tail -1

echo ""
echo "2. Xóa containers đã dừng..."
docker container prune -f

echo ""
echo "3. Xóa volumes không sử dụng..."
docker volume prune -f

echo ""
echo "4. Xóa images không sử dụng..."
docker image prune -f

echo ""
echo "5. Xóa build cache..."
docker builder prune -f

echo ""
echo "6. Kiểm tra dung lượng sau cleanup..."
df -h / | tail -1

echo ""
echo "7. Dừng frontend..."
cd /home/tada/cloud/Cloud/cloud_db_mvp
docker compose stop frontend || true

echo ""
echo "8. Rebuild frontend..."
docker compose build frontend

echo ""
echo "9. Khởi động frontend..."
docker compose up -d frontend

echo ""
echo "10. Kiểm tra trạng thái..."
sleep 3
docker compose ps frontend

echo ""
echo "=========================================="
echo "Hoàn thành! Frontend đã được rebuild."
echo "=========================================="

