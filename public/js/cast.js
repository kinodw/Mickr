document.addEventListener('DOMContentLoaded', (e) => {
  const client = new MickrClient({
    "id": "sky",
    "url": "ws://apps.wisdomweb.net:64260/ws/mik",
    "site": "ashun",
    "token": "Pad:7732"
  })
  btn.addEventListener('click', ()=>{
    console.log("click");
    client.broadcast({
      "body": {
        "command": "mickr",
        "content": {
          "text": focusedInput.value
        }
      }
    }, (req, res)=>{
      console.log(req,res);
    });
  })
})
