chrome.extension.onRequest.addListener(onRequest); // wait

var galleries = { // tab id : { urls: array of image urls, count: n, port: p }
};

// page has some links that may be images to show
function onRequest(request, sender, sendResponse) {
  triageURLs(sender.tab.id, request.urls);
  sendResponse({}); // (cleans connection)
}

// HTTP HEAD all links; filter by content-type: image/*
function triageURLs(tabId, urls) {
  register_gallery_listener(tabId);
  urls.forEach(bind(test_and_collect, null, tabId));
}
function test_and_collect(tabId, url, n) {
  http_head(url, bind(got_headers, null, tabId, n));
}
function got_headers(tabId, n, headers, url) {
  var type = headers.content_type;
  var image = type && /^image\//i.test(type);
  if (image) {
    collect_image(tabId, url, n);
  }
}
// start populating the gallery with all found images
function collect_image(tabId, url, n) {
  var pics = galleries[tabId];
  var urls = pics.urls;
  var first = !urls.length;
  urls[n] = url; // keep page's order
  if (first) {
    pics.count = 1;
    galleries[tabId] = pics;
    chrome.pageAction.show(tabId);
    chrome.pageAction.onClicked.addListener(showGallery);
  } else {
    pics.count++;
  }
  chrome.pageAction.setTitle({
    title: pics.count + ' image' + (pics.count==1 ? '' : 's') + ' linked' +
             ' (in tab ' + tabId + ')',
    tabId: tabId
  });
  if (pics.port)
    pics.port.postMessage({ type: 'image', url: url, n: n });
}

function register_gallery_listener(id) {
  var old = galleries[id];
  if (old) chrome.pageAction.onClicked.removeListener(showGallery);
  galleries[id] = { urls: [] };
}

// our icon has been clicked
function showGallery(tab) {
  try {
  var id = tab.id;
  var pics = galleries[id];
  var json = pics.off ? { type: 'show' } :
            pics.port ? { type: 'hide' } :
                        { type: 'list', urls: pics.urls, count: pics.count };
  var port = pics.port = pics.port || (function() {
    var port = chrome.tabs.connect(id, { name: 'cmd' });
    port.onDisconnect.addListener(function(json) {
      register_gallery_listener(id);
    });
    return port;
  })();
  pics.off = pics.hasOwnProperty('off') ? !pics.off : false;
  port.postMessage(json);
  } catch(e) { alert('instant gallery: '+ e.message); }
}

function http_head(url, cb) {
  var xhr = new XMLHttpRequest();
  xhr.open("HEAD", url, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4)
      cb(parse_headers(xhr.getAllResponseHeaders()), url);
  };
  xhr.send();
}

function parse_headers(raw) {
  var headers = {};
  raw.replace(/^\s*([^:\s]+)\s*:\s*([^\r\n]*)/gm, function(all, key, val) {
    headers[key.toLowerCase().replace(/-/g,'_')] = val;
  });
  return headers;
}

var _slice = Array.prototype.slice;
function bind(fn, self) {
  var args = [].slice.call(arguments, 2);
  return function() {
    fn.apply(self, args.concat(_slice.call(arguments)));
  };
}
