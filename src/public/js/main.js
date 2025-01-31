function tagSuggest(baseURL, inputID, multiple) {
    const searchBar = document.querySelector(`#${inputID}-search`);
    let split = searchBar.value.trim().split(' ');
    const search = split[split.length - 1];
    const parentElement = document.querySelector(`#${inputID}-menu`);
    clearDropDown(inputID);
    fetch(`${baseURL}/api/tags?match=${search}`).then(res => res.json()).then(json => {
        let array = json.returned.results;
        array.sort((a, b) => a.indexOf(search) - b.indexOf(search));
        array.forEach(tag => {
            let listItem = document.createElement('li');
            let link = document.createElement('a');
            link.classList.add('dropdown-item');
            listItem.classList.add(`${inputID}-menu-item`);
            link.href = "#";
            link.onclick = (event) => {
                if(multiple) {
                    let tags = searchBar.value.trim().split(' ');
                    tags[tags.length - 1] = tag;
                    searchBar.value = `${tags.join(' ')} `;
                    clearDropDown(inputID);
                    searchBar.focus();
                } else {
                    searchBar.value = tag;
                    searchBar.focus();
                }
            };
            link.textContent = tag;
            listItem.appendChild(link);
            parentElement.appendChild(listItem);
        });
    });
}

function putPostToAPI(baseURL, target, method, handleResults) {
    const formData = new FormData(document.getElementById('script-target'));
    const banner = document.getElementById('banners');
    clearBanners();
    fetch(`${baseURL}${target}`, {
        method: method,
        body: formData
    }).then(response => {
        return response.json();
    }).then(json => {
        json.errors.forEach(str => {
            banner.appendChild(makeBanner('er-color', str));
        });
        json.successes.forEach(str => {
            banner.appendChild(makeBanner('gd-color', str));
        });
        json.messages.forEach(str => {
            banner.appendChild(makeBanner('ms-color', str));
        });
        if(handleResults) {
            handleResults(json.returned);
        }
        if(json.returned) {
            delayRedirect(`${baseURL}/search`, 2500);
        }
    });
}

function getDeleteFromAPI(baseURL, target, method, handleResults) {
    const formData = new FormData(document.getElementById('script-target'));
    const banner = document.getElementById('banners');
    clearBanners();
    let params = new URLSearchParams(formData).toString();
    fetch(`${baseURL}${target}?${params}`, {
        method: method,
        body: formData
    }).then(response => {
        return response.json();
    }).then(json => {
        json.errors.forEach(str => {
            banner.appendChild(makeBanner('er-color', str));
        });
        json.successes.forEach(str => {
            banner.appendChild(makeBanner('gd-color', str));
        });
        json.messages.forEach(str => {
            banner.appendChild(makeBanner('ms-color', str));
        });
        if(handleResults) {
            handleResults(json.returned);
        }
        if(json.returned) {
            delayRedirect(`${baseURL}/search`, 2500);
        }
    });
}

function showHideHL(inputName, lHidden) {
    let select = document.getElementById(`${inputName}A`).value;
    let state = select == 'Color';
    document.getElementById(`${inputName}B-row`).hidden = !state;
    document.getElementById(`${inputName}C-row`).hidden = state && lHidden;
}

function makeBanner(colorClass, message) {
    let item = document.createElement('div');
    item.classList.add('banner');
    item.classList.add('p-3');
    item.classList.add('mb-2');
    item.classList.add('text-center');
    item.classList.add(colorClass);
    item.textContent = message;
    return item;
}

function clearDropDown(inputID) {
    document.querySelectorAll(`.${inputID}-menu-item`).forEach(element => {
        element.remove();
    });
}

function clearBanners() {
    document.querySelectorAll('.banner').forEach(element => {
        element.remove();
    });
}

function delayRedirect(url, delay) {
    console.log('redirecting');
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(window.location.href=url);
        }, delay);
    })
}