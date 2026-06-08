import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine, Base
from models import User, UserRole, CoursePackage, Booking, BookingStatus, ClassRecord
from routers import auth, students, courses

# 创建数据库表
Base.metadata.create_all(bind=engine)

app = FastAPI(title="网球俱乐部管理系统", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(students.router)
app.include_router(courses.router)


@app.on_event("startup")
def seed_data():
    """每次启动时重新生成演示数据"""
    from seed_data import run_seed
    run_seed()


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "网球俱乐部管理系统运行中"}


# ========== 生产环境：提供前端静态文件 ==========
# Docker 构建后前端文件在 frontend/dist/ 目录
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(STATIC_DIR):
    # 先挂载静态资源目录
    assets_dir = os.path.join(STATIC_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    from fastapi.responses import FileResponse

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """SPA fallback：所有非 API 路径返回 index.html"""
        index_path = os.path.join(STATIC_DIR, "index.html")
        if os.path.isfile(index_path):
            return FileResponse(index_path)
        return {"detail": "Frontend not built"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
