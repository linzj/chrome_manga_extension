var imgs = document.querySelectorAll('img'); 
var ret = []; 
for (var i = 0;i < imgs.length;++i) 
{ 
    var img = imgs.item(i); 
    ret.push(img.src); 
} 
ret; 
