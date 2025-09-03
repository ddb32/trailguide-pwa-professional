#!/bin/bash
set -euo pipefail  # Exit on error, undefined vars, pipe failures

# =============================================================================
# TrailGuide PWA - Linux Development Environment Setup Script
# =============================================================================
# This script installs only system-level dependencies that require sudo privileges.
# It prepares the environment for Docker-first development workflow.
#
# Supported Systems: Ubuntu 18.04+, Debian 10+, CentOS 7+, RHEL 8+
# Usage: sudo ./setup-dev-environment.sh
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Error handling
error_exit() {
    log_error "$1"
    exit 1
}

# Cleanup function for error handling
cleanup_on_error() {
    log_warning "Script interrupted. Performing cleanup if necessary..."
    # Add any cleanup operations here if needed
}

# Set trap for cleanup on script interruption
trap cleanup_on_error EXIT

# =============================================================================
# Pre-flight Checks
# =============================================================================

check_root() {
    if [[ $EUID -ne 0 ]]; then
        error_exit "This script must be run as root (use sudo)"
    fi
}

detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
        DISTRO=$ID
    else
        error_exit "Cannot detect OS. Unsupported system."
    fi
    
    log_info "Detected OS: $OS $VER"
    
    # Set package manager based on distro
    case $DISTRO in
        ubuntu|debian)
            PKG_MANAGER="apt"
            PKG_UPDATE="apt update"
            PKG_INSTALL="apt install -y"
            ;;
        centos|rhel|fedora)
            PKG_MANAGER="yum"
            PKG_UPDATE="yum update -y"
            PKG_INSTALL="yum install -y"
            # Use dnf on newer systems
            if command -v dnf &> /dev/null; then
                PKG_MANAGER="dnf"
                PKG_UPDATE="dnf update -y"
                PKG_INSTALL="dnf install -y"
            fi
            ;;
        *)
            error_exit "Unsupported distribution: $DISTRO"
            ;;
    esac
}

check_internet_connection() {
    log_info "Checking internet connectivity..."
    if ! curl -s --head --request GET https://google.com | grep "200 OK" > /dev/null; then
        error_exit "Internet connection required for installation"
    fi
    log_success "Internet connection verified"
}

# =============================================================================
# Main Installation Functions
# =============================================================================

update_system_packages() {
    log_info "Updating system packages..."
    
    case $PKG_MANAGER in
        apt)
            export DEBIAN_FRONTEND=noninteractive
            $PKG_UPDATE || error_exit "Failed to update package list"
            $PKG_INSTALL curl wget gnupg lsb-release ca-certificates || error_exit "Failed to install basic packages"
            ;;
        yum|dnf)
            $PKG_UPDATE || error_exit "Failed to update packages"
            $PKG_INSTALL curl wget gnupg ca-certificates || error_exit "Failed to install basic packages"
            ;;
    esac
    
    log_success "System packages updated"
}

install_docker() {
    log_info "Installing Docker Engine..."
    
    # Check if Docker is already installed
    if command -v docker &> /dev/null; then
        local docker_version=$(docker --version | cut -d" " -f3 | cut -d"," -f1)
        log_warning "Docker already installed (version: $docker_version)"
        
        # Verify Docker is working
        if systemctl is-active --quiet docker; then
            log_success "Docker service is running"
            return 0
        fi
    fi
    
    # Install Docker based on distribution
    case $PKG_MANAGER in
        apt)
            # Remove old versions (idempotent)
            apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
            
            # Add Docker's official GPG key
            curl -fsSL https://download.docker.com/linux/$DISTRO/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
            
            # Add Docker repository
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/$DISTRO $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
            
            # Update package index
            apt update
            
            # Install Docker Engine
            $PKG_INSTALL docker-ce docker-ce-cli containerd.io docker-compose-plugin
            ;;
            
        yum|dnf)
            # Add Docker repository
            $PKG_INSTALL yum-utils
            yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            
            # Install Docker Engine
            $PKG_INSTALL docker-ce docker-ce-cli containerd.io docker-compose-plugin
            ;;
    esac
    
    # Enable and start Docker service
    systemctl enable docker
    systemctl start docker
    
    # Verify installation
    if ! docker --version &> /dev/null; then
        error_exit "Docker installation failed"
    fi
    
    log_success "Docker Engine installed successfully"
}

install_docker_compose() {
    log_info "Installing Docker Compose..."
    
    # Check if docker-compose is already installed
    if command -v docker-compose &> /dev/null; then
        local compose_version=$(docker-compose --version | cut -d" " -f4 | cut -d"," -f1)
        log_warning "Docker Compose already installed (version: $compose_version)"
        return 0
    fi
    
    # Install Docker Compose V2 (recommended)
    local compose_version="v2.24.5"
    local compose_url="https://github.com/docker/compose/releases/download/${compose_version}/docker-compose-$(uname -s)-$(uname -m)"
    
    # Download Docker Compose binary
    curl -L "$compose_url" -o /usr/local/bin/docker-compose
    
    # Make it executable
    chmod +x /usr/local/bin/docker-compose
    
    # Create symlink for compatibility
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    # Verify installation
    if ! docker-compose --version &> /dev/null; then
        error_exit "Docker Compose installation failed"
    fi
    
    log_success "Docker Compose installed successfully"
}

install_development_tools() {
    log_info "Installing essential development tools..."
    
    case $PKG_MANAGER in
        apt)
            $PKG_INSTALL \
                git \
                build-essential \
                python3 \
                python3-pip \
                jq \
                tree \
                htop \
                unzip \
                software-properties-common \
                apt-transport-https
            ;;
        yum|dnf)
            $PKG_INSTALL \
                git \
                gcc \
                gcc-c++ \
                make \
                python3 \
                python3-pip \
                jq \
                tree \
                htop \
                unzip \
                which
            ;;
    esac
    
    log_success "Development tools installed"
}

install_hebrew_support() {
    log_info "Installing Hebrew language and font support for RTL testing..."
    
    case $PKG_MANAGER in
        apt)
            # Install Hebrew locale
            $PKG_INSTALL locales
            
            # Generate Hebrew locale if not already present
            if ! locale -a | grep -q "he_IL"; then
                echo "he_IL.UTF-8 UTF-8" >> /etc/locale.gen
                locale-gen
            fi
            
            # Install Hebrew fonts
            $PKG_INSTALL \
                fonts-dejavu \
                fonts-liberation \
                fonts-noto \
                fonts-noto-cjk \
                fonts-noto-color-emoji \
                language-pack-he
            ;;
        yum|dnf)
            # Install langpacks for Hebrew
            $PKG_INSTALL \
                glibc-langpack-he \
                dejavu-fonts-common \
                dejavu-sans-fonts \
                liberation-fonts \
                google-noto-fonts-common \
                google-noto-sans-fonts
            ;;
    esac
    
    log_success "Hebrew language support installed"
}

configure_user_permissions() {
    log_info "Configuring user permissions for Docker..."
    
    # Get the user who invoked sudo
    local real_user="${SUDO_USER:-$USER}"
    
    if [[ -z "$real_user" || "$real_user" == "root" ]]; then
        log_warning "Cannot determine non-root user. Skipping user permission setup."
        log_warning "Please manually add your user to docker group: sudo usermod -aG docker \$USER"
        return 0
    fi
    
    # Add user to docker group
    if ! groups "$real_user" | grep -q docker; then
        usermod -aG docker "$real_user"
        log_success "User '$real_user' added to docker group"
        log_warning "Please log out and log back in (or restart terminal) for group changes to take effect"
    else
        log_success "User '$real_user' already in docker group"
    fi
}

configure_basic_security() {
    log_info "Configuring basic security settings..."
    
    # Install and configure UFW firewall (Ubuntu/Debian)
    if [[ "$PKG_MANAGER" == "apt" ]]; then
        $PKG_INSTALL ufw
        
        # Set default policies
        ufw --force default deny incoming
        ufw --force default allow outgoing
        
        # Allow SSH (be careful not to lock yourself out)
        ufw allow ssh
        
        # Allow common development ports
        ufw allow 3000/tcp   # API server
        ufw allow 5173/tcp   # Vite dev server
        ufw allow 8080/tcp   # Nginx proxy
        
        # Enable firewall (only if not already enabled)
        if ! ufw status | grep -q "Status: active"; then
            ufw --force enable
        fi
        
        log_success "UFW firewall configured"
    fi
    
    # Set up basic fail2ban for SSH protection
    if [[ "$PKG_MANAGER" == "apt" ]]; then
        $PKG_INSTALL fail2ban
        systemctl enable fail2ban
        systemctl start fail2ban
        log_success "Fail2ban installed and configured"
    fi
}

create_development_directories() {
    log_info "Creating development directory structure..."
    
    local real_user="${SUDO_USER:-$USER}"
    local home_dir="/home/$real_user"
    
    if [[ "$real_user" == "root" ]]; then
        home_dir="/root"
    fi
    
    # Create directories with proper permissions
    local dirs=(
        "$home_dir/dev"
        "$home_dir/dev/trailguide"
        "/opt/trailguide"
    )
    
    for dir in "${dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            
            # Set ownership to the real user (not root)
            if [[ "$real_user" != "root" ]]; then
                chown "$real_user:$real_user" "$dir"
            fi
            
            log_success "Created directory: $dir"
        else
            log_success "Directory already exists: $dir"
        fi
    done
}

# =============================================================================
# Verification Functions
# =============================================================================

verify_installations() {
    log_info "Verifying installations..."
    
    local errors=0
    
    # Check Docker
    if docker --version &> /dev/null && systemctl is-active --quiet docker; then
        local docker_version=$(docker --version | cut -d" " -f3 | cut -d"," -f1)
        log_success "Docker Engine: $docker_version (service running)"
    else
        log_error "Docker installation verification failed"
        ((errors++))
    fi
    
    # Check Docker Compose
    if docker-compose --version &> /dev/null; then
        local compose_version=$(docker-compose --version | cut -d" " -f4 | cut -d"," -f1)
        log_success "Docker Compose: $compose_version"
    else
        log_error "Docker Compose installation verification failed"
        ((errors++))
    fi
    
    # Check Git
    if git --version &> /dev/null; then
        local git_version=$(git --version | cut -d" " -f3)
        log_success "Git: $git_version"
    else
        log_error "Git installation verification failed"
        ((errors++))
    fi
    
    # Check Hebrew locale support
    if locale -a | grep -q "he_IL"; then
        log_success "Hebrew locale support: Available"
    else
        log_warning "Hebrew locale support: Not fully configured"
    fi
    
    # Test Docker functionality (basic test)
    if docker run --rm hello-world &> /dev/null; then
        log_success "Docker functionality: Working"
    else
        log_warning "Docker functionality: Cannot test (may require logout/login for group changes)"
    fi
    
    return $errors
}

display_post_installation_info() {
    log_info "=== Post-Installation Information ==="
    echo
    log_success "TrailGuide PWA development environment setup completed!"
    echo
    echo "Next Steps:"
    echo "1. Log out and log back in (or restart terminal) for Docker group changes"
    echo "2. Clone the TrailGuide repository:"
    echo "   git clone https://github.com/your-org/trailguide-pwa.git"
    echo "3. Navigate to project directory and set up environment:"
    echo "   cd trailguide-pwa"
    echo "   cp .env.example .env.development"
    echo "4. Start the development environment:"
    echo "   docker-compose up -d"
    echo
    echo "Installed Components:"
    echo "• Docker Engine (containerization platform)"
    echo "• Docker Compose (multi-container orchestration)"
    echo "• Git (version control)"
    echo "• Essential build tools"
    echo "• Hebrew language support (for RTL testing)"
    echo "• Basic security configuration (UFW firewall, fail2ban)"
    echo
    echo "Development directories created:"
    echo "• ~/dev (user development workspace)"
    echo "• ~/dev/trailguide (project workspace)"
    echo "• /opt/trailguide (system-wide deployment directory)"
    echo
    log_warning "IMPORTANT: You must log out and log back in for Docker permissions to take effect!"
    echo
}

# =============================================================================
# Main Script Execution
# =============================================================================

main() {
    log_info "Starting TrailGuide PWA development environment setup..."
    echo
    
    # Pre-flight checks
    check_root
    detect_os
    check_internet_connection
    
    echo
    log_info "=== Beginning Installation ==="
    
    # Main installation sequence
    update_system_packages
    install_docker
    install_docker_compose
    install_development_tools
    install_hebrew_support
    configure_user_permissions
    configure_basic_security
    create_development_directories
    
    echo
    log_info "=== Verifying Installation ==="
    
    # Verification
    if ! verify_installations; then
        log_error "Some installations failed verification. Please check the logs above."
        exit 1
    fi
    
    echo
    display_post_installation_info
    
    # Disable error trap on successful completion
    trap - EXIT
    
    log_success "Setup completed successfully!"
}

# Execute main function
main "$@"