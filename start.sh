#!/bin/sh

# 设置 Node.js crypto 全局变量的启动脚本
export NODE_OPTIONS="--experimental-global-webcrypto"

# 启动应用
exec node dist/src/main.js