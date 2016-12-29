var input = document.getElementById('upload');
var output = document.getElementById('result');

//remove current mosaic when user clicks to upload new image
//also removes previous selected file input
input.onclick = function () { 
    this.value = null; 
    if(output.firstChild){
        output.removeChild(output.firstChild);
    }
}; 

//listener for change in file input
input.addEventListener('change',handleFiles);

//creates new image and loads it
//passes in the HTMLImage and the size to a new mosy type
function handleFiles(e) {
    var url = URL.createObjectURL(e.target.files[0]);
    var img = new Image();
    img.onload = function() {
        var photomosaic = new mosy({
            image: img,
            results: output,
            width: img.naturalWidth,
            height: img.naturalHeight
        }) 
    }
    img.src = url;   
}