export const DEFAULT_APP_SETTINGS = {
  skin: "WOOD", //skin can be STANDARD
  backgroundImg: "NONE", //background can be "NONE" or a URL.
  showGrid: true,
};

export const ESCAPP_CLIENT_SETTINGS = {
  imagesPath: "./images/",
};
export const MAIN_SCREEN = "MAIN_SCREEN";

export const THEMES = {
  STANDARD: "STANDARD",
  WOOD: "WOOD",
  METALLIC: "METALLIC",
};

export const THEME_ASSETS = {
  [THEMES.STANDARD]: {
    backgroundImg: "/images/bg_standard.png",
    gridPadding: { top: "0", right: "0", bottom: "0", left: "0" },
  },
  [THEMES.WOOD]: {
    backgroundImg: "/images/bg_wood.png",
    gridBackgroundImg: "/images/grid.png",
    canvasPadding: { top: "7.1%", right: "6.5%", bottom: "6.7%", left: "6.3%" },
    gridPadding: { top: "3.2%", right: "3.2%", bottom: "3.4%", left: "3.4%" },
    holeImg: "/images/hole.svg",
    receptorHoleImg: "/images/hole-green.svg",
    obstacleImg: "/images/obstacle.png",
    triangleImg: "/images/triangle.png",
    squareImg: "/images/square.png",
    transmitterHoleImg: "/images/hole.svg",
    receptorHoleImg: "/images/hole-green.svg",
    transmitterObjectImg: "/images/laser.png",
  },
  [THEMES.METALLIC]: {
    backgroundImg: "/images/bg_metallic.png",
    gridBackgroundImg: "/images/grid_metallic.png",
    canvasPadding: { top: "8.5%", right: "8.5%", bottom: "8%", left: "8.3%" },
    gridPadding: { top: "4%", right: "4.5%", bottom: "5%", left: "4.8%" },
    holeImg: "/images/hole.svg",
    receptorHoleImg: "/images/hole-green.svg",
    obstacleImg: "/images/obstacle_metallic.png",
    triangleImg: "/images/triangle_metallic.png",
    squareImg: "/images/square_metallic.png",
    transmitterHoleImg: "/images/hole.svg",
    receptorHoleImg: "/images/hole-green.svg",
    transmitterObjectImg: "/images/laser.png",
  },
};
