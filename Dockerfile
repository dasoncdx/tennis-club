# ===== 构建阶段：编译前端 =====
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npx vite build

# ===== 运行阶段：FastAPI 后端 + 前端静态文件 =====
FROM python:3.11-slim
WORKDIR /app

# 安装 Python 依赖
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY backend/ .

# 复制前端构建产物
COPY --from=frontend-builder /frontend/dist/ /frontend/dist/

# Zeabur 持久化卷挂载点
ENV DATA_DIR=/data
RUN mkdir -p /data

# Zeabur 默认端口 8080，可通过 PORT 环境变量覆盖
EXPOSE 8080

CMD ["sh", "-c", "echo \"Starting on port ${PORT:-8080}\" && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
