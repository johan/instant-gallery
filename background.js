chrome.extension.onRequest.addListener(onRequest); // wait

var inspecting = { // tab id : array of that tab's (maybe-)image urls
};

// page has some links that may be images to show
function onRequest(request, sender, sendResponse) {
  triageURLs(sender.tab.id, request.urls);
  sendResponse({}); // (cleans connection)
}

// HTTP HEAD all links; filter by content-type: image/*
function triageURLs(tabId, urls) {
  delete inspecting[tabId]; // presumably a new page
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
  var urls = inspecting[tabId] || [];
  var first = !urls.length;
  urls[n] = url; // keep page's order
  if (first) {
    urls.count = 1;
    inspecting[tabId] = urls;
    chrome.pageAction.show(tabId);
    chrome.pageAction.onClicked.addListener(showGallery);
  } else {
    urls.count++;
  }
  chrome.pageAction.setTitle({
    title: urls.count + ' image' + (urls.count==1 ? '' : 's') + ' linked' +
             ' (in tab ' + tabId + ')',
    tabId: tabId
  });
}

// our icon has been clicked
function showGallery(tab) {
  chrome.pageAction.hide(tab.id);
  // FIXME: tell page to show gallery
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
