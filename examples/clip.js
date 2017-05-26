const electron = require('electron');
const url = require('url')
const path = require('path');

const {app} = electron;
const windowManager = require(path.join(__dirname, '../modules', 'windowManager.js'));

const wm = new windowManager()
let mainWindow = null;
let client = new MickrClient({
  "id": "clip",
  "url": "ws://apps.wisdomweb.net:64260/ws/mik",
  "site": "ashun",
  "token": "Pad:7732"
})

/* アプリケーションが起動した時の処理 */
app.on('ready', () => {
  mainWindow = wm.buildWindow({
    page: 'example/clip.html',
    x: d.workAreaSize.width - 150,
    y: d.workAreaSize.height - 100,
    width: 150,
    height: 100,
    transparent: true,
    ignoreMouseEvent: false,
    AlwaysOnTop: true
  });
  setInterval(() => {

  }, 100)

  client.on('clip', () => {})
});

/* 全てのウィンドウが閉じられた場合の処理 */
app.on('window-all-closed', () => {
  if(process.platform !== 'darwin'){
    app.quit();
  }
});

/* Mainプロセス起動時の処理 */
app.on('activate', () => {
  mainWindow = wm.buildWindow({
    page: 'example/clip.html',
    x: d.workAreaSize.width - 150,
    y: d.workAreaSize.height - 100,
    width: 150,
    height: 100,
    transparent: true,
    ignoreMouseEvent: false,
    AlwaysOnTop: true
  });
});
