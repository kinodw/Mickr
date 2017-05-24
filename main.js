const electron = require('electron');
const url = require('url')
const path = require('path');

/*
  app: NodeJS上で動くMainプロセス
  ipcMain: MainプロセスとRendererプロセスのモジュール間通信を行う
  Tray: macOS上のメニューバー上のアイコン
  Menu: メニュー画面
  globalShortcut: キーボードのショートカット設定
  screen: windowオブジェクトの設定
  BrowserWindow: electronで起動するwindow上におけるwindowオブジェクト
*/
const {app, Tray, Menu, globalShortcut, powerSaveBlocker} = electron;

const id = powerSaveBlocker.start('prevent-app-suspension');
powerSaveBlocker.stop(id);

const windowManager = require(path.join(__dirname, 'modules', 'windowManager.js'));

let tray = null;
let tray2 = null;

const wm = new windowManager()

/* アプリケーションが起動した時の処理 */
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.on('ready', () => {
  wm.activateWindows();

  /* メニューバー上のアイコンが押された場合の処理 */
  tray = new Tray(path.join(__dirname, 'lib', 'img', 'cloud_on.png'));
  tray.on('click', e => {wm.switchShowMode(tray);});

  tray2 = new Tray(path.join(__dirname, 'lib', 'img', 'ic_pause_black_24dp_2x.png'));
  tray2.on('click', e => {wm.switchPause();});
});

/* 全てのウィンドウが閉じられた場合の処理 */
app.on('window-all-closed', () => {
  if(process.platform !== 'darwin'){
    windowManager.quit()
    app.quit();
  }
});

/* Mainプロセス起動時の処理 */
app.on('activate', () => {
  wm.activateWindows();
});
