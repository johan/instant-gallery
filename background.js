chrome.extension.onRequest.addListener(onRequest); // wait

var galleries = { // tab id : { urls: array of image urls, count: n, port: p }
};

// page has some links that may be images to show
function onRequest(request, sender, sendResponse) { try {
  triageURLs(sender.tab.id, request.urls);
  sendResponse({}); // (cleans connection)
  } catch(e) { alert(e.message); }
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
  if (!pics) return;
  var first = !pics.urls.length;
  if (first) {
    pics.count = 1;
    pics.port = open_port(tabId);
    galleries[tabId] = pics;
    chrome.pageAction.show(tabId);
    chrome.pageAction.onClicked.addListener(show_gallery);
  } else {
    pics.count++;
  }
  chrome.pageAction.setTitle({
    title: pics.count + ' image' + (pics.count==1 ? '' : 's') + ' linked' +
             ' (in tab ' + tabId + ')',
    tabId: tabId
  });
  pics.port.postMessage({ type: 'image', url: pics.urls[n] = url, n: n });
}

function register_gallery_listener(id) {
  //var old = galleries[id];
  //if (old) chrome.pageAction.onClicked.removeListener(show_gallery);
  galleries[id] = { urls: [] };
}

function open_port(id) {
  var port = chrome.tabs.connect(id, { name: 'page action' });
  port.onDisconnect.addListener(function() { delete galleries[id]; });
  return port;
}

// our icon has been clicked
function show_gallery(tab) {
  try {
    galleries[tab.id].port.postMessage({ type: 'toggle' });
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
