import { Deck } from '@deck.gl/core'
import { AmbientLight, PointLight, LightingEffect } from '@deck.gl/core'
import { Matrix4 } from '@math.gl/core'
import {PolygonLayer} from '@deck.gl/layers';
import {TripsLayer} from '@deck.gl/geo-layers';
import { DeckGL } from 'deck.gl';
import { LineLayer } from '@deck.gl/layers';


const DATA_URL = {
  BUILDINGS:
    'https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/trips/buildings.json', // eslint-disable-line
  TRIPS: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/trips/trips-v7.json' // eslint-disable-line
};


const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 1.0
});

const pointLight = new PointLight({
  color: [255, 255, 255],
  intensity: 2.0,
  position: [-74.05, 40.7, 8000]
});

const lightingEffect = new LightingEffect({ambientLight, pointLight});


const material = {
  ambient: 0.1,
  diffuse: 0.6,
  shininess: 32,
  specularColor: [60, 64, 70]
};

const DEFAULT_THEME = {
  buildingColor: [255, 172 ,0],
  trailColor0: [255, 0, 0],
  trailColor1: [179, 0, 255],
  material,
  effects: [lightingEffect]
};

let animationSpeed  = 1;
const LOOP_LENGTH = 1800;
const ANIMATION_SPEED = 0.4;
let animation = {};
let time = 0;
function animate() {
  time = (time + ANIMATION_SPEED) % LOOP_LENGTH;
  window.requestAnimationFrame(animate);
}
const landCover = [
  [
    [-74.0, 40.7],
    [-74.02, 40.7],
    [-74.02, 40.72],
    [-74.0, 40.72]
  ]
];

let trailLength = 1800;
// const layerData = geojsonTripsData.map(f => ({
//   vendor: f.vendor,
//   timestamps: f.timestamps,
//   path: f.path[0]
// }));
const staticLayers = [
  new PolygonLayer({
    id: 'ground',
    data: landCover,
    getPolygon: f => f,
    stroked: false,
    getFillColor: [0, 0, 0, 0]
  }),
  new PolygonLayer({
    id: 'buildings',
    data: DATA_URL.BUILDINGS,
    extruded: true,
    wireframe: false,
    opacity: 0.5,
    getPolygon: f => f.polygon,
    getElevation: f => f.height,
    getFillColor: DEFAULT_THEME.buildingColor,
    material: DEFAULT_THEME.material
  })
  
]


const mapContainer = document.getElementById("map")
const deckContainer = createDeckContainer()

/** Method callback */
window.initMap = async () => {
  /** Map View */
  const map = new map4d.Map(mapContainer, {
    center: [-74, 40.72],
    tilt: 30,
    zoom: 15,
    controls: true,
    mapType: "roadmap",
    bearing: 0
  })




  /** DeckGL Overlay */
  const deck = new Deck({
    parent: deckContainer,
    viewState: getViewState(map),
    effects: DEFAULT_THEME.effects
  })

  setInterval(() => {
    deck.setProps({
      layers: [
        ...staticLayers,
        new TripsLayer({
          id: 'trips-layer',
          data: DATA_URL.TRIPS,
          getPath: d => d.path,
          getTimestamps: d => d.timestamps,
          getColor: d => (d.vendor === 0 ? DEFAULT_THEME.trailColor0 : DEFAULT_THEME.trailColor1),
          opacity: 0.3,
          widthMinPixels: 2,
          rounded: true,
          trailLength: 180,
          currentTime: time,
          shadowEnabled: false
        })
      ]
    });
  }, 50);
  
  window.requestAnimationFrame(animate);
  /** WebGL Overlay */
  const webGLOverlay = new map4d.WebGLOverlayView({
    onAdd: (map, gl) => {
      appendDeckContainer()
    },
    onDraw: (gl) => {
      deck.setProps({ viewState: getViewState(map) })
      if (deck.isInitialized) {
        deck.redraw()
      }
    }
  })
  webGLOverlay.setMap(map)

  /** Map Events */
  map.addListener("click", (args) => handleMouseEvent(deck, "click", args))
  map.addListener("dblClick", (args) => handleMouseEvent(deck, "dblClick", args))
}
window.addEventListener("resize", updateDeckContainerSize, false)


function handleMouseEvent(_deck, type, args) {
  const deck = _deck
  if (!deck.isInitialized) {
    return
  }

  const mockEvent = {
    type,
    offsetCenter: args.pixel,
    srcEvent: args.xa
  }

  switch (type) {
    case 'click':
      mockEvent.type = 'click'
      mockEvent.tapCount = 1
      deck._onPointerDown(mockEvent)
      deck._onEvent(mockEvent)
      break

    case 'dblClick':
      mockEvent.type = 'click'
      mockEvent.tapCount = 2
      deck._onEvent(mockEvent)
      break

    default:
      return
  }
}

function getViewState(map) {
  const camera = map.getCamera()

  const width = mapContainer.offsetWidth
  const height = mapContainer.offsetHeight

  const fovy = 30
  const near = 0.1
  const far = 1000
  const aspect = height ? width / height : 1

  const projectionMatrix = new Matrix4().perspective({
    fovy: (fovy * Math.PI) / 180,
    aspect,
    near,
    far
  })
  const focalDistance = 0.5 * projectionMatrix[5]

  const viewState = {
    longitude: ((camera.target.lng + 540) % 360) - 180,
    latitude: camera.target.lat,
    zoom: camera.getZoom() - 1,
    bearing: camera.getBearing(),
    pitch: camera.getTilt(),
    altitude: focalDistance,
    projectionMatrix
  }

  return viewState
}

function createDeckContainer() {
  const container = document.createElement('div')
  Object.assign(container.style, {
    position: 'absolute',
    left: 0,
    top: 0,
    pointerEvents: 'none'
  })

  return container
}

function appendDeckContainer() {
  const deckOverlayContainer = document.createElement('div')
  deckOverlayContainer.setAttribute("id", "deck-overlay")
  deckOverlayContainer.appendChild(deckContainer)
  mapContainer.appendChild(deckOverlayContainer)
  updateDeckContainerSize()
}

function updateDeckContainerSize() {
  if (mapContainer && deckContainer) {
    const clientWidth = mapContainer.offsetWidth
    const clientHeight = mapContainer.offsetHeight
    Object.assign(deckContainer.style, {
      width: `${clientWidth}px`,
      height: `${clientHeight}px`
    })
  }
}

// window.addEventListener('load', function() {
//   const mode = document.querySelector('.btn');
//   console.log(mode);
//   let modeData = mode.getAttribute('data-mode');
//   mode.addEventListener('click', function(event) {
//     const mode = event.currentTarget.getAttribute('data-mode');
//     if(mode === 'map3d') {
//       event.currentTarget.setAttribute('data-mode','roadmap')
//     }
//   })

// })