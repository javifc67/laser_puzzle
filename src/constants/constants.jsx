export const DEFAULT_APP_SETTINGS = {
  skin: "REALISTIC", //skin can be STANDARD
  backgroundImg: "NONE", //background can be "NONE" or a URL.
  showGrid: true,
};

export const ESCAPP_CLIENT_SETTINGS = {
  imagesPath: "./images/",
};
export const MAIN_SCREEN = "MAIN_SCREEN";

export const THEMES = {
  STANDARD: "STANDARD",
  REALISTIC: "REALISTIC",
};

export const THEME_ASSETS = {
  [THEMES.STANDARD]: {
    backgroundImg: "/images/bg_standard.png",
    gridPadding: { top: "0", right: "0", bottom: "0", left: "0" },
  },
  [THEMES.REALISTIC]: {
    backgroundImg: "/images/bg_standard.png",
    gridBackgroundImg: "/images/grid.png",
    canvasPadding: { top: "7.1%", right: "6.5%", bottom: "6.7%", left: "6.3%" },
    gridPadding: { top: "3.2%", right: "3.2%", bottom: "3.4%", left: "3.4%" },
    laserEmitterImg: "/images/laser.png",
    holeImg: "/images/hole.svg",
    receptorHoleImg: "/images/hole-green.svg",
    obstacleImg: "/images/obstacle.png",
    triangleImg: "/images/triangle.png",
    squareImg: "/images/square.png",
  },
};
