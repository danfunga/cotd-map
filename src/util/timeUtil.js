export function isRealtimeDayTime() {
    const h = new Date().getHours();
    return h >= 4 && h < 20
}

export function getCurrentMonth() {
    return new Date().getMonth();
}