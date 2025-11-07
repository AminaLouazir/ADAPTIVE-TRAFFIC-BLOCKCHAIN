#!/bin/bash
# Adaptive Traffic Blockchain - Automated Setup Script
# Run this script to set up the complete development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Adaptive Traffic Blockchain - Setup Script           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check if running on Linux/WSL
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    print_error "This script requires Linux or WSL2"
    exit 1
fi

# 1. Check Prerequisites
echo -e "\n${YELLOW}Step 1: Checking Prerequisites...${NC}"

command -v docker >/dev/null 2>&1 || { print_error "Docker not found. Please install Docker first."; exit 1; }
print_status "Docker found: $(docker --version)"

command -v docker-compose >/dev/null 2>&1 || { print_error "Docker Compose not found."; exit 1; }
print_status "Docker Compose found: $(docker-compose --version)"

command -v curl >/dev/null 2>&1 || { print_error "curl not found. Install: sudo apt install curl"; exit 1; }
print_status "curl found"

command -v python3 >/dev/null 2>&1 || { print_warning "Python3 not found. Simulator may not work."; }
print_status "Python3 found: $(python3 --version)"

# 2. Install Hyperledger Fabric Binaries
echo -e "\n${YELLOW}Step 2: Installing Hyperledger Fabric...${NC}"

if [ ! -d "$HOME/fabric-samples" ]; then
    print_status "Downloading Fabric samples and binaries..."
    cd $HOME
    curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh
    chmod +x install-fabric.sh
    ./install-fabric.sh --fabric-version 2.5.12 binary samples
    rm install-fabric.sh
    
    # Add to PATH
    if ! grep -q "fabric-samples/bin" ~/.bashrc; then
        echo 'export PATH=$PATH:$HOME/fabric-samples/bin' >> ~/.bashrc
        print_status "Added Fabric binaries to PATH"
    fi
else
    print_status "Fabric samples already installed at ~/fabric-samples"
fi

# Export PATH for current session
export PATH=$PATH:$HOME/fabric-samples/bin

# Verify Fabric installation
if command -v peer >/dev/null 2>&1; then
    print_status "Fabric binaries installed: $(peer version | grep Version | head -1)"
elif [ -f "$HOME/fabric-samples/bin/peer" ]; then
    print_status "Fabric binaries found at ~/fabric-samples/bin/"
    print_warning "Binaries loaded for this session. They will be available in new terminals."
else
    print_error "Fabric binaries not found. Installation may have failed."
    exit 1
fi

# 3. Pull Docker Images
echo -e "\n${YELLOW}Step 3: Verifying Docker Images...${NC}"

if docker images | grep -q "hyperledger/fabric-peer.*2.5"; then
    print_status "Hyperledger Fabric Docker images found"
else
    print_warning "Some Docker images may be missing. Run: docker pull hyperledger/fabric-peer:2.5"
fi

# 4. Install Python Dependencies
echo -e "\n${YELLOW}Step 4: Installing Python Dependencies...${NC}"

if [ -f "requirements.txt" ]; then
    python3 -m pip install --user -r requirements.txt
    print_status "Python dependencies installed"
else
    print_warning "requirements.txt not found. Skipping Python dependencies."
fi

# 5. Install Node.js Dependencies (if applicable)
echo -e "\n${YELLOW}Step 5: Installing Node.js Dependencies...${NC}"

for dir in visualization simulator; do
    if [ -f "$dir/package.json" ]; then
        print_status "Installing npm packages in $dir..."
        (cd "$dir" && npm install)
    fi
done

# 6. Create necessary directories
echo -e "\n${YELLOW}Step 6: Setting Up Project Structure...${NC}"

mkdir -p network/channel-artifacts
mkdir -p network/crypto-config
mkdir -p network/scripts
mkdir -p chaincode/traffic-light
mkdir -p simulator/data
mkdir -p visualization/public
mkdir -p logs

print_status "Project directories created"

# 7. Make scripts executable
echo -e "\n${YELLOW}Step 7: Setting Script Permissions...${NC}"

chmod +x network/*.sh 2>/dev/null || true
chmod +x simulator/*.sh 2>/dev/null || true
chmod +x *.sh 2>/dev/null || true

print_status "Scripts made executable"

# 8. Summary
echo -e "\n${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Setup Complete! ✓                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Reload environment: ${GREEN}source ~/.bashrc${NC} (or open new terminal)"
echo "2. Verify installation: ${GREEN}peer version${NC}"
echo "3. Generate network artifacts: ${GREEN}cd network && ./generate-artifacts.sh${NC}"
echo "4. Start the network: ${GREEN}./network-up.sh${NC}"
echo "5. Deploy chaincode: ${GREEN}./deploy-chaincode.sh${NC}"
echo "6. Start services: ${GREEN}cd .. && docker-compose up -d${NC}"
echo ""
echo -e "${YELLOW}Documentation:${NC} Read README.md for detailed instructions"
echo -e "${YELLOW}Troubleshooting:${NC} Check logs/ directory for error logs"
echo ""