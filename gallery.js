var links = $x('//a[@href and .//img]'), self = this, urls, count, at;
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
        self['got_'+ json.type](json);
      } catch(e) { alert(e.message); }
    });
  });
} catch(e) { alert('instant gallery: '+ e.message); }

function got_show() {
  show();
}

function got_hide() {
  if (show.img)
    show.img.parentNode.style.display = 'none';
}

function got_list(json) {
  count = json.count;
  urls = json.urls;
  show_first();
}

function got_image(json) {
  count++;
  urls[json.n] = json.url;
  show_first();
}

function show_first() {
  if (at !== undefined) return;
  for (var i = 0; i < links.length; i++) {
    var url = urls[i];
    if (url) {
      show(at = i);
      break;
    }
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
}
