title: Mosy v1 - the pure js mosaic image creator
author: steven jacob
------------------------------------------

Suggested 3 Hour Time Functionality Results:

- upload image
- calculate avg rgb data
- convert rgb to hex
- fetch tile from server
- draw tiles using html5 canvas circles
- use promises to wait for all tiles in a row to process and complete
- promise on each row sequentially 
- otherwise 10000s of fetch calls were made for large images or small tiles and insufficient resources was an issue
- this also lets the user see the mosaic image load sooner than later, as the image is not trying to process bottom rows until the top rows finish
- display updated canvas on app

Desired Functionality with more development time:

- Clientjs creates Mosaicjs as a worker, and would have to communicate between "mosy" worker and the spawn
- this would help divide responsbility of DOM Manipulation to clientjs and not in mosaicjs
- lets user interact with UI while intense processing in background
- could help with insufficient browser memory for insane amounts of tile server requests, maybe worker for each row?
