#!/bin/bash

echo "========================================"
echo "邮件服务器端口连通性测试"
echo "========================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试函数
test_port() {
    local host=$1
    local port=$2
    local name=$3
    
    echo -n "测试 $name ($host:$port) ... "
    
    # 使用 nc 测试,超时 5 秒
    if timeout 5 nc -zv $host $port 2>&1 | grep -q succeeded; then
        echo -e "${GREEN}✓ 成功${NC}"
        return 0
    elif timeout 5 bash -c "echo > /dev/tcp/$host/$port" 2>/dev/null; then
        echo -e "${GREEN}✓ 成功${NC}"
        return 0
    else
        echo -e "${RED}✗ 失败/超时${NC}"
        return 1
    fi
}

# 测试 DNS 解析
test_dns() {
    local host=$1
    local name=$2
    
    echo -n "DNS 解析 $name ($host) ... "
    
    if nslookup $host >/dev/null 2>&1; then
        local ip=$(nslookup $host | grep -A1 "Name:" | grep "Address:" | awk '{print $2}' | head -1)
        echo -e "${GREEN}✓ 成功${NC} (IP: $ip)"
        return 0
    else
        echo -e "${RED}✗ 失败${NC}"
        return 1
    fi
}

echo "1. DNS 解析测试"
echo "----------------------------------------"
test_dns "smtp.qq.com" "QQ邮箱"
test_dns "smtp.163.com" "163邮箱"
echo ""

echo "2. SMTP 端口连通性测试"
echo "----------------------------------------"
test_port "smtp.qq.com" "465" "QQ邮箱 SSL (465)"
test_port "smtp.qq.com" "587" "QQ邮箱 TLS (587)"
test_port "smtp.qq.com" "25" "QQ邮箱 标准 (25)"
echo ""
test_port "smtp.163.com" "465" "163邮箱 SSL (465)"
test_port "smtp.163.com" "587" "163邮箱 TLS (587)"
test_port "smtp.163.com" "25" "163邮箱 标准 (25)"
echo ""

echo "3. 国际邮件服务器测试(对比)"
echo "----------------------------------------"
test_port "smtp.gmail.com" "465" "Gmail SSL (465)"
test_port "smtp.gmail.com" "587" "Gmail TLS (587)"
test_port "smtp.sendgrid.net" "587" "SendGrid TLS (587)"
echo ""

echo "4. 网络延迟测试"
echo "----------------------------------------"
echo -n "Ping smtp.qq.com ... "
ping_result=$(ping -c 3 smtp.qq.com 2>&1 | grep "avg" | awk -F'/' '{print $5}')
if [ -z "$ping_result" ]; then
    echo -e "${RED}失败${NC}"
else
    echo -e "${GREEN}${ping_result}ms${NC}"
fi

echo -n "Ping smtp.163.com ... "
ping_result=$(ping -c 3 smtp.163.com 2>&1 | grep "avg" | awk -F'/' '{print $5}')
if [ -z "$ping_result" ]; then
    echo -e "${RED}失败${NC}"
else
    echo -e "${GREEN}${ping_result}ms${NC}"
fi
echo ""

echo "5. 防火墙规则检查"
echo "----------------------------------------"
if command -v ufw &> /dev/null; then
    echo "UFW 状态:"
    ufw status | grep -E "25|465|587" || echo "未发现 SMTP 端口规则"
else
    echo "未安装 UFW 防火墙"
fi
echo ""

echo "========================================"
echo "测试完成!"
echo "========================================"
echo ""
echo "📋 诊断建议:"
echo "1. 如果所有端口都失败 → 很可能被云服务商封禁"
echo "2. 如果 DNS 解析慢 → 网络延迟问题"
echo "3. 如果只有 25 端口失败 → 正常,大多数云服务商都封此端口"
echo "4. 如果 465/587 失败但 Gmail 成功 → 国内邮箱被限制"
echo ""
