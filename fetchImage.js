result = null;
var imgs = document.querySelectorAll('img[large]');
var hrefs = [];
for (i = 0; i < imgs.length; ++i) {
    hrefs.push(imgs[i].getAttribute('large'));
}
result = hrefs;
result;
