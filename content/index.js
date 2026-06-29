const maps = [
    {
        id: "01_marina",
        name: "Marina",
        dataPath: "./assets/maps/01_marina",
        imageWidth: 720,
        imageHeight: 720
    },
    {
        id: "02_paradise-island",
        name: "Paradise Island",
        dataPath: "./assets/maps/02_paradise-island",
        imageWidth: 1134,
        imageHeight: 1125
    },
    {
        id: "03_great-lakes",
        name: "Great Lakes",
        dataPath: "./assets/maps/03_great-lakes",
        imageWidth: 2477,
        imageHeight: 2475
    },
    {
        id: "04_costa-rica",
        name: "Costa Rica",
        dataPath: "./assets/maps/04_costa-rica",
        imageWidth: 2048,
        imageHeight: 2048
    },
    {
        id: "05_alaska",
        name: "Alaska",
        dataPath: "./assets/maps/05_alaska",
        imageWidth: 2048,
        imageHeight: 2048
    },
    {
        id: "06_australia",
        name: "Australia",
        dataPath: "./assets/maps/06_australia",
        imageWidth: 1000,
        imageHeight: 999
    },
    {
        id: "07_scotland",
        name: "Scotland",
        dataPath: "./assets/maps/07_scotland",
        imageWidth: 1125,
        imageHeight: 1125
    },
    {
        id: "08_thailand",
        name: "Thailand",
        dataPath: "./assets/maps/08_thailand",
        imageWidth: 1128,
        imageHeight: 1125
    },
    {
        id: "09_amazon",
        name: "Amazon",
        dataPath: "./assets/maps/09_amazon",
        imageWidth: 3000,
        imageHeight: 3000
    },
    {
        id: "v1_chemical-plant",
        name: "Chemical Plant",
        dataPath: "./assets/maps/v1_chemical-plant",
        imageWidth: 1200,
        imageHeight: 1200
    },
    {
        id: "v2_nuclear-plant",
        name: "Nuclear Plant",
        dataPath: "./assets/maps/v2_nuclear-plant",
        imageWidth: 3000,
        imageHeight: 3000
    },
    {
        id: "v3_petrochemical",
        name: "Petrochemical",
        dataPath: "./assets/maps/v3_petrochemical",
        imageWidth: 3000,
        imageHeight: 3000
    },
    {
        id: "v4_bermuda-triangle",
        name: "Bermuda Triangle",
        dataPath: "./assets/maps/v4_bermuda-triangle",
        imageWidth: 3000,
        imageHeight: 3000
    }
];

const mapsWithPaths = maps.map((map) => ({
    ...map,
    imagePath: `${map.dataPath}/background.jpg`,
    thumbnailPath: `${map.dataPath}/thumbnail.png`
}));

export const mapOrder = mapsWithPaths.map((map) => map.id);
export const mapsById = Object.fromEntries(mapsWithPaths.map((map) => [map.id, map]));
