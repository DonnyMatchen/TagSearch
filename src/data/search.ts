export class SearchOptions {
    before?: number;
    after?: number;
}

export class SearchResults<E> {
    results: E[];
    pageLength: number;
    total: number;
    page: number;
    pageCount: number;

    constructor(results: E[], total: number, page: number, pageCount: number) {
        this.results = results;
        this.pageLength = results.length;
        this.total = total;
        this.page = page;
        this.pageCount = pageCount;
    }
}