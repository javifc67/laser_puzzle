//Copy this file to config.js and specify your own settings

export let ESCAPP_APP_SETTINGS = {
  //Settings that can be specified by the authors
  cols: 6,
  rows: 6,
  allowRotate: true,
  allowMoveObjects: true,
  allowMoveObstacles: true,
  obstacles: [{ label: "A", x: 0, y: 2, angle: 0, allowMove: false }],
  objects: [{ label: "Aasdasd", type: "SQUARE", x: 2, y: 4, angle: 45, allowMove: true },
  { color: "yellow", label: "A", type: "SQUARE", x: 2, y: 3, angle: 90, allowMove: true },
  { label: "A", type: "TRIANGLE", x: 4, y: 4, angle: 30, allowMove: true },
  { label: "A", type: "TRIANGLE", x: 4, y: 3, angle: 60, allowMove: true },
  { color: "green", label: "A", type: "TRIANGLE", x: 3, y: 4, angle: 90, allowMove: true },
  { label: "A", type: "TRIANGLE", x: 3, y: 3, angle: 0, allowMove: true }],
  transmitter: { label: "A", x: 0, y: 0, angle: 0, allowMove: false },
  receptor: { label: "A", x: 0, y: 5, allowMove: true },


  escappClientSettings: {
    endpoint: "https://escapp.es/api/escapeRooms/id",
    linkedPuzzleIds: [1],
    rtc: false,
  },
};
