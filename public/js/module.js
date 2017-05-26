(function(){
  // Node.js で動作しているか
  var isNode = (typeof process !== "undefined" && typeof require !== "undefined");
  var ipcRenderer = null;
  var capture = null;

  if(isNode) window.electron = require('electron');
  var w = window.innerWidth;
  var h = window.innerHeight;
  /* ランダムなID(文字列)の生成 */
  window.generateRandomID = () => String(Math.random().toString(36).slice(-8));
  /* ランダムな整数の生成 */
  window.generateRandomInt = (min,max) => Math.floor( Math.random() * (max - min + 1) ) + min;

  document.addEventListener('DOMContentLoaded', () => {
    if(isNode){
      ipcRenderer = electron.ipcRenderer;
      capture = electron.desktopCapturer;
    }

    /* 雲を表示するベースの生成 */
    window.Sky = class Sky{
      constructor(option){
        option = option || {};
        this.client = null;
        if(!isNode){
          option.id = option.id || generateRandomID();
          option.url = "ws://apps.wisdomweb.net:64260/ws/mik";
          option.site = option.site || "test";
          option.token = option.token || "Pad:9948"
          this.client = new MickrClient(option);
        }

        if(option.element === undefined){
          var div = document.createElement('div');
          div.id = "sky";
          div.className = 'sky';
          document.body.appendChild(div)
          this.element = div;
        }else{
          this.element = document.getElementById(option.elementID);
        }
        this.clouds = [];
        this.selected = [];

        if(isNode) this.setRendererEvent()
      }

      send(command, message, callback){if(this.client !== null) this.client.send(command, message, callback)}
      on(command, message, callback){if(this.client !== null) this.client.on(command, message, callback)}
      broadcast(command, message, callback){if(this.client !== null) this.client.broadcast(command, message, callback)}

      setRendererEvent(){
        this.element.addEventListener('click', e => {
          if(this.clouds.length > 0){
            if(!this.clouds.some(c=>c.isCollision(e.pageX, e.pageY))){
              ipcRenderer.send('collision', {
                transparent_mode: true
              });
            }
          }
        })

        ipcRenderer.on('mickr', (e, data) => {this.addCloud(data)});

        /* 透明画面の切り替え */
        ipcRenderer.on('switch_mode', (e, transparent_mode) => {
          if(transparent_mode) {
            document.body.style.backgroundColor = 'transparent';
          } else {
            document.body.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
          }
        });
        ipcRenderer.on('switch_pause', (e, pause) => {
          if(pause) {
            this.outerPause();
            this.innerPause();
          } else {
            this.outerResume();
            this.innerResume();
          }
        });
        ipcRenderer.on('click', (e, data) => {
          var text = "";
          if(this.clouds.some(c => {
            var q = c.isCollision(data.x, data.y)
            if(q){text = c.text}
            return q
          }))
          {
            ipcRenderer.send('collision', {
              text: text,
              transparent_mode: false
            });
          }
        });
      }

      appendCloud(cloud){
        cloud.createCloud(option);
        cloud.addHandler(option);
        cloud.addGoAround(option);
        this.clouds.push(cloud);
      }

      /* sky上に雲の追加 */
      addCloud(option){
        if(option){
          option.parent = option.parent || document.getElementById('sky');
          option.mouseover = option.mouseover || this.mouseover.bind(this);
          option.mouseout = option.mouseout || this.mouseout.bind(this);
          option.onComplete = option.onComplete || this.onComplete.bind(this);
          option.onClick = option.onClick || this.onClick.bind(this);
        }

        var cloud = new Cloud(option)

        cloud.createCloud(option);
        cloud.addHandler(option);
        cloud.addGoAround(option);

        this.clouds.push(cloud);
        return cloud;
      };

      outerPause(){
        this.clouds.forEach(cloud => {
          if(!cloud.selected) cloud.outer_tl.pause();
        });
      };

      outerResume(){
        this.clouds.forEach(function(cloud) {
          if (!cloud.selected) cloud.outer_tl.resume();
        });
      };

      innerPause(){
        this.selected.forEach(cloud => {
          if(cloud.selected) cloud.inner_tl.pause();
        });
      };

      innerResume(){
        this.selected.forEach(function(cloud) {
          if (cloud.selected) cloud.inner_tl.resume();
        });
      };

      mouseover(cloud){
        if (cloud.selected) this.innerPause();
        else this.outerPause();
      };

      mouseout(cloud){
        if(cloud.selected) this.innerResume();
        else this.outerResume();
      };

      onComplete(cloud){this.clouds.splice(this.clouds.indexOf(cloud), 1);};

      returnClouds(){
        this.selected.forEach(c => {
          c.onClick();
          this.clouds.push(c);
        });
        this.selected = [];
      };

      onClick(cloud){
        if (!cloud.selected) {
          this.selected.push(cloud);
          this.clouds.splice(this.clouds.indexOf(cloud), 1);
          this.outerResume();
        }
        else {
          this.selected.splice(this.selected.indexOf(cloud), 1);
          this.clouds.push(cloud);
          this.innerResume();
        }
        cloud.onClick();
      };

      selectedText(){return(this.selected ? this.selected.map(cloud => cloud.text) : []);};
    }


    /* 雲オブジェクトの生成 */
    window.Cloud = class Cloud{
      constructor(option){
        option = option !== undefined ? option : {
          parent: document.getElementById('sky'),
          id: generateRandomID(),
          size: 1.0,
          tags: ["none"]
        }
        this.parent = option.parent || document.getElementById('sky');
        this.element = null;
        this.outer_tl = null;
        this.inner_tl = null;
        this.clickAnimation = () => {}

        option.swing = option.swing === undefined ? true : false;
        option.rotation = option.rotation === undefined ? false : true;
        option.around = option.around === undefined ? true : false;
        option.visible = option.visible === undefined ? true : false;

        this.rotation = option.rotation;

        this.id = option.id || generateRandomID();
        this.size = option.size || 1.0;
        this.tags = option.tags || ["none"];
      };

      isCollision(x, y){
        var X = x - parseInt(this.element.style.left);
        var Y = y - parseInt(this.element.style.top);
        var W = this.element.querySelector('.cloud').width.animVal.value;
        var H = this.element.querySelector('.cloud').height.animVal.value;
        return(X >= 0 && X <= W && Y >=0 && Y <= H);
      }

      createCloud(option){
        if(this.element) return 0;
        option.parent = option.parent || this.parent;
        option.color = option.color || "#FFFFFF";
        switch(option.type) {
          case "rect":
            console.log("rect");
            var rect = document.createElement('div');
            rect.style.position = "absolute"
            rect.style.fontSize = "x-large";
            rect.style.fontColor = "black";
            rect.style.border = 'black solid 1px'
            rect.style.backgroundColor = option.color;
            rect.style.opacity = option.visible && option.visible === undefined ? 1.0 : 0.0;
            rect.innerText = option.text;
            this.element = rect;
            this.setPosition(option.position)
            this.parent.appendChild(rect);
            break;
          case "custom":
            this.parent.appendChild(option.body);
            break;
          default:
            this.element = this.createCloudElement();
            console.log(this.element);
            this.setColor(option.color);
            this.setText(option.text);
            this.setImage(option.url);
            this.setPosition(option.position)
            this.setSize(option.size)
            this.parent.appendChild(this.element);
        }
        this.setClickAnimation(this.centering)
      };

      getSize(){
        return {
          width: parseInt(this.element.width),
          height: parseInt(this.element.height)
        }
      }

      setSize(scale, duration=0.5){
        TweenLite.to(this.element, duration, {scale: scale})
      }

      getPosition(){
        return {
          x: parseInt(this.element.style.left),
          y: parseInt(this.element.style.top)
        }
      }

      setPosition(position){
        position = position || {x:0, y:0};
        this.element.style.left = position.x+"px";
        this.element.style.top = position.y+"px";
        TweenLite.to(this.element, 2, {left: position.x, right: position.y})
      }

      setText(text){
        this.text = text || "";
        this.element.querySelector('.cloud_text').innerText = text;
      };

      setColor(color){
        this.color = color || "#FFFFFF";
        this.element.querySelector('.cloud path').style.fill = color;
      };

      setImage(url){
        this.src = url;
        if(url) this.element.querySelector('.cloud_image').src = url;
      }

      Around(start={x: 0, y:0}, end={x:0, y:0}, swing=true, rotation=true, onComplete=()=>{}){
        var tl = new TimelineLite({onComplete: onComplete, onUpdateParams: ["{self}"]});

        tl.add(TweenLite.fromTo(this.element, 2, {
          rotation: 0,
          xPercent: 0,
          yPercent: 0,
          left: start.x,
          top: start.y
        }, {
          rotation: rotation
            ? -235
            : 0,
          xPercent: 50,
          yPercent: 50,
          top: 0,
          onComplete: (() => {this.outer_state = 'Right';}).bind(this)
        }));

        tl.add('Around');
        tl.add('Right');
        tl.add(this.goRight({
          el: this.element,
          duration: start ? 9 * ((w - start.x) / w) : 9,
          swing: option.swing_right,
          rotation: option.rotation
        }));
        tl.add('Down');
        tl.add(this.goDown({el: this.element, duration: 8, swing: swing, rotation: rotation}));
        tl.add('Left');
        tl.add(this.goLeft({el: this.element, duration: 9, swing: swing, rotation: rotation}));
        tl.add('Up');
        tl.add(this.goUp({el: this.element, duration: 8, swing: swing, rotation: rotation}));
        tl.add(TweenLite.fromTo(this.element, 2, {
          rotation: 0,
          xPercent: 0,
          yPercent: 0,
          left: end.x,
          top: end.y
        }));
        tl.add('Done');

        return tl;
      }

      addGoAround(option){
        if(option.around){
          this.outer_tl = this.goAround({
            el: this.element,
            swing_right: option.swing_right === undefined ? option.swing: option.swing_right,
            swing_down: option.swing_down === undefined ? option.swing : option.swing_down,
            swing_left: option.swing_left === undefined ? option.swing : option.swing_left,
            swing_up: option.swing_up === undefined ? option.swing : option.swing_up,
            rotation: option.rotation,
            position: option.position,
            onUpdate: (tl => {this.now = tl.totalTime();}).bind(this),
            onComplete: (() => {this.remove();}).bind(this)
          });
        }
      };

      remove(){
        this.parent.removeChild(this.element);
      };

      addHandler(option){
        this.element.addEventListener('mouseover', (() => {option.mouseover(this);}).bind(this));
        this.element.addEventListener('mouseout', (() => {option.mouseout(this);}).bind(this));
        this.element.addEventListener('click', (e => {if(option.onClick) option.onClick(this);}).bind(this));
      };

      onClick(){
        if (this.selected) {
          this.inner_tl.pause();
          this.returnOuterAround();
        } else {
          this.inner_tl = this.clickAnimation();
          this.selected = true;
        }
      };

      goAround(option){
        var tl = new TimelineLite({onComplete: option.onComplete, onUpdate: option.onUpdate, onUpdateParams: ["{self}"]});

        if (option.position) {
          tl.add(TweenLite.fromTo(option.el, 2, {
            rotation: 0,
            xPercent: 0,
            yPercent: 0,
            left: option.position.x,
            top: option.position.y
          }, {
            rotation: option.rotation
              ? -235
              : 0,
            xPercent: 50,
            yPercent: 50,
            top: 0,
            onComplete: (() => {this.outer_state = 'Right';}).bind(this)
          }));
        } else {
          tl.add(TweenLite.set(option.el, {
            rotation: option.rotation ? -235 : 0,
            xPercent: 50,
            yPercent: 50,
            onComplete: (() => {this.outer_state = 'Right';}).bind(this)
          }));
        }

        tl.add('Around');
        tl.add('Right');
        tl.add(this.goRight({
          el: option.el,
          duration: option.position ? 9 * ((w - option.position.x) / w) : 9,
          swing: option.swing_right,
          rotation: option.rotation
        }));
        tl.add('Down');
        tl.add(this.goDown({el: option.el, duration: 8, swing: option.swing_down, rotation: option.rotation}));
        tl.add('Left');
        tl.add(this.goLeft({el: option.el, duration: 9, swing: option.swing_left, rotation: option.rotation}));
        tl.add('Up');
        tl.add(this.goUp({el: option.el, duration: 8, swing: option.swing_up, rotation: option.rotation}));
        tl.add('Done');

        return tl;
      };

      setClickAnimation(func){
        if(func !== undefined) this.clickAnimation = func;
      }

      centering(){
        var tl = new TimelineLite();
        var animations = [TweenLite.to(this.element, 2, {
          rotation: 0,
          xPercent: 0,
          yPercent: 0,
          left: w/2 - 100,
          top: h/2 - 100
        }), TweenLite.to(this.element, 2, {
          scale: 3.0
        })];
        tl.add(animations);
        return tl;
      }

      goAroundSmall(){
        var tl = new TimelineLite({
          onComplete: self => {self.restart();},
          onCompleteParams: ["{self}"],
          repeat: -1
        });
        tl.add('goAroundSmall');
        tl.add(TweenLite.to(this.element, 2, {
          left: w / 2,
          top: h / 2 + 200,
          rotation: 720,
          xPercent: "-50%",
          yPercent: "-50%"
        }));
        var tl_around = new TimelineMax({repeat: -1});
        tl_around.add(TweenMax.to(this.element, 2, {
          xPercent: "-=130",
          yoyo: true,
          repeat: 1,
          ease: Sine.easeOut
        }));
        tl_around.add(TweenMax.to(this.element, 2, {
          xPercent: "+=130",
          yoyo: true,
          repeat: 1,
          ease: Sine.easeOut
        }));
        tl.add([
          TweenMax.to(this.element, 8, {
            rotation: 1080,
            ease: Linear.easeNone,
            repeat: -1
          }),
          TweenMax.to(this.element, 4, {
            yPercent: "-=390",
            yoyo: true,
            repeat: -1,
            ease: Sine.easeInOut
          }),
          tl_around
        ]);
        return tl;
      };

      /* 振動 */
      swing(option){
        var tl = new TimelineLite();

        var params = {
          yoyo: true,
          repeat: 1,
          ease: Sine.easeOut,
          transformOrigin: 'initial'
        };

        for (var i = 0; i < option.interval; i++) {
          var forward_params = JSON.parse(JSON.stringify(params));
          forward_params[option.direction] = "+=" + (Math.random() * option.range + 3);
          tl.add(TweenMax.to(this.element, (option.duration / 4) / option.interval, forward_params));
          var backward_params = JSON.parse(JSON.stringify(params));
          backward_params[option.direction] = "-=" + (Math.random() * option.range + 3);
          tl.add(TweenMax.to(this.element, (option.duration / 4) / option.interval, backward_params));
        }

        return tl;
      };

      /* 右へ外回り移動 */
      goRight(option){
        var tl = new TimelineLite();

        var animations = [TweenLite.to(this.element, option.duration, {
            left: w,
            top: 0,
            xPercent: -150,
            yPercent: 50,
            ease: Sine.easeInOut,
            onComplete: (() => {
              this.outer_state = 'Down';
              if (option.onComplete) option.onComplete();
            }).bind(this)
          })];
        if (option.rotation) animations.push(TweenLite.to(this.element, option.duration, {rotation: '-135'}));
        if (option.swing) animations.push(this.swing({duration: option.duration, interval: 10, range: 5, direction: 'top'}));

        tl.add(animations);

        return tl;
      };

      /* 下へ外回り移動 */
      goDown(option){
        var tl = new TimelineLite();

        var animations = [TweenLite.to(this.element, option.duration, {
            left: w,
            top: h,
            xPercent: -150,
            yPercent: -150,
            ease: Sine.easeInOut,
            onComplete: (() => {
              this.outer_state = 'Left';
              if(option.onComplete) option.onComplete();
            }).bind(this)
          })];
        if (option.rotation) animations.push(TweenLite.to(this.element, option.duration, {rotation: '-45'}));
        if (option.swing) animations.push(this.swing({duration: option.duration, interval: 10, range: 5, direction: 'left'}));

        tl.add(animations);

        return tl;
      };

      /* 左へ外回り移動 */
      goLeft(option) {
        var tl = new TimelineLite();

        var animations = [TweenLite.to(this.element, option.duration, {
            left: 0,
            top: h,
            xPercent: 50,
            yPercent: -150,
            ease: Sine.easeInOut,
            onComplete: (() => {
              this.outer_state = 'Up';
              if (option.onComplete) option.onComplete();
            }).bind(this)
          })];
        if (option.rotation) animations.push(TweenLite.to(this.element, option.duration, {rotation: '45'}));
        if (option.swing) animations.push(this.swing({duration: option.duration, interval: 10, range: 5, direction: 'top'}));

        tl.add(animations);

        return tl;
      };

      /* 上へ外回り移動 */
      goUp(option){
        var tl = new TimelineLite();

        var animations = [TweenLite.to(this.element, option.duration, {
            left: 0,
            top: 0,
            xPercent: 50,
            yPercent: 50,
            ease: Sine.easeInOut,
            onComplete: (() => {
              this.outer_state = 'Done';
              if(option.onComplete) option.onComplete();
            }).bind(this)
          })];
        if(option.rotation) animations.push(TweenLite.to(this.element, option.duration, {rotation: '135'}));
        if(option.swing) animations.push(this.swing({duration: option.duration, interval: 10, range: 5, direction: 'left'}));

        tl.add(animations);

        return tl;
      };

      goTo(direction, duration=8, rotation=false, swing=false, onComplete){
        switch(direction){
          case 'Right':
            this.goRight({duration:8, rotation:false, swing:false, onComplete});
            break;
          case 'Down':
            this.goDown({duration:8, rotation:false, swing:false, onComplete});
            break;
          case 'Left':
            this.goLeft({duration:8, rotation:false, swing:false, onComplete});
            break;
          case 'Up':
            this.goUp({duration:8, rotation:false, swing:false, onComplete});
            break;
        }
        return this;
      }

      getPosition(){
        this.position = {x: parseInt(this.element.style.left), y: parseInt(this.element.style.top)};
        return this.position;
      }

      moveTo(position={x:0, y:0}, duration=2){
        var tl = new TimelineLite();
        var animations = TweenLite.to(this.element, duration, {
          rotation: 0,
          xPercent: 0,
          yPercent: 0,
          left: position.x,
          top: position.y
        })
        if(this.outer_tl != null) this.outer_tl.add(animations)
        else this.outer_tl = tl.add(animations);

        return this;
      }

      rotate(angle=0, duration=2){
        var tl = new TimelineLite();
        var animations = TweenLite.to(this.element, duration, {
          rotation: angle,
        })
        if(this.outer_tl != null) this.outer_tl.add(animations)
        else this.outer_tl = tl.add(animations);
        return this;
      }

      fadeIn(duration=2 ,alpha=1.0){
        var tl = new TimelineLite();
        var animations = TweenLite.to(this.element, duration, {alpha:alpha})
        if(this.outer_tl != null) this.outer_tl.add(animations)
        else this.outer_tl = tl.add(animations);
        return this;
      }

      fadeOut(duration=2){
        var tl = new TimelineLite();
        var animations = TweenLite.to(this.element, duration, {alpha:alpha})
        if(this.outer_tl != null) this.outer_tl.add(animations)
        else this.outer_tl = tl.add(animations);
        return this;
      }


      returnOuterAround(){
        var tl = new TimelineLite();
        tl.add(TweenLite.to(this.element, 0.5, {scale: 1.0}))
        switch (this.outer_state) {
          case 'Right':
            tl.add(this.goRight({
              duration: 1.0,
              rotation: this.rotation,
              swing: false,
              onComplete: (() => {
                this.selected = false;
                this.outer_tl.seek('Down').resume();
              }).bind(this)
            }));
            break;
          case 'Down':
            this.goDown({
              duration: 1.0,
              rotation: this.rotation,
              swing: false,
              onComplete: (() => {
                this.selected = false;
                TweenLite.to(this.element, 2, {scale: 1})
                this.outer_tl.seek('Left').resume();
              }).bind(this)
            });
            break;
          case 'Left':
            this.goLeft({
              duration: 1.0,
              rotation: this.rotation,
              swing: false,
              onComplete: (() => {
                this.selected = false;
                TweenLite.to(this.element, 2, {scale: 1})
                this.outer_tl.seek('Up').resume();
              }).bind(this)
            });
            break;
          case 'Up':
            this.goUp({
              duration: 1.0,
              rotation: this.rotation,
              swing: false,
              onComplete: (() => {
                this.selected = false;
                TweenLite.to(this.element, 2, {scale: 1})
                this.outer_tl.seek('Done').resume();
              }).bind(this)
            });
            break;
        }
      };
      createCloudElement(){
        var div = document.createElement('div')
        var svg_div = document.createElement('div')
        var text = document.createElement('div')
        var svg = document.createElementNS("http://www.w3.org/2000/svg", 'svg')
        var path = document.createElementNS("http://www.w3.org/2000/svg", 'path')
        var _img = document.createElement('img')
        div.id = "rcmnd";
        div.classList.add('rcmnd');
        div.setAttribute('draggable', true);
        svg_div.classList.add("cloud-div");
        text.className = "cloud_text flexiblebox";
        _img.className = "cloud_image flexiblebox";
        svg.setAttribute('xmlns', "http://www.w3.org/2000/svg");
        svg.setAttribute('xmlns:xlink', "http://www.w3.org/1999/xlink");
        svg.setAttribute("xml:space","preserve");
        svg.setAttribute('class', "cloud");
        svg.setAttribute('viewBox', "343.523 211.385 160.252 109.403");
        svg.setAttribute('style', "enable-background:new 343.523 211.385 160.252 109.403;");
        svg.setAttribute('width', "100%");
        svg.setAttribute('height', "100%");
        path.setAttribute('class', "st0")
        path.setAttribute('style', `fill: rgba(200, 200, 200, 0.6); stroke-width: 3px;`)
        path.setAttribute('d', `M491.348,254.364c0.067-0.643,0.1-1.294,0.1-1.954c0-10.53-8.537-19.068-19.068-19.068
              c-1.038,0-2.054,0.086-3.045,0.246c-1.761-6.571-7.741-11.417-14.868-11.417c-2.479,0-4.814,0.601-6.891,1.642
              c-7.422-7.661-17.812-12.428-29.319-12.428c-13.639,0-25.708,6.694-33.124,16.969c-1.776-0.51-3.65-0.789-5.59-0.789
              c-11.17,0-20.225,9.054-20.225,20.224c0,0.567,0.029,1.127,0.075,1.684c-9.136,2.431-15.869,10.757-15.869,20.659
              c0,9.252,5.879,17.131,14.105,20.108c-0.145,0.854-0.237,1.725-0.237,2.621c0,8.616,6.985,15.601,15.602,15.601
              c2.671,0,5.184-0.674,7.382-1.857c4.336,6.022,11.403,9.946,19.39,9.946c4.801,0,9.267-1.42,13.011-3.858
              c3.879,4.928,9.894,8.096,16.651,8.096c3.79,0,7.345-1,10.422-2.745c2.309,0.874,4.985,1.376,7.843,1.376
              c4.795,0,9.084-1.41,11.966-3.629c1.977,0.493,4.042,0.76,6.172,0.76c13.647,0,24.798-10.673,25.571-24.127
              c7.288-3.235,12.374-10.529,12.374-19.017C503.776,264.897,498.665,257.587,491.348,254.364z`);
        svg.appendChild(path)
        svg_div.appendChild(svg)
        div.appendChild(_img)
        div.appendChild(svg_div)
        div.appendChild(text)
        return div;
      }
    }
  })
})();
