#!/bin/bash
# Quick Setup & Deployment Script
# Smart Traffic & Parking Management - ML Models Integration

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Smart Traffic ML Models - Quick Setup${NC}\n"

# Check system requirements
echo -e "${YELLOW}📋 Checking system requirements...${NC}"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 not found. Please install Python 3.8+${NC}"
    exit 1
fi
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo -e "${GREEN}✅ Python $PYTHON_VERSION found${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js v18+${NC}"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js $NODE_VERSION found${NC}"

# Check MongoDB
if ! command -v mongod &> /dev/null; then
    echo -e "${YELLOW}⚠️  MongoDB not found. Using MongoDB Atlas for cloud deployment.${NC}"
    echo -e "${YELLOW}   Or install MongoDB locally: https://docs.mongodb.com/manual/installation/${NC}"
fi

# Check FFmpeg (required for video processing)
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${YELLOW}⚠️  FFmpeg not found. Video processing will be disabled.${NC}"
    echo -e "${YELLOW}   Install FFmpeg: ${NC}"
    echo -e "${YELLOW}   Windows: choco install ffmpeg${NC}"
    echo -e "${YELLOW}   Mac: brew install ffmpeg${NC}"
    echo -e "${YELLOW}   Linux: sudo apt-get install ffmpeg${NC}"
fi

echo -e "\n${YELLOW}📁 Setting up Python ML Backend...${NC}"

# Create virtual environment
if [ ! -d "ml_env" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv ml_env
    echo -e "${GREEN}✅ Virtual environment created${NC}"
fi

# Activate virtual environment
source ml_env/bin/activate 2>/dev/null || . ml_env/Scripts/activate 2>/dev/null
echo -e "${GREEN}✅ Virtual environment activated${NC}"

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -q --upgrade pip setuptools wheel
pip install -q -r ml_requirements.txt
echo -e "${GREEN}✅ Python dependencies installed${NC}"

# Setup Node Backend
echo -e "\n${YELLOW}📦 Setting up Node Backend...${NC}"
cd backend

if [ ! -d "node_modules" ]; then
    echo "Installing Node dependencies..."
    npm install -q
    echo -e "${GREEN}✅ Node dependencies installed${NC}"
fi

# Create .env file if doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp ../. env.production.example .env
    echo -e "${GREEN}✅ .env file created. Please update with your values${NC}"
fi

cd ..

# Setup Frontend
echo -e "\n${YELLOW}🎨 Setting up Frontend...${NC}"
cd frontend

if [ ! -d "node_modules" ]; then
    echo "Installing Frontend dependencies..."
    npm install -q
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
fi

cd ..

# Create startup scripts
echo -e "\n${YELLOW}🔧 Creating startup scripts...${NC}"

# Python startup script
cat > start_ml_backend.sh << 'EOF'
#!/bin/bash
source ml_env/bin/activate 2>/dev/null || . ml_env/Scripts/activate
echo "🚀 Starting Python ML Backend on port 8000..."
python ml_backend_api.py
EOF
chmod +x start_ml_backend.sh
echo -e "${GREEN}✅ Created start_ml_backend.sh${NC}"

# Node startup script
cat > start_backend.sh << 'EOF'
#!/bin/bash
cd backend
echo "🚀 Starting Node Backend on port 5000..."
npm start
EOF
chmod +x start_backend.sh
echo -e "${GREEN}✅ Created start_backend.sh${NC}"

# Frontend startup script
cat > start_frontend.sh << 'EOF'
#!/bin/bash
cd frontend
echo "🎨 Starting React Frontend on port 5173..."
npm run dev
EOF
chmod +x start_frontend.sh
echo -e "${GREEN}✅ Created start_frontend.sh${NC}"

# Complete startup script
cat > start_all.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting entire Smart Traffic System..."
echo "This will start 3 services. Open 3 terminals for each:"
echo ""
echo "Terminal 1:"
echo "  ./start_ml_backend.sh"
echo ""
echo "Terminal 2:"
echo "  ./start_backend.sh"
echo ""
echo "Terminal 3:"
echo "  ./start_frontend.sh"
echo ""
echo "Then navigate to http://localhost:5173 in your browser"
EOF
chmod +x start_all.sh
echo -e "${GREEN}✅ Created start_all.sh${NC}"

# Final checklist
echo -e "\n${GREEN}=====================================${NC}"
echo -e "${GREEN}✅ SETUP COMPLETE!${NC}"
echo -e "${GREEN}=====================================${NC}"

echo -e "\n${YELLOW}📋 QUICK START INSTRUCTIONS:${NC}"
echo ""
echo "1. Open 3 terminals and run these commands in each:"
echo ""
echo "   ${YELLOW}Terminal 1 (Python ML Backend):${NC}"
echo "   ./start_ml_backend.sh"
echo ""
echo "   ${YELLOW}Terminal 2 (Node.js Backend):${NC}"
echo "   ./start_backend.sh"
echo ""
echo "   ${YELLOW}Terminal 3 (React Frontend):${NC}"
echo "   ./start_frontend.sh"
echo ""
echo "2. Once all are running, open your browser:"
echo "   ${GREEN}http://localhost:5173${NC}"
echo ""
echo "3. Login with:"
echo "   ${YELLOW}Email:${NC} admin@traffic.local"
echo "   ${YELLOW}Password:${NC} Admin@123"
echo ""

echo -e "\n${YELLOW}📖 QUICK REFERENCE:${NC}"
echo "   Python ML API:     http://localhost:8000"
echo "   Node Backend API:  http://localhost:5000"
echo "   React Dashboard:   http://localhost:5173"
echo "   Health Check:      curl http://localhost:8000/health"
echo ""

echo -e "\n${YELLOW}⚙️  CONFIGURATION:${NC}"
echo "   Edit backend/.env to configure:"
echo "   - ML_BACKEND_URL (update if ML runs on different port)"
echo "   - MONGODB_URI (configure your database)"
echo "   - Other settings as needed"
echo ""

echo -e "\n${YELLOW}🧪 TESTING:${NC}"
echo "   1. Go to Admin Dashboard > ML Detection tab"
echo "   2. Upload a test image or video"
echo "   3. View real detection results"
echo "   4. Check violations in Recent Violations tab"
echo ""

echo -e "\n${YELLOW}📚 DOCUMENTATION:${NC}"
echo "   Full deployment guide: DEPLOYMENT_GUIDE_ML_MODELS.md"
echo ""

echo -e "${GREEN}Ready to deploy! 🚀${NC}\n"
