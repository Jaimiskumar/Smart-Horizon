@echo off
REM Quick Setup & Deployment Script for Windows
REM Smart Traffic & Parking Management - ML Models Integration

setlocal enabledelayedexpansion

echo.
echo ========================================
echo 🚀 Smart Traffic ML Models - Quick Setup
echo ========================================
echo.

REM Check Python
echo Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found. Please install Python 3.8+
    echo    Download from: https://www.python.org/downloads/
    pause
    exit /b 1
)
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo ✅ Python %PYTHON_VERSION% found

REM Check Node.js
echo.
echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found. Please install Node.js v18+
    echo    Download from: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=1" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js %NODE_VERSION% found

REM Check FFmpeg
echo.
echo Checking FFmpeg installation...
ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  FFmpeg not found. Video processing will be disabled.
    echo    Install FFmpeg: choco install ffmpeg
) else (
    echo ✅ FFmpeg found
)

REM Setup Python ML Backend
echo.
echo ========================================
echo 📁 Setting up Python ML Backend...
echo ========================================

if not exist ml_env (
    echo Creating Python virtual environment...
    python -m venv ml_env
    echo ✅ Virtual environment created
)

echo Activating virtual environment...
call ml_env\Scripts\activate.bat
echo ✅ Virtual environment activated

echo Installing Python dependencies...
pip install -q --upgrade pip setuptools wheel
pip install -q -r ml_requirements.txt >nul 2>&1
echo ✅ Python dependencies installed

REM Setup Node Backend
echo.
echo ========================================
echo 📦 Setting up Node Backend...
echo ========================================

cd backend

if not exist node_modules (
    echo Installing Node dependencies...
    call npm install -q
    echo ✅ Node dependencies installed
)

if not exist .env (
    echo Creating .env file...
    copy ..\. env.production.example .env >nul
    echo ✅ .env file created. Please update with your values
)

cd ..

REM Setup Frontend
echo.
echo ========================================
echo 🎨 Setting up Frontend...
echo ========================================

cd frontend

if not exist node_modules (
    echo Installing Frontend dependencies...
    call npm install -q
    echo ✅ Frontend dependencies installed
)

cd ..

REM Create startup batch files
echo.
echo ========================================
echo 🔧 Creating startup scripts...
echo ========================================

REM Python startup script
(
echo @echo off
echo call ml_env\Scripts\activate.bat
echo echo 🚀 Starting Python ML Backend on port 8000...
echo python ml_backend_api.py
) > start_ml_backend.bat
echo ✅ Created start_ml_backend.bat

REM Node startup script
(
echo @echo off
echo cd backend
echo echo 🚀 Starting Node Backend on port 5000...
echo call npm start
) > start_backend.bat
echo ✅ Created start_backend.bat

REM Frontend startup script
(
echo @echo off
echo cd frontend
echo echo 🎨 Starting React Frontend on port 5173...
echo call npm run dev
) > start_frontend.bat
echo ✅ Created start_frontend.bat

REM Comprehensive startup instruction
(
echo @echo off
echo echo 🚀 Smart Traffic System Startup Guide
echo echo.
echo echo Please open 3 separate command prompt windows and run:
echo echo.
echo echo Window 1 - Python ML Backend^(port 8000^):
echo echo   start_ml_backend.bat
echo echo.
echo echo Window 2 - Node.js Backend^(port 5000^):
echo echo   start_backend.bat
echo echo.
echo echo Window 3 - React Frontend^(port 5173^):
echo echo   start_frontend.bat
echo echo.
echo echo Then open browser:
echo echo   http://localhost:5173
echo echo.
echo pause
) > START_HERE.bat
echo ✅ Created START_HERE.bat

REM Print completion message
echo.
echo ========================================
echo ✅ SETUP COMPLETE!
echo ========================================
echo.
echo 📋 QUICK START:
echo.
echo 1. Double-click START_HERE.bat to see instructions
echo.
echo 2. Open 3 Command Prompt windows and run:
echo    - start_ml_backend.bat
echo    - start_backend.bat
echo    - start_frontend.bat
echo.
echo 3. Open browser: http://localhost:5173
echo.
echo 4. Login with:
echo    Email: admin@traffic.local
echo    Password: Admin@123
echo.
echo 📚 For detailed setup guide, see:
echo    DEPLOYMENT_GUIDE_ML_MODELS.md
echo.
echo ✅ Ready to deploy!
echo.
pause
