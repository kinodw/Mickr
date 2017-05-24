$('ready', function(){
  $.material.init();
  var sky = new Sky();
  var client = null;

  $('#myModal').modal()
  $('#submit').click((e) => {
    $('body').removeClass('modal-open'); // 1
    $('.modal-backdrop').remove();       // 2
    $('#myModal').modal('hide');        // 3
    client = new MickrClient({
      "id": $('#ID').val() || String(Math.random().toString(36).slice(-8)),
      "url": "ws://apps.wisdomweb.net:64260/ws/mik",
      "site": $('#Site').val() || "toralab",
      "token": $('#Token').val() || "Pad:7732"
    });
    var cloud = sky.addCloud({text: "もくもく",});
    client.on('mickr', (req, res) => {
      sky.addCloud(req.body.content)
    })
  });
})
