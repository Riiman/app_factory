# Deployment Guide for Turning Idea App on AWS EC2

This guide outlines the steps to deploy the Turning Idea application (Flask Backend + React Frontend) on an Ubuntu EC2 instance.

## Prerequisites

1.  **AWS Account**: Access to AWS Console.
2.  **Domain Name** (Optional but recommended): For SSL/HTTPS.
3.  **SSH Key Pair**: To access the EC2 instance.

## Step 1: Launch EC2 Instance

1.  Go to AWS EC2 Dashboard and click **Launch Instance**.
2.  **Name**: `turning-idea-server`
3.  **OS Image**: Ubuntu Server 22.04 LTS (HVM), SSD Volume Type.
4.  **Instance Type**: `t2.small` or `t2.medium` (recommended for build processes).
5.  **Key Pair**: Select an existing key pair or create a new one.
6.  **Network Settings**:
    *   Allow SSH traffic from your IP (or Anywhere).
    *   Allow HTTP traffic from the internet.
    *   Allow HTTPS traffic from the internet.
7.  **Storage**: 20GB+ gp3.
8.  Click **Launch Instance**.

## Step 2: Connect to Server

```bash
chmod 400 your-key.pem
ssh -i "your-key.pem" ubuntu@your-ec2-public-ip
```

## Step 3: System Setup & Dependencies

Update system and install required packages:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv python3-dev libpq-dev postgresql postgresql-contrib nginx git curl build-essential
```

Install Node.js (v18 or v20):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Install Redis (for Celery/SocketIO):

```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

## Step 4: Clone Repository

```bash
cd /home/ubuntu
git clone <YOUR_REPO_URL> app_factory
cd app_factory
```

*(Note: You may need to set up SSH keys or use a Personal Access Token for git clone)*

## Step 5: Backend Setup

1.  **Create Virtual Environment**:
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

2.  **Install Python Dependencies**:
    ```bash
    pip install -r requirements.txt
    pip install gunicorn
    ```

3.  **Environment Variables**:
    Create a `.env` file based on `.env.example`.
    ```bash
    cp .env.example .env
    nano .env
    ```
    *   Update `DATABASE_URL` if using PostgreSQL (recommended for production) or keep SQLite.
    *   Set `FLASK_ENV=production`.
    *   Set `FLASK_DEBUG=False`.
    *   Update `CORS_ORIGINS` to include your EC2 IP or domain (e.g., `http://localhost:3000,http://YOUR_EC2_IP`).
    *   Ensure `FIREBASE_SERVICE_ACCOUNT_PATH` points to your uploaded JSON key.

4.  **Initialize Database**:
    ```bash
    flask db upgrade
    # Or if first time:
    # flask db init
    # flask db migrate
    # flask db upgrade
    ```

## Step 6: Frontend Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Build React App**:
    ```bash
    # IMPORTANT: Set the API URL to your EC2 IP/Domain
    VITE_API_BASE_URL=http://13.62.213.147/api npm run build
    ```
    This will create a `dist` directory with static files.

## Step 7: Configure Gunicorn (Systemd)

Create a systemd service file to keep the backend running.

```bash
sudo nano /etc/systemd/system/turningidea.service
```

Paste the following (adjust paths if needed):

```ini
[Unit]
Description=Gunicorn instance to serve Turning Idea App
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/home/ubuntu/app_factory
Environment="PATH=/home/ubuntu/app_factory/venv/bin"
ExecStart=/home/ubuntu/app_factory/venv/bin/gunicorn --worker-class eventlet -w 1 --bind unix:turningidea.sock run:app

[Install]
WantedBy=multi-user.target
```

Start and enable the service:

```bash
sudo systemctl start turningidea
sudo systemctl enable turningidea
sudo systemctl status turningidea
```

## Step 8: Configure Nginx

Create an Nginx server block.

```bash
sudo nano /etc/nginx/sites-available/turningidea
```

Paste the following:

```nginx
server {
    listen 80;
    server_name your-domain.com OR-YOUR-PUBLIC-IP;

    location / {
        root /home/ubuntu/app_factory/frontend/dist;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        include proxy_params;
        proxy_pass http://unix:/home/ubuntu/app_factory/turningidea.sock;
    }

    location /socket.io {
        include proxy_params;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_pass http://unix:/home/ubuntu/app_factory/turningidea.sock;
    }

    location /ws {
        include proxy_params;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_pass http://unix:/home/ubuntu/app_factory/turningidea.sock;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/turningidea /etc/nginx/sites-enabled
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

## Step 9: SSL (Optional but Recommended)

If you have a domain name pointed to your EC2 IP:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Step 10: Firebase Configuration

Since you are deploying to a new domain/IP, you must authorize it in Firebase.

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Select your project.
3.  Navigate to **Authentication** > **Settings** > **Authorized domains**.
4.  Click **Add domain**.
5.  Enter your EC2 Public IP or your custom domain (e.g., `your-domain.com`).

## Troubleshooting

*   **Check Backend Logs**: `sudo journalctl -u turningidea -f`
*   **Check Nginx Logs**: `sudo tail -f /var/log/nginx/error.log`
*   **Docker Error**: If you see `Error while fetching server API version: Not supported URL scheme http+docker`, ensure you have `docker>=7.1.0` installed. Run `pip install --upgrade docker`.
*   **Permissions**: Ensure `www-data` user can access the directory if needed (usually default ubuntu user is fine for socket).
