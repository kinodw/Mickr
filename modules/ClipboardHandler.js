const electron = require('electron');
const url = require('url')
const path = require('path');
const EventEmitter = new require('events').EventEmitter;

const {app, ipcMain, clipboard} = electron;

class ClipboardHandler extends EventEmitter{
  constructor(){
    super()
    this.type = "text";
    this.tmp = null;
    setInterval(() => {
      var _text = clipboard.readText()
      var _img = clipboard.readImage()

      if(_text){
        if(this.tmp != _text && _img.isEmpty()){
          this.tmp = _text;
          console.log(this.tmp);
          this.emit('update', this.tmp)
        }
      }
      else if(this.tmp !== _img && !_img.isEmpty()){
        this.tmp = _img;
        console.log(this.tmp);
        this.emit('update', this.tmp)
      }
    }, 100)
  }
  getClipboard(){return this.tmp}
  writeData(data ,format){clipboard.write(data)}
}

module.exports = new ClipboardHandler();
