#!/bin/bash

cd node

docker pull nginx
docker network create RateLimiting

docker build -t app:1.0.0 .

docker run -d --name app --network RateLimiting app:1.0.0

cd ..

docker run -d --name nginx --network RateLimiting -p 8080:80 -v .\nginx\default.conf:/etc/nginx/conf.d/default.conf nginx:latest

start /wait artillery run artillery/test.yaml

docker stop -t0 app nginx
docker rm app nginx

pause
