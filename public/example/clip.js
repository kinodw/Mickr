const electron = require('electron');
let ipcRenderer;
let sky;
let cloud;


document.addEventListener('DOMContentLoaded', () => {
  ipcRenderer = electron.ipcRenderer;
  sky = new Sky({elementID: "sky"});
  cloud = sky.addCloud({around: false})
  cloud.setClickAnimation(() => {console.log(cloud.text);})

  ipcRenderer.on('clip', (e, data) => {
    console.log(data);
    cloud.setText(data)
  })
})
