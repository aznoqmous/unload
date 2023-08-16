# Unload

## Install
```bash
npm install aznoqmous/unload
```

## Quickstart
```js
import {Unload} from "unload"

const unload = new Unload({
    /**
     * If enabled, will serve stored data instead of refetching the page
     * Note: pages will only be saved at runtime, not inside browser storage so each reload resets it
     */
    store: true,

    /**
     * Prefetch pages on link hover
     */
    prefetch: true,
})

```

You can preload any page on your site using `loadPageContent(pathname)`  
Note that every already loaded page will not be reloaded by default   
```js
const unload = new Unload()

unload.loadPageContent("/contact")
.then(html => {
    console.log(html) // full html of the /contact page 
})

unload.loadPageContent("/contact", true) // set forceReload to true to force reloading the content of the page
.then(html => {
    console.log(html)
})

```

## Events 
Every Unload events are triggered within navigateTo method aka when a user clicks a link  
- `loading`: Dispatched before getting content on a page
- `unload`: Dispatched before changing `<head>` and `<body>` content, new head and body can be accessed via `event.target.newHead` and `event.target.newBody`
- `loaded`: Dispatched when the content of the page has been replaced and DOMContentLoaded + load events has been fired

```js
// Example: set a "loading" css class on navigation
const unload = new Unload()
unload.addEventListener('unloadLoading', ()=>{
    document.body.classList.add('loading')
})
unload.addEventListener('unloadUnload', (event)=>{
    event.target.newBody.classList.add('loading')
})
unload.addEventListener('loadedLoaded', ()=> {
    document.body.classList.remove('loading')
})

// alternatively you can use the UnloadEvents constant
const unload = new Unload()
unload.addEventListener(UnloadEvents.Loading, ()=>{
    document.body.classList.add('loading')
})
unload.addEventListener(UnloadEvents.Unload, (event)=>{
    event.target.newBody.classList.add('loading')
})
unload.addEventListener(UnloadEvents.Loaded, ()=> {
    document.body.classList.remove('loading')
})
```