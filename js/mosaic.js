//constants shared between client and server.
var TILE_WIDTH = 16;
var TILE_HEIGHT = 16;

var exports = exports || null;
if (exports) {
  exports.TILE_WIDTH = TILE_WIDTH;
  exports.TILE_HEIGHT = TILE_HEIGHT;
}

//use to output debug info
var debug = false;

var window = window || null;

if (window) {
  (function (window) {

    //mosy constructor
    function mosy(options) {
      this.options = options;
      //begin Mosy
      this.startMosy();
    }

    //original uploaded image to a canvas rendering context 
    mosy.prototype.startMosy = function () {
      var options = this.options;

      //original size divided by tile size
      this.options.newWidth = ~~(this.options.width / TILE_WIDTH);
      this.options.newHeight = ~~(this.options.height / TILE_HEIGHT);

      //canvas size using new size 
      var canvas = document.createElement('canvas');
      canvas.width = TILE_WIDTH * options.newWidth;
      canvas.height = TILE_HEIGHT * options.newHeight;

      //context for processing and creating Mosy
      var context = canvas.getContext('2d');
      context.drawImage(options.image, 0, 0, canvas.width, canvas.height);

      //start processing context
      this.processCanvas(context);
    };

    //main process loop
    mosy.prototype.processCanvas = function (context) {
      var objectContext = this;

      //two canvas, one to draw tiles off-screen, and a canvas to add to the results div, when a row is complete
      var canvasToDisplay = document.createElement('canvas');
      var canvasToProcess = document.createElement('canvas');
      canvasToDisplay.width = canvasToProcess.width = context.canvas.width;
      canvasToDisplay.height = canvasToProcess.height = context.canvas.height;
      var contextToDisplay = canvasToDisplay.getContext('2d');
      var contextToProcess = canvasToProcess.getContext('2d');

      //original image color data that will be used to calculate average color
      var originalImageData = context.getImageData(0, 0, context.canvas.width, context.canvas.height);

      //takes tileData of avg hex value, x and y position and makes requests to server
      //receives svgData and sends it to a drawMosy function to draw each tile onto a canvas
      //returns promise so that each tile's process, that way all the promises can be accounted for before showing a row
      function processTile(tileData) {
        return new Promise(function (resolve, reject) {

          //get tile from server
          tileData['oCtx'].getTileFromServer(tileData['hex'], tileData['x'], tileData['y']).then(function (svgData) {
            //usingn tile from server, draw svg to canvas
            tileData['oCtx'].drawMosy(svgData[0], svgData[1], svgData[2], tileData['pCtx']).then(function (context) {
              //after processing and drawing a tile, resolve this promise
              var res = 'Processed Tile: ' + tileData['x'] + ', ' + tileData['y'];
              if (debug) { console.log(res) }
              resolve('Processed Tile');
            });

          });
        });
      }

      //function will calculate avg color for each tile in a row, and then map those values to the processTile function
      //all those mapped promises are sent using a promise.all which will wait for an entire row to be complete before displaying
      function eachRow(rowCount) {
        return function () {
          return new Promise(function (resolve, reject) {

            //iterate through the width of a row
            var tiles = [];
            for (var j = 0; j < objectContext.options.newWidth; j++) {
              //calculate tile position
              var x = j * TILE_WIDTH;
              var y = rowCount * TILE_HEIGHT;
              //get color data for that tile position
              var imageData = objectContext.getImageData(x, y, canvasToProcess.width, originalImageData);
              //calculate avg hex color for that color data
              var hexAverageColor = objectContext.getAverageColor(imageData);
              //push avg and position and context for later
              tiles.push({ 'hex': hexAverageColor, 'oCtx': objectContext, 'x': x, 'y': y, 'pCtx': contextToProcess });
            }

            //maps the processTile function to each tile position
            var readyToGoTiles = tiles.map(processTile);

            //waits for all tiles to complete in a row
            var rowComplete = Promise.all(readyToGoTiles).then(function () {
              //when the row is complete
              //take the unseen image data from the processing context and pass it to the displaying context
              var unseenImageData = contextToProcess.getImageData(0, 0, contextToProcess.canvas.width, contextToProcess.canvas.height);
              contextToDisplay.putImageData(unseenImageData, 0, 0);
              //update canvas results
              objectContext.options.results.appendChild(canvasToDisplay);
              if (debug) { console.log(rowComplete); }
              resolve('Done Row')
            });
            
          });
        }
      }

      //array of promises for each row
      var promiseArray = [];
      for (var rowCount = 0; rowCount < objectContext.options.newHeight; rowCount++) {
        promiseArray[rowCount] = eachRow(rowCount);
      }

      //an image with a large amount of tiles will lead to 10s of thousands of fetch calls
      //this will lead to rows being processed and the user waiting for the top row to finish
      //priority should be given to the top row to process, so the user doesnt have to wait to see results
      //iterate through promise array of rows and start processing tiles for each row
      promiseArray.reduce(function (cur, next) {
        return cur.then(next);
      }, promiseArray[0]()).then(function () {
        if (debug) { console.log("All done creating Mosy!") };
      });
    }

    //function to create promise for a server fetch of the tile color
    mosy.prototype.getTileFromServer = function (hexString, x, y) {
      return new Promise(function (resolve, reject) {

        //server call settings
        var fill = "";
        var url = "/color/" + hexString;
        var opts = {
          method: 'GET',
          headers: new Headers({
            'Content-Type': 'image/svg+xml'
          })
        };

        //fetch then parse results
        fetch(url, opts).then(function (response) {
          return response.text();
        })
          .then(function (body) {

            //parse svg element, and update svg tile size because server is not allowed to be edited
            var svg = (new DOMParser()).parseFromString(body, "text/xml");
            svg.rootElement.setAttribute('width', TILE_WIDTH);
            svg.rootElement.setAttribute('height', TILE_HEIGHT);

            //create image url for canvas to display
            //maybe this url should be deleted address should be deleted after drawing?
            var svg = 'data:image/svg+xml;base64,' + window.btoa(svg.rootElement.outerHTML);
            var data = [];

            //send back svg image and position for drawing
            data.push(svg);
            data.push(x);
            data.push(y);
            resolve(data);
          });

      });
    };

    //gets image data (considering TILE SIZE) for later rgb calculations from the original image
    mosy.prototype.getImageData = function (originX, originY, width, originalImageData) {

      var data = [];
      for (var x = originX; x < (originX + TILE_WIDTH); x++) {
        var posX = x * 4;
        for (var y = originY; y < (originY + TILE_HEIGHT); y++) {
          var posY = y * width * 4;
          data.push(
            originalImageData.data[posX + posY + 0],
            originalImageData.data[posX + posY + 1],
            originalImageData.data[posX + posY + 2],
            originalImageData.data[posX + posY + 3]
          );
        }
      }

      return data;
    };


    //calculates avg color for a position in the originalImageData
    mosy.prototype.getAverageColor = function (data) {

      //image data has 4 items, rgb and alpha
      var i = -4;
      var count = 0;
      var rgb = { r: 0, g: 0, b: 0 };
      var length = data.length;

      //add up total rgb count
      while ((i += 4) < length) {
        count++;
        rgb.r += data[i];
        rgb.g += data[i + 1];
        rgb.b += data[i + 2];
      }

      //floor the average values to give correct rgb values
      rgb.r = ~~(rgb.r / count);
      rgb.g = ~~(rgb.g / count);
      rgb.b = ~~(rgb.b / count);

      //rgb value to hex function
      function rgb2hex(rgb) {
        return (rgb) ? "" +
          ("0" + parseInt(rgb.r, 10).toString(16)).slice(-2) +
          ("0" + parseInt(rgb.g, 10).toString(16)).slice(-2) +
          ("0" + parseInt(rgb.b, 10).toString(16)).slice(-2) : '';
      }

      var hex = rgb2hex(rgb);
      return hex;
    };


    //takes svg image and draws to x,y in context
    mosy.prototype.drawMosy = function (svg, x, y, context) {
      return new Promise(function (resolve, reject) {

        var tile = new Image();
        tile.src = svg;
        tile.onload = function () {
          context.drawImage(tile, x, y);
          if (debug) { console.log(context); }
          resolve("Drew Tile!");
        }
        
      });
    };

    window.mosy = mosy;
  } (window));
}
