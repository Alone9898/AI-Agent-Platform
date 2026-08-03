import {
  WebSearchProviderConfig,
  WebSearchRequest,
  WebSearchResponse,
} from './web-search.types';

export interface WebSearchProvider {
  search(
    request: WebSearchRequest,
    config: WebSearchProviderConfig,
  ): Promise<WebSearchResponse>;
}
