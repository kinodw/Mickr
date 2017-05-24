/* DOM要素が読み込まれてから */
document.addEventListener('DOMContentLoaded', (e) => {
  /* 雲を表示するskyの生成 */
  var sky = new Sky();
  var cloud = sky.addCloud({text: "もくもく",});
  // var cloud = new Cloud({text: "もくもく", rotation:false});
  // sky.appendCloud(cloud)
  // cloud.Around({x: 300, y: 300}, {x: 100, y: 100})
});
