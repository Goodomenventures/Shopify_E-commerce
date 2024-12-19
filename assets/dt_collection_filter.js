const debounce = (func, delay) => {
    let debounceTimer
    return function() {
        const context = this
        const args = arguments
            clearTimeout(debounceTimer)
                debounceTimer
            = setTimeout(() => func.apply(context, args), delay)
    }
};

class CollectionFiltersForm extends HTMLElement {
    constructor() {      
        super();
        this.filterData = [];
        this.onActiveFilterClick = this.onActiveFilterClick.bind(this);
     
        this.debouncedOnSubmit = debounce((event) => {
            event.preventDefault();
            this.onSubmitHandler(event);
          }, 0);
        
        document.querySelector('#CollectionFiltersForm').addEventListener('input', this.onSubmitHandler);
        window.addEventListener('popstate', this.onHistoryChange.bind(this));
    
        this.bindActiveFacetButtonEvents();
    }

    onSubmitHandler(event) {
        event.preventDefault();
        const formAction = event.target.closest('form').action;
        const formData = new FormData(event.target.closest('form'));
        const searchParams = new URLSearchParams(formData).toString();        
        dTRenderCollection(formAction, searchParams, event);
    }

    onActiveFilterClick(event) {
        event.preventDefault();
        this.toggleActiveFacets();
        const targetURL = event.target.href;
        this.renderPage(targetURL, new URL(event.target.href).searchParams.toString());
    }

    onHistoryChange(event) {
        const searchParams = event.state?.searchParams || '';
        const targetURL = event.target.href;

        this.renderPage(targetURL, searchParams, null, false);
    }

    bindActiveFacetButtonEvents() {
        document.querySelectorAll('.js-facet-remove').forEach((element) => {
            element.addEventListener('click', this.onActiveFilterClick, { once: false });
        });
    }

    toggleActiveFacets(disable = true) {}   
    

    renderPage(targetURL, searchParams, event, updateURLHash = true) {
        const sections = [1];
      //  document.querySelector('.collection-grid').querySelector('#dT_collectionGrid').classList.add('loading');
      
      if(targetURL !== undefined) {    
        targetURL = targetURL.split("?");
        targetURL = targetURL[0].trim()+"?";
    
        sections.forEach((section) => {
            const url = `${targetURL}&${searchParams}`;
            const filterDataUrl = element => element.url === url;
      
            this.filterData.some(filterDataUrl) ?
              this.renderSectionFromCache(filterDataUrl, section, event) :
              this.renderSectionFromFetch(url, section, event);
        });
      
    
        if (updateURLHash) this.updateURLHash(searchParams);
      }
    } 

    renderSectionFromFetch(url, section, event) {
        fetch(url)
            .then(response => response.text())
            .then((responseText) => {
            const html = responseText;
            this.filterData = [...this.filterData, { html, url }];
            this.renderFilters(html, event);
            this.renderProductGrid(html);
            });
    }
    
    renderSectionFromCache(filterDataUrl, section, event) {
        const html = this.filterData.find(filterDataUrl).html;
        this.renderFilters(html, event);
        this.renderProductGrid(html);
    }

    renderProductGrid(html) {

        var getCollectionListClass = (function() {
            return document.querySelector('#dT_collectionGrid >ul:first-child').getAttribute('class');
        })();
        

        const innerHTML = new DOMParser()
          .parseFromString(html, 'text/html')
          .getElementById('dT_collectionGrid').innerHTML;
    
        document.getElementById('dT_collectionGrid').innerHTML = innerHTML;

        document.querySelector('#dT_collectionGrid >ul:first-child').setAttribute('class', getCollectionListClass);

        //-- post init
        this.postInit();
        
    }

    renderFilters(html, event) {

        const innerHTML = new DOMParser()
          .parseFromString(html, 'text/html')
          .getElementById('dt-collection-filter').innerHTML;
    
        document.getElementById('dt-collection-filter').innerHTML = innerHTML;


    }

    updateURLHash(searchParams) {
        history.pushState({ searchParams }, '', `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`);
    }

    renderCounts(source, target) {
        const countElementSelectors = ['.count-bubble','.facets__selected'];
        countElementSelectors.forEach((selector) => {
          const targetElement = target.querySelector(selector);
          const sourceElement = source.querySelector(selector);
    
          if (sourceElement && targetElement) {
            target.querySelector(selector).outerHTML = source.querySelector(selector).outerHTML;
          }
        });
    }
    
    postInit() {
        document.querySelector('.collection-grid').querySelector('#dT_collectionGrid').classList.remove('loading');
     
      ajaxCart.init({
        formSelector: '[data-product-form]',
        cartContainer: '#CartContainer',
        addToCartSelector: '.dT_AddToCart',
        cartCountSelector: '.CartCount',
        cartCostSelector: '.CartCost',
        moneyFormat: DT_THEME.moneyFormat
      });

        this.bindActiveFacetButtonEvents();
        this.toggleActiveFacets(false);

        if (typeof collectionFilterPostInit === "function") { 
            collectionFilterPostInit();
        }
      
      filterBubble();
      itemSwatchLabel();        
    }
}

// possible need to move form submit into normal class bind event

const dTRenderCollection = function(targetURL, searchParams, event) {
    const filterForm = new CollectionFiltersForm();
    filterForm.renderPage(targetURL, searchParams, event);
};


customElements.define('collection-filters-form', CollectionFiltersForm);



$(document).ready(function(){
  if ($('.horizontal-filter-sidebar').length > 0) {
    console.log("--horizontal-filter-enabled--");
  }
  else {
    var firstPriceBox = $(".price_input_start").val();
    var data =  parseInt(firstPriceBox);
    if (data > 0) {    
      console.log("--vertical-filter-enabled--");
      console.log(data);
      $('[data-index="filter-price-3"]').find('.filter-body').css('display','block');
      $('#CollectionFiltersForm').addClass('clear-show').removeClass('clear-removed');
    }
    else {
      $('#CollectionFiltersForm').removeClass('clear-show').addClass('clear-removed');
    }
  }
});


$('.input_price_range').on('input', function () {
  if($(this).hasClass('price_range_start')) {
    $(".dt_price_input_start").attr('value', $(this).val());   
  }
  if($(this).hasClass('price_range_end')) {
    $(".dt_price_input_end").attr('value', $(this).val());
  }
});





