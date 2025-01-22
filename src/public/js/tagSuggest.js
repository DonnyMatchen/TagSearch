function handleInput(baseURL, inputID, multiple) {
    const searchBar = document.querySelector(`#${inputID}-search`);
    let split = searchBar.value.trim().split(' ');
    const search = split[split.length - 1];
    const parentElement = document.querySelector(`#${inputID}-menu`);
    clearDropDown(inputID);
    fetch(`${baseURL}/api/tags?match=${search}`).then(res => res.text()).then(text => {
        let array = JSON.parse(text).returned.results;
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

function clearDropDown(inputID) {
    document.querySelectorAll(`.${inputID}-menu-item`).forEach(element => {
        element.remove();
    });
}