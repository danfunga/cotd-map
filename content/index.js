const maps = [
  {
    id: "marina",
    name: "Marina",
    imagePath: "./assets/maps/marina/background.jpg",
    imageWidth: 720,
    imageHeight: 720,
    dataPath: "./assets/maps/marina/data"
  },
  {
    id: "paradise-island",
    name: "Paradise Island",
    imagePath: "./assets/maps/paradise-island/background.jpg",
    imageWidth: 1134,
    imageHeight: 1125,
    dataPath: "./assets/maps/paradise-island/data"
  },
  {
    id: "great-lakes",
    name: "Great Lakes",
    imagePath: "./assets/maps/great-lakes/background.jpg",
    imageWidth: 2477,
    imageHeight: 2475,
    dataPath: "./assets/maps/great-lakes/data"
  },
  {
    id: "costa-rica",
    name: "Costa Rica",
    imagePath: "./assets/maps/costa-rica/background.jpg",
    imageWidth: 2048,
    imageHeight: 2048,
    dataPath: "./assets/maps/costa-rica/data"
  },
  {
    id: "alaska",
    name: "Alaska",
    imagePath: "./assets/maps/alaska/background.jpg",
    imageWidth: 2048,
    imageHeight: 2048,
    dataPath: "./assets/maps/alaska/data"
  },
  {
    id: "australia",
    name: "Australia",
    imagePath: "./assets/maps/australia/background.jpg",
    imageWidth: 1000,
    imageHeight: 999,
    dataPath: "./assets/maps/australia/data"
  },
  {
    id: "scotland",
    name: "Scotland",
    imagePath: "./assets/maps/scotland/background.jpg",
    imageWidth: 1125,
    imageHeight: 1125,
    dataPath: "./assets/maps/scotland/data"
  },
  {
    id: "thailand",
    name: "Thailand",
    imagePath: "./assets/maps/thailand/background.jpg",
    imageWidth: 1128,
    imageHeight: 1125,
    dataPath: "./assets/maps/thailand/data"
  },
  {
    id: "amazon",
    name: "Amazon",
    imagePath: "./assets/maps/amazon/background.jpg",
    imageWidth: 3000,
    imageHeight: 3000,
    dataPath: "./assets/maps/amazon/data"
  },
  {
    id: "chemical-plant",
    name: "Chemical Plant",
    imagePath: "./assets/maps/chemical-plant/background.jpg",
    imageWidth: 1200,
    imageHeight: 1200,
    dataPath: "./assets/maps/chemical-plant/data"
  },
  {
    id: "nuclear-plant",
    name: "Nuclear Plant",
    imagePath: "./assets/maps/nuclear-plant/background.jpg",
    imageWidth: 3000,
    imageHeight: 3000,
    dataPath: "./assets/maps/nuclear-plant/data"
  },
  {
    id: "petrochemical",
    name: "Petrochemical",
    imagePath: "./assets/maps/petrochemical/background.jpg",
    imageWidth: 3000,
    imageHeight: 3000,
    dataPath: "./assets/maps/petrochemical/data"
  },
  {
    id: "bermuda-triangle",
    name: "Bermuda Triangle",
    imagePath: "./assets/maps/bermuda-triangle/background.jpg",
    imageWidth: 3000,
    imageHeight: 3000,
    dataPath: "./assets/maps/bermuda-triangle/data"
  }
];

export const mapOrder = maps.map((map) => map.id);
export const mapsById = Object.fromEntries(maps.map((map) => [map.id, map]));
