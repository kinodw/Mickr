const url = require('url');
const path = require('path');
const electron = require('electron')
const EventEmitter = new require('events').EventEmitter;
const {ipcMain, BrowserWindow } = electron;
const MickrClient = require('./MickrClient.js')
const settingWindow = require('./settingWindow.js');
// const GoogleDriveAPI = require('./DriveAPI/app.js')
// const ioHook = require('iohook');


class windowManager extends EventEmitter{
  constructor(ipcMain){
    super()
    this.mainWindows = {}
    this.subWindow = null;
    this.client = null;
    this.show_mode = true;
    this.transparent_mode = true;
    this.pause = false;
    this.page = 'land.html';
  }

  setPageURL(url){
    this.page = url || 'land.html';
  }
  /* 透明ウィンドウの生成 */
  activateMainWindows(){
    var mainWindow = this.getMainWindow();
    if(this.client == null){
      settingWindow.create()
      this.createMainWindows()
      ipcMain.on('switch_mode', (e, data) => {windowManager.switchShowMode();});
      ipcMain.on('ack', (e ,data) => {console.log(e, data);})
      ipcMain.on('set_clinet', (e, data) => {
        console.log(data);
        settingWindow.destroy();
        this.client = new MickrClient(data)
        this.client.on('mickr', (req, res) => {this.getAllMainWindows().forEach(w => {w.send('mickr', req.body.content);})})
        electron.screen.on('display-added', (e, d) => this.buildMainWindow(d))
        electron.screen.on('display-removed', (e, d) => {this.removeWindow(d)})

        // ioHook.on("mouseclick", e => {
        //   var p = electron.screen.getCursorScreenPoint();
        //   var d = electron.screen.getDisplayNearestPoint(p);
        //   var w = this.getWindowWithDisplay(d);
        //
        //   w.webContents.send('click', {
        //     x: p.x - d.bounds.x,
        //     y: p.y - d.bounds.y
        //   })
        // });
        //Register and start hook
        // ioHook.start();
        ipcMain.on('collision',(e, d)=>{
          var w = this.getWindowWithDisplay(electron.screen.getDisplayNearestPoint(electron.screen.getCursorScreenPoint()));
          if(d.transparent_mode){
            this.transparent_mode = true
            w.setIgnoreMouseEvents(true);
            w.setFocusable(false);
            w.webContents.send('switch_mode', true);
          }
          else{
            this.transparent_mode = false
            w.focus();
            w.focusOnWebView();
            w.webContents.send('switch_mode', false);
          }
        });
      })
    }
    else if(mainWindow === null || mainWindow === undefined){this.createMainWindows()}
  }

  quit(){
    this.getAllMainWindows.forEach(w=>{w.close()})
    this.mainWindows = {}
    // if(ioHook !== null || ioHook !== undefined){
    //   ioHook.stop()
    // }
  }

  getWindowWithDisplay(d){
    var w = this.mainWindows[d.id];
    return (w !== undefined || w !== null) ? w : this.buildMainWindow();
   }

  createMainWindows(){return electron.screen.getAllDisplays().map(d=>this.buildMainWindow(d))}

  buildMainWindow(d){
    var w = this.mainWindows[d.id];
    if(w === null || w === undefined){
      this.mainWindows[d.id] = this.buildWindow({display: d});
      return w;
    }
  }

  buildWindow(option){
    option.display = option.display || electron.screen.getPrimaryDisplay();
    option.page = option.page || this.page;
    option.x = option.x || option.display.bounds.x + option.x;
    option.y = option.y || option.display.bounds.y + option.y;
    option.width = option.width || option.display.workAreaSize.width;
    option.height = option.height || option.display.workAreaSize.height;
    option.transparent = option.transparent || true;
    option.ignoreMouseEvent = option.ignoreMouseEvent || true;
    option.AlwaysOnTop = option.AlwaysOnTop || true;

    var w = new BrowserWindow({
        x: option.x,
        y: option.y,
        width: option.width,
        height: option.height,
        transparent: option.transparent,
        frame: false,
        // type: "desktop",
        hasShadow: false
    });

    console.log(option.page);
    w.loadURL(url.format({
        pathname: path.join(__dirname, '..', 'public', option.page),
        protocol: 'file:',
        slashes: true
    }));
    if(option.ignoreMouseEvent){
      w.setIgnoreMouseEvents(true)
      w.setFocusable(false);
    }
    if(option.AlwaysOnTop){
      w.setAlwaysOnTop(true, 'floating');
      w.setVisibleOnAllWorkspaces(true)
    }
    w.on('closed', () => {w = null;});
    return w;
  }

  recreateWindow(d){
    this.removeWindow(d);
    this.createWindow(d);
  }

  removeWindow(d){
    this.mainWindows[d.id].close();
    this.mainWindows[d.id] = null;
  }
  getMainWindowWithMouse(){return this.getWindowWithDisplay(electron.screen.getDisplayNearestPoint(electron.screen.getCursorScreenPoint()));}

  getAllMainWindows(){return Object.keys(this.mainWindows).map(k=>this.mainWindows[k])}
  getMainWindow(){return this.mainWindows[electron.screen.getPrimaryDisplay().id];}

  /* 透明ウィンドウの切り替え */
  switchShowMode(mode) {
    var w = this.getWindowWithDisplay(electron.screen.getDisplayNearestPoint(electron.screen.getCursorScreenPoint()));

    // tray.setImage(path.join(__dirname, '..', 'lib', 'img', 'cloud_' + (this.transparent_mode ? 'off' : 'on') + '.png'));
    if(w != null){
      this.transparent_mode = !this.transparent_mode;
      w.setIgnoreMouseEvents(this.transparent_mode);
      w.setFocusable(!this.transparent_mode);
      if(!this.transparent_mode) {
        w.focus();
        w.focusOnWebView();
      }
      w.webContents.send('switch_mode', this.transparent_mode);
    }
  }

  switchPause(w) {
    this.pause = !this.pause;
    var w = this.getMainWindow();
    if(w != null) w.webContents.send('switch_pause', this.pause);
  }
}

module.exports = windowManager
