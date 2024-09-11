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
          templates: { header: () => 'format' },
        })(instantsearch.widgets.refinementList)({
          container,
          attribute: 'format',
        }),
      container =>
        instantsearch.widgets.panel({
          templates: { header: () => 'location' },
        })(instantsearch.widgets.refinementList)({
          container,
          attribute: 'location',
        }),
      container =>
        instantsearch.widgets.panel({
          templates: { header: () => 'programLevel' },
        })(instantsearch.widgets.refinementList)({
          container,
          attribute: 'programLevel',
        }),
    ],
  }),
  instantsearch.widgets.pagination({
    container: '#pagination',
  }),
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
  indexName: 'GVSU-Course-Catalog_query_suggestions',
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
