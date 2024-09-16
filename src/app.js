const { algoliasearch, instantsearch } = window;
const { autocomplete } = window['@algolia/autocomplete-js'];
const { createLocalStorageRecentSearchesPlugin } = window[
  '@algolia/autocomplete-plugin-recent-searches'
];
const { createQuerySuggestionsPlugin } = window[
  '@algolia/autocomplete-plugin-query-suggestions'
];

const searchClient = algoliasearch('AROI3326EO', 'bf66a313c7b870dcb2f6ca65ec2cbda8');

const search = instantsearch({
  indexName: 'Products',
  searchClient,
  future: { preserveSharedStateOnUnmount: true },
  insights: true,
});

const virtualSearchBox = instantsearch.connectors.connectSearchBox(() => {});

search.addWidgets([
  virtualSearchBox({}),
  instantsearch.widgets.hits({
    container: '#hits',
    templates: {
      item: (hit, { html, components }) => html`
<article class="hit">
  <div>
    <header class="hit-image-container">
      <img src="${hit.image}" alt="${hit.name}" class="hit-image" />
    </header>
    <p class="hit-category">${hit.categories[0]}</p>
    <h1><a href=${hit.url} target="_new" >${components.Highlight({ hit, attribute: 'name' })}</a></h1>
    <p class="hit-description">${components.Snippet({ attribute: 'description', hit })}</p>
    <p><strong>Price: </strong><span>$</span>${hit.price.toLocaleString()}</p>
    <p><strong>Rating: </strong>${hit.rating}</p>
  </div>
</article>
`,
    },
  }),
  instantsearch.widgets.configure({
    attributesToSnippet: ['description:20'],
    snippetEllipsisText: '…',
    hitsPerPage: 12,
  }),
  instantsearch.widgets.dynamicWidgets({
    container: '#dynamic-widgets',
    fallbackWidget({ container, attribute }) {
      return instantsearch.widgets.panel({ templates: { header: () => attribute } })(
        instantsearch.widgets.refinementList
      )({
        container,
        attribute,
      });
    },
    widgets: [
      container =>
        instantsearch.widgets.panel({
          templates: { header: () => 'Category' },
        })(instantsearch.widgets.refinementList)({
          container,
          attribute: 'categories',
        }),
      container =>
        instantsearch.widgets.panel({
          templates: { header: () => 'Brands' },
        })(instantsearch.widgets.refinementList)({
          container,
          attribute: 'brand',
        }),
      container =>
        instantsearch.widgets.panel({
          templates: { header: () => 'Type' },
        })(instantsearch.widgets.refinementList)({
          container,
          attribute: 'type',
        }),
        container =>
          instantsearch.widgets.panel({
            templates: { header: () => 'Price Range' },
          })(instantsearch.widgets.refinementList)({
            container,
            attribute: 'price_range',
          }),
    ],
  }),
  instantsearch.widgets.ratingMenu ({
    container: '#rating-menu',
    attribute: 'rating',
  }),
  instantsearch.widgets.pagination({
    container: '#pagination',
  }),
  instantsearch.widgets.stats({
    container: '#stats',
    templates: {
      text(hit, { html }) {
        return html `
          <em>
          <strong>${hit.nbHits}</strong> results found ${' '}
          ${hit.query != ''
            ? html`for <strong>"${hit.query}"</strong>`
            : html``}
          ${' '} in <strong>${hit.processingTimeMS}ms</strong>
          </em>`
      },
    },
  }),
  instantsearch.widgets.clearRefinements({
    container: '#clear-filters',
    templates: {
      text(hit, { html }){
        return html `
          <div data-widget="clear-filters" data-layout="desktop">
            <div class="ais-ClearRefinements">
              <button class="ais-ClearRefinements-button ais-ClearRefinements-button--disabled" disabled="">
                <div class="clear-filters">
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 11 11">
                    <g fill="none" fill-rule="evenodd" opacity=".4">
                      <path d="M0 0h11v11H0z">
                      </path>
                      <path fill="#000" fill-rule="nonzero" d="M8.26 2.75a3.896 3.896 0 1 0 1.102 3.262l.007-.056a.49.49 0 0 1 .485-.456c.253 0 .451.206.437.457 0 0 .012-.109-.006.061a4.813 4.813 0 1 1-1.348-3.887v-.987a.458.458 0 1 1 .917.002v2.062a.459.459 0 0 1-.459.459H7.334a.458.458 0 1 1-.002-.917h.928z">
                      </path>
                    </g>
                  </svg>
                  Clear filters
                </div>
              </button>
            </div>
          </div>      
        `
      }
    }
  }),
  instantsearch.widgets.sortBy ({
    container: '#sort-by',
    currentRefinement: "Products",
    items: [
      { label: 'Featured', value: 'Products' },
      { label: 'Lowest Price', value: 'products_price_asc' },
      { label: 'Highest Price', value: 'products_price_desc' },
    ],
  })
]);

search.start();

const recentSearchesPlugin = createLocalStorageRecentSearchesPlugin({
  key: 'instantsearch',
  limit: 3,
  transformSource({ source }) {
    return {
      ...source,
      onSelect({ setIsOpen, setQuery, item, event }) {
        onSelect({ setQuery, setIsOpen, event, query: item.label });
      },
    };
  },
});

const querySuggestionsPlugin = createQuerySuggestionsPlugin({
  searchClient,
  indexName: 'Products_query_suggestions',
  getSearchParams() {
    return recentSearchesPlugin.data.getAlgoliaSearchParams({ hitsPerPage: 6 });
  },
  transformSource({ source }) {
    return {
      ...source,
      sourceId: 'querySuggestionsPlugin',
      onSelect({ setIsOpen, setQuery, event, item }) {
        onSelect({ setQuery, setIsOpen, event, query: item.query });
      },
      getItems(params) {
        if (!params.state.query) {
          return [];
        }

        return source.getItems(params);
      },
    };
  },
});

autocomplete({
  container: '#searchbox',
  openOnFocus: true,
  detachedMediaQuery: 'none',
  onSubmit({ state }) {
    setInstantSearchUiState({ query: state.query });
  },
  plugins: [recentSearchesPlugin, querySuggestionsPlugin],
});

function setInstantSearchUiState(indexUiState) {
  search.mainIndex.setIndexUiState({ page: 1, ...indexUiState });
}

function onSelect({ setIsOpen, setQuery, event, query }) {
  if (isModifierEvent(event)) {
    return;
  }

  setQuery(query);
  setIsOpen(false);
  setInstantSearchUiState({ query });
}

function isModifierEvent(event) {
  const isMiddleClick = event.button === 1;

  return (
    isMiddleClick ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  );
}
