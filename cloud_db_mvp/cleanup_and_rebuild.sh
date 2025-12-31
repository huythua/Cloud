#!/bin/bash

echo "=== Kiểm tra dung lượng disk ==="
df -h / | tail -1

echo ""
echo "=== Kiểm tra Docker disk usage ==="
docker system df

echo ""
echo "=== Xóa containers đã dừng ==="
docker container prune -f

echo ""
echo "=== Xóa volumes không sử dụng ==="
docker volume prune -f

echo ""
echo "=== Xóa images không sử dụng ==="
docker image prune -f

echo ""
echo "=== Xóa build cache ==="
docker builder prune -f

echo ""
echo "=== Kiểm tra dung lượng sau khi cleanup ==="
df -h / | tail -1
docker system df

echo ""
echo "=== Rebuild frontend ==="
cd /home/tada/cloud/Cloud/cloud_db_mvp
docker compose build frontend

echo ""
echo "=== Khởi động frontend ==="
docker compose up -d frontend

echo ""
echo "=== Kiểm tra trạng thái ==="
docker compose ps frontend

echo ""
echo "=== Hoàn thành! ==="

