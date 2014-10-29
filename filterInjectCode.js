var imgs = document.querySelectorAll(__my_img_selector__);
var maxSize = 0

var imgArray = []
for(var i = 0; i < imgs.length; ++i) {
    imgArray.push(imgs[i].src)
}

var ret = imgArray
ret; 
