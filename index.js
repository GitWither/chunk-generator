const {app, BrowserWindow} = require('electron');
const path = require('path');
const url = require('url');

function createWindow() {
    const window = new BrowserWindow({
        icon: path.join(__dirname, "build", "icon.ico"),
        width: 525,
        height: 360,
        resizable: false,
        fullscreenable: false,
        webPreferences: {
            nodeIntegration: true,
            webSecurity: true
        },
        show: false
    });
    
    window.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));
    
    window.webContents.openDevTools();
    window.removeMenu();
    window.once('ready-to-show' ,() => {
        window.show();
    });
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