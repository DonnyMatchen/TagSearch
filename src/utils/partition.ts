export default function partition<e>(array: e[], size: number): e[][] {
    let out: e[][] = [];
    let g: number = array.length % size;
    let h: number = (array.length - g) / size + (g == 0 ? 0 : 1);
    for (let i: number = 0; i < h; i++) {
        out[i] = [];
        for(let j: number = 0; j < size; j++) {
            out[i][j] = array[i * size + j];
        }
    }
    return out;
}