from fastapi import APIRouter

from app.api.routes import auth as auth_routes
from app.api.routes import health as health_routes

api_router = APIRouter()
api_router.include_router(auth_routes.router)
api_router.include_router(health_routes.router)
