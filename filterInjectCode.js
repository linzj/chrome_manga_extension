var imgs = document.querySelectorAll('img'); 
var ret = []; 
var maxSize = 0
var ret = undefined

for (var i = 0;i < imgs.length;++i) 
{ 
    var img = imgs.item(i)
    size = img.width * img.height;
    if(maxSize < size) {
        ret = img.src
        maxSize = size
    }
} 
ret; 
