#!/bin/bash

# Install Python and dependencies
sudo yum update -y
sudo yum install -y python3 python3-pip git

# Clone your project (you'll need to push to GitHub first)
# git clone https://github.com/yourusername/doctor-smart-storage.git
# cd doctor-smart-storage

# Install Python dependencies
pip3 install -r requirements.txt

# Create systemd service
sudo tee /etc/systemd/system/doctor-app.service > /dev/null <<EOF
[Unit]
Description=Doctor Smart Storage API
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/doctor-smart-storage/backend
ExecStart=/usr/local/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Start the service
sudo systemctl daemon-reload
sudo systemctl enable doctor-app
sudo systemctl start doctor-app

echo "Deployment complete! App running on port 8000"
