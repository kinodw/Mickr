const electron = require('electron')
document.addEventListener('DOMContentLoaded', ()=>{
  console.log("setting");
  electron.ipcRenderer.send('set_clinet', {
    "id": "Land",
    "url": "ws://apps.wisdomweb.net:64260/ws/mik",
    "site": "ashun",
    "token": "Pad:7732"
  })
})
