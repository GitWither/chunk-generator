const {app, BrowserWindow} = require('electron');

function createWindow() {
    const window = new BrowserWindow({
        width: 525,
        height: 360,
        //resizable: false,
        //fullscreenable: false,
        webPreferences: {
            nodeIntegration: true
        }
    });
    
    window.loadFile("index.html");
    
    window.webContents.openDevTools();

    window.removeMenu();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})