@echo off
REM ArtisanConnect - Quick Start Script

IF "%1"=="help" (
    echo ArtisanConnect Phase 1 - Quick Start Commands
    echo.
    echo Usage:
    echo   start-phase1.cmd setup      - Setup initial (Docker + npm install^)
    echo   start-phase1.cmd db         - Start database only
    echo   start-phase1.cmd dev        - Start backend + frontend
    echo   start-phase1.cmd backend    - Start backend only
    echo   start-phase1.cmd frontend   - Start frontend only
    echo   start-phase1.cmd stop       - Stop database
    echo   start-phase1.cmd help       - Show this help
    echo.
    goto :eof
)

IF "%1"=="setup" (
    echo [1/4] Starting PostgreSQL...
    docker-compose up -d
    echo [2/4] Installing backend dependencies...
    cd backend
    npm install
    cd ..
    echo [3/4] Installing frontend dependencies...
    cd frontend
    npm install
    cd ..
    echo [4/4] Setup complete!
    echo.
    echo Next steps:
    echo   - Backend: start-phase1.cmd backend
    echo   - Frontend: start-phase1.cmd frontend
    goto :eof
)

IF "%1"=="db" (
    echo Starting PostgreSQL and Adminer...
    docker-compose up
    goto :eof
)

IF "%1"=="dev" (
    echo Starting backend + frontend...
    echo.
    echo Backend: http://localhost:3001
    echo Frontend: http://localhost:3000
    echo Database UI: http://localhost:8080
    echo.
    start cmd /k "cd backend && npm run start:dev"
    start cmd /k "cd frontend && npm run dev"
    goto :eof
)

IF "%1"=="backend" (
    echo Starting backend...
    echo API: http://localhost:3001
    cd backend
    npm run start:dev
    goto :eof
)

IF "%1"=="frontend" (
    echo Starting frontend...
    echo URL: http://localhost:3000
    cd frontend
    npm run dev
    goto :eof
)

IF "%1"=="stop" (
    echo Stopping database...
    docker-compose down
    goto :eof
)

echo ArtisanConnect Phase 1 - Quick Start
echo.
echo Usage: start-phase1.cmd [command]
echo.
echo Commands:
echo   setup      - Setup initial (Docker + npm install^)
echo   db         - Start database only
echo   dev        - Start backend + frontend
echo   backend    - Start backend only
echo   frontend   - Start frontend only
echo   stop       - Stop database
echo   help       - Show help
echo.
echo Example: start-phase1.cmd dev
