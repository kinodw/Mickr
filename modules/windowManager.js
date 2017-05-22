const url = require('url');
const path = require('path');
const electron = require('electron')
const EventEmitter = new require('events').EventEmitter;
const {ipcMain, BrowserWindow } = electron;
const MickrClient = require('./MickrClient.js')
// const GoogleDriveAPI = require('./DriveAPI/app.js')
const ioHook = require('iohook');


class windowManager extends EventEmitter{
  constructor(ipcMain){
    super()
    this.mainWindows = {}
    this.subWindow = null;
    this.client = null;
    this.show_mode = true;
    this.transparent_mode = true;
    this.pause = false;
  }
  /* 透明ウィンドウの生成 */
  activateWindows(){
    var mainWindow = this.getMainWindow();
    if(this.client == null){
      this.subWindow = new BrowserWindow({
        width: 400,
        height: 600,
        alwaysOnTop: true
      })
      this.subWindow.loadURL(url.format({
          pathname: path.join(__dirname, '..', 'public', 'setting.html'),
          protocol: 'file:',
          slashes: true
      }));
      ipcMain.on('switch_mode', (e, data) => {windowManager.switchShowMode();});
      ipcMain.on('set_clinet', (e, data) => {
        this.client = new MickrClient(data)
        this.client.on('mickr', (req, res) => {
          console.log("mickr request: ",req);
          this.getAllMainWindows().forEach(w=>{
            w.send('mickr', req.body.content);
          })
        })
        this.subWindow.close()
        this.createMainWindows()
        electron.screen.on('display-added', (e, d) => this.buildMainWindow(d))
        electron.screen.on('display-removed', (e, d) => {this.removeWindow(d)})

        ioHook.on("mouseclick", e => {
          var p = electron.screen.getCursorScreenPoint();
          var d = electron.screen.getDisplayNearestPoint(p);
          var w = this.getWindowWithDisplay(d);

          w.webContents.send('click', {
            x: p.x - d.bounds.x,
            y: p.y - d.bounds.y
          })
        });
        //Register and start hook
        ioHook.start();
        ipcMain.on('collision',(e, d)=>{
          console.log("collision", d);
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
      this.subWindow.on('closed', () => {
        this.subWindow = null;
      });
    }
    else if(mainWindow === null || mainWindow === undefined){
      this.createMainWindows()
    }
  }

  quit(){
    this.getAllMainWindows.forEach(w=>{w.close()})
    this.mainWindows = {}
    if(ioHook !== null || ioHook !== undefined){
      ioHook.stop()
    }
  }

  getWindowWithDisplay(d){
    var w = this.mainWindows[d.id];
    return (w !== undefined || w !== null) ? w : this.buildMainWindow();
   }

  createMainWindows(){return electron.screen.getAllDisplays().map(d=>this.buildMainWindow(d))}

  buildMainWindow(d){
    var w = this.mainWindows[d.id];
    if(w === null || w === undefined){
      console.log(d);
      w = new BrowserWindow({
          x: d.bounds.x,
          y: d.bounds.y,
          width: d.workAreaSize.width,
          height: d.workAreaSize.height,
          transparent: true,
          frame: false,
          alwaysOnTop: true,
          // type: "desktop",
          hasShadow: false
      });
      w.loadURL(url.format({
          pathname: path.join(__dirname, '..', 'public', 'index.html'),
          protocol: 'file:',
          slashes: true
      }));

      w.setIgnoreMouseEvents(true)
      w.setFocusable(false);
      w.setAlwaysOnTop(true, 'floating', 500);
      w.setVisibleOnAllWorkspaces(true)
      w.on('closed', () => {w = null;});
      this.mainWindows[d.id] = w;
      return w;
    }
  }

  recreateWindow(d){
    this.removeWindow(d);
    this.createWindow(d);
  }

  removeWindow(d){
    this.mainWindows[d.id].close();
    this.mainWindows[d.id] = null;
  }

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
