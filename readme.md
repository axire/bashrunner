# BashRunner

BashRunner is a Node.js application for managing and monitoring bash scripts. It allows users to start, stop, and view the output of bash scripts through a web interface.

## Features

- Start and stop bash scripts from a web interface.
- View the last 10 lines of output from the script.
- Change the script being managed at runtime.
- Log actions and script output.

## Installation

### Prerequisites

- Node.js
- npm (Node.js package manager)

### Steps

1. Clone the repository:
   ```bash
   git clone [your-repository-url]
   cd BashRunner

2. Install dependencies:
   ```bash
   npm install

3. Start the server:

   ```bash
   npm start
   The server will start on http://localhost:3000.

## Usage
Open a web browser and navigate to http://localhost:3000.
Use the web interface to start or stop scripts and view their output.
Setting Up as a System Service


## To run BashRunner as a service on Ubuntu, follow these steps
Create a service file for systemd:

   ```bash
   sudo nano /etc/systemd/system/bashrunner.service


### Add the following content to the service file:

   ```bash
   [Unit]
   Description=BashRunner service
   After=network.target

   [Service]
   ExecStart=/usr/bin/node /path/to/BashRunner/app.js
   Restart=on-failure
   User=<your-username>
   Group=<your-group>
   Environment=NODE_ENV=production
   WorkingDirectory=/path/to/BashRunner

   [Install]
   WantedBy=multi-user.target

Replace /path/to/BashRunner with the actual path to your BashRunner directory. Set <your-username> and <your-group> to your preferred user and group.

### Enable and start the service:

bash
sudo systemctl enable bashrunner.service
sudo systemctl start bashrunner.service

### Check the status of the service:

bash
sudo systemctl status bashrunner.service
BashRunner will now start automatically at boot.

## Contributing
Contributions to BashRunner are welcome. Please ensure your pull requests are well-described.