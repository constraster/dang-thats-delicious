const axios = require('axios');
import dompurify from 'dompurify';

function searchResultsHTML(stores) {
    return stores.map(store => {
        return `
            <a href="/store/${store.slug}" class="search__result">
                <strong>${store.name}</strong>
            </a>
        `;
    }).join('');
}

function typeAhead(search) {
    if (!search) return;

    const searchInput = search.querySelector('input[name="search"]');
    const searchResults = search.querySelector('.search__results');

    //event listener for search
    searchInput.on('input', function() {
        //quit if no value
        if(!this.value) {
            searchResults.style.display = 'none';
            return; //stop
        }

        //show results
        searchResults.style.display = 'block';
    
        axios
            .get(`/api/search?q=${this.value}`)
            .then(res => {
                if (res.data.length) {
                    //there are results to show
                    searchResults.innerHTML = dompurify.sanitize(searchResultsHTML(res.data));
                    return;
                }
                //show that nothing came back
                searchResults.innerHTML=dompurify.sanitize(`<div class="search__result">
                No results for ${this.value} found</div>`);
            })
            .catch(err => {
                console.error(err);
            });
    });

    //handle keyboard inputs
    searchInput.on('keyup', (e) => {
        // if not up, down, or enter, skip it
        if (![38,40,13].includes(e.keyCode)) {
            return; //skip
        }
        const activeClass = 'search__result--active';
        const current = search.querySelector(`.${activeClass}`);
        const items = search.querySelectorAll('.search__result');
        let next;
        //move down
        if (e.keyCode === 40 && current) {
            next = current.nextElementSibling || items[0];
        } else if (e.keyCode === 40) {
            next = items[0];
        //move up
        } else if (e.keyCode === 38 && current) {
            next = current.previousElementSibling || items[items.length-1];
        } else if (e.keyCode === 38) {
            next = items[items.length-1];
        //enter on current
        } else if (e.keyCode === 13 && current.href) { 
            window.location = current.href;
            return;
        }

        if (current) {
            current.classList.remove(activeClass);
        }
        next.classList.add(activeClass);
    });
};

export default typeAhead;