//Copy this file to config.js and specify your own settings

export let ESCAPP_APP_SETTINGS = {
  //Settings that can be specified by the authors
  // backgroundImg: "https://ejemplo.com/fondo.jpg",
  showGrid: true,
  skin: "METALLIC", // Can be "STANDARD", "WOOD" or "METALLIC"
  cols: 6,
  rows: 6,
  allowRotate: true, //For all movable objects
  // Base object behavior; item-specific settings take precedence.
  allowMoveObjects: false,
  allowMoveObstacles: true,
  obstacles: [{ label: "A", x: 0, y: 2, angle: 0, allowMove: true }],
  objects: [{ label: "Aasdasd", type: "SQUARE", x: 2, y: 4, angle: 45, allowMove: true },
  { color: "yellow", label: "A", type: "SQUARE", x: 2, y: 3, angle: 0, allowMove: true },
  { label: "B", type: "TRIANGLE", x: 4, y: 4, angle: 30, allowMove: true },
  { label: "C", ico: "Puzzle", type: "TRIANGLE", x: 4, y: 3, angle: 60, allowMove: true },
  { color: "green", ico: "Circle", type: "TRIANGLE", x: 3, y: 4, angle: 90, allowMove: true },
  { type: "TRIANGLE", x: 3, y: 3, angle: 0, allowMove: true, img: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Led_light_bulb_-_led_lamp_2.png/640px-Led_light_bulb_-_led_lamp_2.png" }],
  transmitter: { x: 0, y: 0, angle: 90, allowMove: true, style: "hole" }, // style can be "object" or "hole"
  receptor: { x: 5, y: 5, angle: 180, allowMove: true, style: "hole" },

  //Settings that will be automatically specified by the Escapp server
  locale: "es",
  solutionLength: 1,
  escappClientSettings: {
    endpoint: "https://escapp.es/api/escapeRooms/id",
    linkedPuzzleIds: [1],
    rtc: false,
  },
};
