var links = $x('//a[@href and .//img]'), self = this, urls, count, at, off;
if (links.length) {
  chrome.extension.sendRequest({
    urls: links.map(function url(a) { return a.href; })
  });
  //chrome.extension.onRequest.addListener(onRequest);
}

try {
  chrome.extension.onConnect.addListener(function(port) {
    console.assert(port.name == 'cmd');
    port.onMessage.addListener(function(json) {
      try {
        self['cmd_'+ json.type](json);
      } catch(e) { alert(e.message); }
    });
  });
} catch(e) { alert('instant gallery: '+ e.message); }

function cmd_list(json) {
  count = json.count;
  urls = json.urls;
  show_next('first');
}

function cmd_image(json) {
  count++;
  urls[json.n] = json.url;
  show_next('first');
}

function cmd_toggle() {
  if (off) cmd_show(); else cmd_hide();
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
  show_next();
}

function cmd_prev() {
  show_next(false, -1);
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

function kill() {
  urls[at] = undefined;
  cmd_next();
}

function show_next(first, add) {
  if (first && at !== undefined) return;
  var max = links.length, left = max, i = at || -1;
  while (left--) {
    i = (i + (add || 1) + max) % max;
    var url = urls[i];
    if (url) {
      show(at = i);
      break;
    }
  }
  if (first) {
    document.addEventListener('keydown', key_handler, true);
  }
}

function show(i) {
  if (undefined === i) i = at;
  var img = show.img || (function() {
    var d = document.createElement('div');
    document.body.appendChild(d);
    d.style.cssText = 'width: 100%; height: 100%; position: absolute; top: 0;' +
      'left: 0; background: #000; margin: 0 auto; text-align: center;';
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
               46: 'kill',   // delete
  'F': 'full',
  'Z': 'zoom',
  'N': 'zoom'
};

function key_handler(e) {
  if (off || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey ||
      /^(textarea|input|button|select)$/i.test(e.target.nodeName))
    return true;

  var cmd = commands[e.keyCode] || commands[String.fromCharCode(e.which)];
  if (cmd) {
    e.preventDefault();
    self['cmd_'+ cmd]();
  }
  return !cmd;
}
