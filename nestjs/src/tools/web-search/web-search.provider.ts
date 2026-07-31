import { WebSearchRequest, WebSearchResponse } from './web-search.types';

export interface WebSearchProvider {
  search(request: WebSearchRequest): Promise<WebSearchResponse>;
}
