#!/bin/bash

# AI Agent 基金投资平台 - 部署脚本
# 使用方法: ./scripts/deploy.sh [environment]
# environment: dev | staging | prod (默认: prod)

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
ENVIRONMENT=${1:-prod}
APP_NAME="real-time-fund"
BRANCH="main"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  AI Agent 基金投资平台 - 部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "环境: ${YELLOW}${ENVIRONMENT}${NC}"
echo ""

# 检查环境变量
check_env_vars() {
    echo -e "${YELLOW}检查环境变量...${NC}"
    
    if [ ! -f .env.local ]; then
        echo -e "${RED}错误: .env.local 文件不存在${NC}"
        echo "请复制 .env.local.example 为 .env.local 并配置环境变量"
        exit 1
    fi
    
    source .env.local
    
    if [ -z "$ZHIPU_API_KEY" ]; then
        echo -e "${YELLOW}警告: ZHIPU_API_KEY 未配置${NC}"
        echo "AI 功能将不可用"
    fi
    
    echo -e "${GREEN}✓ 环境变量检查完成${NC}"
}

# 安装依赖
install_dependencies() {
    echo -e "${YELLOW}安装依赖...${NC}"
    npm install
    echo -e "${GREEN}✓ 依赖安装完成${NC}"
}

# 运行测试
run_tests() {
    echo -e "${YELLOW}运行测试...${NC}"
    npm run build || {
        echo -e "${RED}构建失败${NC}"
        exit 1
    }
    echo -e "${GREEN}✓ 测试通过${NC}"
}

# 部署到 Vercel
deploy_vercel() {
    echo -e "${YELLOW}部署到 Vercel...${NC}"
    
    if command -v vercel &> /dev/null; then
        if [ "$ENVIRONMENT" = "prod" ]; then
            vercel --prod
        else
            vercel
        fi
    else
        echo -e "${YELLOW}Vercel CLI 未安装，跳过...${NC}"
    fi
}

# 构建项目
build_project() {
    echo -e "${YELLOW}构建项目...${NC}"
    npm run build
    echo -e "${GREEN}✓ 构建完成${NC}"
}

# 主函数
main() {
    check_env_vars
    install_dependencies
    run_tests
    build_project
    
    if [ "$ENVIRONMENT" = "prod" ] || [ "$ENVIRONMENT" = "staging" ]; then
        deploy_vercel
    fi
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  部署完成！${NC}"
    echo -e "${GREEN}========================================${NC}"
}

# 执行主函数
main
