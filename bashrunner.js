// Bashrunner 0.0.1

const { execSync } = require('child_process');
const { spawn } = require('child_process');
const fs = require('fs');
const figlet = require('figlet');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = 3000;
/*
Typically, when you're not using socket.io (or similar WebSocket libraries), your 
Express app can be started simply with app.listen(). But with socket.io, you need 
to pass the HTTP server object to socket.io for it to hook into the same HTTP server 
that Express uses.
*/

const path = require('path');
app.use(express.json());

let scriptProcess = null;
//const scriptName = 'ComfyUI'; // Replace with your script name
//const scriptPath = 'bashrunner_gpu.sh'; // Replace with your script path
let scriptName = 'File writing script'; // Replace with your script name
let scriptPath = './writingtostdout.sh'; // Replace with your script path
let logFilePath = scriptPath + '-bashrunner.log'; // Define log file path
let actionLog = []; // Log of actions

let outputFilePath = scriptPath + '-script-output.log'; // File to store script output



// Function to log action
function logAction(action, pid = '') {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - Script "${scriptName}" ${action} ${pid ? `(PID: ${pid})` : ''}`;
    console.log(logMessage);
    actionLog.push(logMessage); 
    if (actionLog.length > 10) actionLog.shift(); 
    fs.appendFileSync(logFilePath, logMessage + '\n'); // Append to log file
}

// Function to Get Runtime
function getScriptRuntime(pid) {
    if (!pid) return 'Not running';
    try {
        const runtime = execSync(`ps -o etime= -p ${pid}`).toString().trim();
        return runtime;
    } catch (error) {
        console.error('Error fetching script runtime:', error);
        return 'Error';
    }
}


function isValidFile(filePath) {
    try {
        const fullPath = path.resolve(filePath); // Resolve the full path
        const stats = fs.statSync(fullPath); // Get stats of the file
        return stats.isFile(); // Check if the path is a regular file
    } catch (error) {
        console.error('File validation error:', error);
        return false;
    }
}


// Serve web interface
app.get('/', (req, res) => {
    figlet('BashRunner 0.0.1', (err, banner) => {
        if (err) {
            console.log('Something went wrong with figlet...');
            console.dir(err);
            return res.send('Error generating banner');
        }
        
        let status = scriptProcess ? 'Running' : 'Stopped';
        let logHtml = actionLog.map(log => `<li>${log}</li>`).join('');
        
        let html = `
        <head>
        <title>Bashrunner</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
        
        <style>
        /* General Background and Text Colors */
        body {
            background-color: #1a1a1a; /* Dark background */
            color: #f5f5f5; /* Light text */
            font-family: Arial, sans-serif; /* General font */
        }
        pre {
            font-family: 'Courier New', Courier, monospace;
            font-size: 0.6em;
            /* Additional styling as needed */
            
            background-color: #262626; /* Dark background for pre elements */
            border: 1px solid #444444; /* Slightly lighter border */
            color: #d1d1d1; /* Lighter text color for readability */
            padding: 10px; /* Padding for content */
            overflow-x: auto; /* Allows horizontal scrolling for wide content */
            
        }
        
        /* Link Styles */
        a {
            color: #4da6ff; /* Light blue for links */
            text-decoration: none; /* Removes underline from links */
        }
        a:hover {
            color: #ff8533; /* Orange color on hover */
        }
        
        
        table {
            font-family: 'Courier New', Courier, monospace;
            font-size: 0.8em;
            
            
            border-collapse: collapse;
            border-spacing: 0;
        }
        
        td {
            border: 16px solid #333333; /* Just for visual distinction, can be adjusted as needed */
        }
        
        th, td {
            color: #f5f5f5; /* Light text */
            border: 10px solid #333333; /* Slightly lighter border for table cells */
            padding: 2px; /* Padding for table cells */
        }
        
        th {
            background-color: #333333; /* Dark background for table headers */
            color: #aaaaaa; /* White text for headers */
        }
        button {
            /* Button styling */
            padding: 2px 2px;
            margin: 2px;
            font-size: 0.8em;
        }
        .fas {
            /* Icon styling */
            margin-right: 1px;
        }
        </style>      
        
        
        
        
        </head>        <body>
        <!-- Your body content -->
        
        <table><tr>
        <td><pre2>Script path: </pre2></td>
        <td>${scriptPath}</td>
        <td><input type="text" id="newScriptPath" placeholder="New Script Path" value="${scriptPath}"></td>
        </tr><tr>
        <td><pre2>Description: </pre2></td>
        <td>${scriptName}</td>
        <td><input type="text" id="newScriptName" placeholder="New Script Name" value="${scriptName}"></td>
        </tr><tr>
        <td id="status">${status}</td>
        <td><p id="runtime">${scriptProcess ? getScriptRuntime(scriptProcess.pid) : 'Not running'}</p></td>
        <td><button onclick="changeScript()">Change</button></td>
        </tr>
      
        
        <!-- Add more rows and cells as needed -->
        </table>
        
        <pre id="countdownTimer"></pre>
        <button onclick="startScript()"><i class="fas fa-play"></i> Start Script</button>
        <button onclick="stopScript()"><i class="fas fa-stop"></i> Stop Script</button>
        <button onclick="updateLog()"><i class="fas fa-sync"></i> Check status</button>
        <button onclick="startPeriodicUpdate()"><i class="fas fa-hourglass-start"></i> Start timed auto status</button>
        <button onclick="clearAutoUpdate()"><i class="fas fa-hourglass-end"></i> Stop auto status</button>
        
        
        <pre id="scriptOutput"></pre>
        <pre id="log">${logHtml}</pre>
        <pre>${banner}</pre>
        </body>
        
        <script src="/socket.io/socket.io.js"></script>
        <script>
        const socket = io();
        let outputMessages = [];
        
        // socket.on('script-output', function(output) {
        //     outputMessages.push(output); // Add new output to the end
            
        //     // Keep only the latest 10 messages
        //     if (outputMessages.length > 10) {
        //         outputMessages = outputMessages.slice(-10);
        //     }
            
        //     const outputDiv = document.getElementById('scriptOutput');
        //     outputDiv.innerHTML = ''; // Clear existing content
        //     outputMessages.forEach(message => {
        //         const linkedMessage = linkify(message);
        //         outputDiv.innerHTML += linkedMessage + '</li>'; // Append each message
        //     });
        // });


        function updateOutput() {
            fetch('/fetchOutput')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('scriptOutput').innerHTML = data.map(line => '<li>' + line + '</li>').join('');
                });
        }
    
        
        function linkify(inputText) {
            const urlPattern = "[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)";
            const urlRegex = new RegExp(urlPattern, 'ig');
            
            return inputText.replace(urlRegex, function(url) {
                return '<a href="' + url + '" target="_blank">' + url + '</a>';
            });
        }
        
        console.log(linkify("To see the GUI go to: http://0.0.0.0:8188"));
        console.log(linkify("Another link: https://www.example.com/path"));
        console.log(linkify("Non-URL text should remain unchanged."));
        
        // </script>
        
        // <script>

        let updateInterval;
        
        function startScript() {
            fetch('/start', { method: 'POST' }).then(() => updateLog());
        }
        
        function stopScript() {
            fetch('/stop', { method: 'POST' })
            .then(() => {
                updateLog(); // Update the log immediately after stopping
                
                // Clear the periodic update interval
                if (updateInterval) {
                    clearInterval(updateInterval);
                    document.getElementById('countdownTimer').innerText = '';
                    console.log('Periodic update stopped.');
                }
            });
        }
        
        function updateLog() {
            fetch('/log')
            .then(response => response.json())
            .then(data => {
                document.getElementById('log').innerHTML = data.map(log => '<li>' + log + '</li>').join('');
            });
            fetch('/status')
            .then(response => response.json())
            .then(data => {
                document.getElementById('status').innerText = data.status;
                document.getElementById('runtime').innerText = data.runtime;
            });
            updateOutput();
        }
        
        function clearAutoUpdate() {
            if (updateInterval) {
                clearInterval(updateInterval);
                updateInterval = null;
                document.getElementById('countdownTimer').innerText = 'Auto update stopped';
                console.log('Auto update cleared.');
            }
        }        
        
        function changeScript() {
            const scriptNameInput = document.getElementById('newScriptName');
            const scriptPathInput = document.getElementById('newScriptPath');
            const newScriptName = scriptNameInput.value;
            const newScriptPath = scriptPathInput.value;
        
            fetch('/changeScript', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ newScriptName, newScriptPath }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    scriptNameInput.style.backgroundColor = ""; // Reset background
                    scriptPathInput.style.backgroundColor = ""; // Reset background
                    scriptNameInput.value = newScriptName;
                    scriptPathInput.value = newScriptPath;
                } else {
                    scriptPathInput.style.backgroundColor = "pink"; // Indicate error
                }
                updateLog(); // Optionally update the log
            });
        }
         
        function startPeriodicUpdate() {
            document.getElementById('countdownTimer').innerText = 'Starting 10 minutes auto checks...';
            
            // Clear any existing intervals
            if (updateInterval) {
                clearInterval(updateInterval);
            }
            
            const duration = 10 * 60 * 1000; // 10 minutes in milliseconds
            //const intervalTime = 10 * 1000; // 10 seconds in milliseconds
            const intervalTime = 0.5 * 1000; // 10 seconds in milliseconds
            const startTime = Date.now();
            let timeRemaining = duration;
            
            updateInterval = setInterval(() => {
                if (Date.now() - startTime > duration) {
                    clearInterval(updateInterval);
                    document.getElementById('countdownTimer').innerText = '';
                    console.log('Periodic update ended.');
                } else {
                    updateLog();
                    // Update countdown timer display
                    timeRemaining -= intervalTime;
                    const minutes = Math.floor(timeRemaining / 60000);
                    const seconds = Math.floor((timeRemaining % 60000) / 1000);
                    
                    document.getElementById('countdownTimer').innerText = 'Time left in auto update mode: ' + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
                    
                }
            }, intervalTime);
            
            console.log('Started periodic update for 10 minutes.');
        }

        updateOutput(); // Call this at the end of the script block
        </script>
        `;
        res.send(html);
    });
    
    // Start script
    app.post('/start', (req, res) => {
        if (scriptProcess) {
            logAction('attempt to start, but already running');
            res.end();
        } else {
            scriptProcess = spawn('bash', [scriptPath]);
            
            scriptProcess.stdout.on('data', (data) => {
                fs.appendFileSync(outputFilePath, data.toString()); // Append output to file

                // websocket
                //io.emit('script-output', data.toString());
                // Optionally, add this output to your log or send it to the client
                
                // possible debug tjoff
                // console.log(`stdout: ${data}`);
                
            });
            
            scriptProcess.stderr.on('data', (data) => {
                //console.error(`stderr: ${data}`);
                io.emit('script-error', data.toString());
                // Handle or log error output
            });
            
            scriptProcess.on('close', (code) => {
                console.log(`Child process exited with code ${code}`);
                // Handle script completion
            });
            
            logAction('started', scriptProcess.pid);
            res.end();
        }
    });
    
    // Stop script
    app.post('/stop', (req, res) => {
        if (scriptProcess) {
            logAction('stopping ' + scriptProcess.pid);
            scriptProcess.kill();
            scriptProcess = null;
            logAction('stopped');
            res.end();
        } else {
            logAction('attempt to stop, but none running');
            res.end();
        }
    });
    
    app.get('/fetchOutput', (req, res) => {
        const output = fs.readFileSync(outputFilePath, 'utf8');
        const lines = output.split('\n');
        const lastTenLines = lines.slice(-10);
        res.json(lastTenLines);
    });

    app.get('/status', (req, res) => {
        let status = scriptProcess ? 'Running' : 'Stopped';
        let runtime = scriptProcess ? getScriptRuntime(scriptProcess.pid) : 'Not running';
        res.json({ status: status, runtime: runtime });
    });
    
    // Get log
    app.get('/log', (req, res) => {
        res.json(actionLog);
    });
    
    // Change name and path
    app.post('/changeScript', (req, res) => {
        const { newScriptName, newScriptPath } = req.body;
    
        if (newScriptName && newScriptPath && isValidFile(newScriptPath)) {
            scriptName = newScriptName;
            scriptPath = newScriptPath;
            logAction(`Script changed to ${scriptName} at path ${scriptPath}`);
            res.json({ success: true, message: 'Script changed successfully' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid script path' });
        }
    });
    
    
});


// Read log from file on server start
console.log("Bashrunner started. Looking for logfile...");
if (fs.existsSync(logFilePath)) {
    console.log("Logfile found! Reading.");
    const fileContents = fs.readFileSync(logFilePath, 'utf8');
    actionLog = fileContents.split('\n').filter(line => line).slice(-10); // Get last 10 entries
}

// Start the server
server.listen(port, () => console.log(`Server running on port ${port}`));

