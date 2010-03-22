var self = this, links, urls = [], count = 0, at, off, imgs = [];
setTimeout(function wait_for_content_scripts() { try {
  links = $x('//a[@href and .//img]');
  if (links.length) {
    chrome.extension.sendRequest({
      urls: links.map(function url(a) { return a.href; })
    });
    //chrome.extension.onRequest.addListener(onRequest);
  }
  chrome.extension.onConnect.addListener(function(port) {
    console.assert(port.name == 'page action');
    port.onMessage.addListener(function(json) {
      try {
        self['cmd_'+ json.type](json);
      } catch(e) { alert(e.message); }
    });
  });
} catch(e) { alert('instant gallery: '+ e.message); }}, 200);

function cmd_image(json) {
  if (!count++) {
    document.addEventListener('keydown', key_handler, true);
  }
  urls[json.n] = json.url;
  var img = document.createElement('img');
  img.src = json.url; // preload for speed
  imgs[json.n] = img; // and then cache it
}

function cmd_toggle() {
  if (off || off === undefined) cmd_show(); else cmd_hide();
}

function cmd_show() {
  show();
  off = false;
}

function cmd_hide() {
  if (show.img)
    show.img.parentNode.style.display = 'none';
  off = true;
}

function cmd_next() {
  show(get_next(1));
}

function cmd_prev() {
  show(get_next(-1));
}

var zoom = 0, full = 0; // view modes

function cmd_full() {
  full = !full;
  if (!zoom) zoom = 1;
  show();
}

function cmd_zoom() {
  zoom = !zoom;
  show();
}

function cmd_center(frac_x, frac_y) { try {
  var img = show.img || {};
  var ih = img.height, h = innerHeight;
  var iw = img.width,  w = innerWidth;
  if (iw && ih) {
    var y = (ih - h) * frac_y;
    var x = (iw - w) * frac_x;
    scrollTo(x, y);
  }
  } catch(e) { alert(e.message); }
}

function cmd_kill(code) {
  urls[at] = undefined;
  if (code == 8)
    cmd_prev();
  else
    cmd_next();
}

function get_next(add) {
  var max = links.length, left = max, i = at || -1;
  while (left--) {
    i = (i + (add || 1) + max) % max;
    var url = urls[i];
    if (url) {
      return at = i;
    }
  }
}

function show(i) {
  if (undefined === i) i = 'undefined' == typeof at ? get_next() : at;
  var img = show.img || (function() {
    var d = document.createElement('div');
    document.body.appendChild(d);
    d.style.cssText = 'width: 100%; height: 100%; position: absolute; top: 0;' +
      'left: 0; background: #000; z-index: 2147483646; text-align: center; ' +
      'margin: 0 auto;';
    var img = show.img = document.createElement('img');
    return d.appendChild(img);
  })();
  var url = urls[i];
  img.src = url;
  img.parentNode.style.display = '';
  stretch(img);
}

function stretch(img) {
  if (!img.orig_width) {
    img.orig_w  = img.width;
    img.orig_h = img.height;
  }
  var w = 'auto', h = 'auto';
  if (zoom) {
    if ((img.orig_w / innerWidth <
         img.orig_h / innerHeight) ^ (full || zoom == 2) ) {
      h = innerHeight + 'px';
    } else {
      w = innerWidth + 'px';
    }
  }
  img.style.width  = w;
  img.style.height = h;
}

var commands = {
  'b': 'prev', 37: 'prev',   // arrow left
  ' ': 'next', 39: 'next',   // arrow right
               27: 'toggle', // escape
    8: "kill", 46: 'kill',   // backspace / delete
  'X': ['center', 1/2, 1/4],
  'C': ['center', 1/2, 2/4],
  'V': ['center', 1/2, 3/4],
  'B': ['center', 1/2, 4/4],
  'F': 'full',
  'Z': 'zoom',
  'N': 'zoom'
};

function key_handler(e) {
  if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey ||
      /^(textarea|input|button|select)$/i.test(e.target.nodeName))
    return;
  try {
  var key = String.fromCharCode(e.which), code = e.keyCode;
  var cmd = commands[code] || commands[key];
  if (cmd && is_on(cmd)) {
    e.preventDefault();
    cmd = 'string' == typeof cmd ? [cmd] : cmd.concat();
    var fn = self['cmd_'+ cmd.shift()];
    fn.apply(self, cmd.concat(code, key));
  }
  } catch(e) { alert(e.messag); }
  return;
}

function is_on(cmd) {
  if ('boolean' == typeof off) return !off || 'toggle' === cmd;
  if ('string' !== typeof cmd) return false;
  return /^(prev|next)$/.test(cmd) && !(off = false);
}
