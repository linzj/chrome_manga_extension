var imgs = document.querySelectorAll('img'); 
var ret = []; 
var maxSize = 0

var imgArray = []
for(var i = 0;i < imgs.length;++i) {
    imgArray.push(imgs[i])
}

function sortFunc(a,b) {
    var size1 = a.width * a.height
    var size2 = b.width * b.height
    return size2 - size1
}

imgArray.sort(sortFunc)

for (var i = 0;i < imgs.length && i < 10;++i) { 
    ret.push(imgs[i].src)
} 
ret; 
