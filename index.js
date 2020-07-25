const {app, BrowserWindow} = require('electron');

function createWindow() {
    const window = new BrowserWindow({
        width: 600,
        height: 600
    });
    
    window.loadFile("index.html");
    
    window.webContents.openDevTools();
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