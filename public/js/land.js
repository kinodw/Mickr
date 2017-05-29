/* DOM要素が読み込まれてから */
document.addEventListener('DOMContentLoaded', (e) => {
  /* 雲を表示するskyの生成 */
  var sky = new MickrSky();
  var cloud = sky.addCloud({text: "もくもく",});
});
