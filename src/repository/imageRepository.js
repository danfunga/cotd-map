const ImageRepository = {

    getPortrait(mapId, entity) {
        return `./assets/maps/${mapId}/portraits/${entity.category}/${entity.id}.png`;
    },
    getFigure(mapId, entity) {
        return `./assets/maps/${mapId}/portraits/${entity.category}/figure/${entity.id}W.png`;
    },
    getEntitySpot(mapId, entity) {
        return `./assets/maps/${mapId}/portraits/${entity.category}/spot/${entity.id}P`;
    },
    getMonsterSpot(mapId, index) {
        return `./assets/maps/${mapId}/portraits/monster/spot/spot${index + 1}`;
    }
};

export default ImageRepository;
