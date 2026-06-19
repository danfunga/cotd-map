const maps = [
    {
        id: "01_marina",
        name: "Marina",
        imagePath: "./assets/maps/01_marina/background.jpg",
        thumbnailPath:"./assets/maps/01_marina/thumbnail.png",
        imageWidth: 720,
        imageHeight: 720,
        dataPath: "./assets/maps/01_marina"
    },
    {
        id: "02_paradise-island",
        name: "Paradise Island",
        imagePath: "./assets/maps/02_paradise-island/background.jpg",
        thumbnailPath:"./assets/maps/02_paradise-island/thumbnail.png",
        imageWidth: 1134,
        imageHeight: 1125,
        dataPath: "./assets/maps/02_paradise-island"
    },
    {
        id: "03_great-lakes",
        name: "Great Lakes",
        imagePath: "./assets/maps/03_great-lakes/background.jpg",
        thumbnailPath:"./assets/maps/03_great-lakes/thumbnail.png",
        imageWidth: 2477,
        imageHeight: 2475,
        dataPath: "./assets/maps/03_great-lakes"
    },
    {
        id: "04_costa-rica",
        name: "Costa Rica",
        imagePath: "./assets/maps/04_costa-rica/background.jpg",
        thumbnailPath:"./assets/maps/04_costa-rica/thumbnail.png",
        imageWidth: 2048,
        imageHeight: 2048,
        dataPath: "./assets/maps/04_costa-rica"
    },
    {
        id: "05_alaska",
        name: "Alaska",
        imagePath: "./assets/maps/05_alaska/background.jpg",
        thumbnailPath:"./assets/maps/05_alaska/thumbnail.png",
        imageWidth: 2048,
        imageHeight: 2048,
        dataPath: "./assets/maps/05_alaska"
    },
    {
        id: "06_australia",
        name: "Australia",
        imagePath: "./assets/maps/06_australia/background.jpg",
        thumbnailPath:"./assets/maps/06_australia/thumbnail.png",
        imageWidth: 1000,
        imageHeight: 999,
        dataPath: "./assets/maps/06_australia"
    },
    {
        id: "07_scotland",
        name: "Scotland",
        imagePath: "./assets/maps/07_scotland/background.jpg",
        thumbnailPath:"./assets/maps/07_scotland/thumbnail.png",
        imageWidth: 1125,
        imageHeight: 1125,
        dataPath: "./assets/maps/07_scotland"
    },
    {
        id: "08_thailand",
        name: "Thailand",
        imagePath: "./assets/maps/08_thailand/background.jpg",
        thumbnailPath:"./assets/maps/08_thailand/thumbnail.png",
        imageWidth: 1128,
        imageHeight: 1125,
        dataPath: "./assets/maps/08_thailand"
    },
    {
        id: "09_amazon",
        name: "Amazon",
        imagePath: "./assets/maps/09_amazon/background.jpg",
        thumbnailPath:"./assets/maps/09_amazon/thumbnail.png",
        imageWidth: 3000,
        imageHeight: 3000,
        dataPath: "./assets/maps/09_amazon"
    },
    {
        id: "v1_chemical-plant",
        name: "Chemical Plant",
        imagePath: "./assets/maps/v1_chemical-plant/background.jpg",
        thumbnailPath:"./assets/maps/v1_chemical-plant/thumbnail.png",
        imageWidth: 1200,
        imageHeight: 1200,
        dataPath: "./assets/maps/v1_chemical-plant"
    },
    {
        id: "v2_nuclear-plant",
        name: "Nuclear Plant",
        imagePath: "./assets/maps/v2_nuclear-plant/background.jpg",
        thumbnailPath:"./assets/maps/v2_nuclear-plant/thumbnail.png",
        imageWidth: 3000,
        imageHeight: 3000,
        dataPath: "./assets/maps/v2_nuclear-plant"
    },
    {
        id: "v3_petrochemical",
        name: "Petrochemical",
        imagePath: "./assets/maps/v3_petrochemical/background.jpg",
        thumbnailPath:"./assets/maps/v3_petrochemical/thumbnail.png",
        imageWidth: 3000,
        imageHeight: 3000,
        dataPath: "./assets/maps/v3_petrochemical"
    },
    {
        id: "v4_bermuda-triangle",
        name: "Bermuda Triangle",
        imagePath: "./assets/maps/v4_bermuda-triangle/background.jpg",
        thumbnailPath:"./assets/maps/v4_bermuda-triangle/thumbnail.png",
        imageWidth: 3000,
        imageHeight: 3000,
        dataPath: "./assets/maps/v4_bermuda-triangle"
    }
];

export const mapOrder = maps.map((map) => map.id);
export const mapsById = Object.fromEntries(maps.map((map) => [map.id, map]));
