function handleInput(baseURL, inputID) {
    const searchBar = document.querySelector(`#${inputID}-search`);
    let split = searchBar.value.trim().split(' ');
    const search = split[split.length - 1];
    const parentElement = document.querySelector(`#${inputID}-menu`);
    clearDropDown(inputID);
    fetch(`${baseURL}/api/tags?match=${search}`).then(res => res.text()).then(text => {
        let array = JSON.parse(text).returned.results;
        array.sort((a, b) => a.indexOf(search) - b.indexOf(search));
        array.forEach(tag => {
            let listItem = document.createElement("li");
            let link = document.createElement("a");
            link.classList.add("dropdown-item");
            link.href = "#";
            link.onclick = (event) => {
                clearDropDown(inputID);
                let tags = searchBar.value.trim().split(' ');
                tags[tags.length - 1] = tag;
                searchBar.value = `${tags.join(' ')} `;
            };
            link.textContent = tag;
            listItem.appendChild(link);
            parentElement.appendChild(listItem);
        });
    });
}

function clearDropDown(inputID) {
    document.querySelectorAll(`.${inputID}-menuItem`).forEach(element => {
        element.remove();
    });
}