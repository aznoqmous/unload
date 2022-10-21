# Unload

## Install
```bash
npm install aznoqmous/unload
```

## Quickstart

```js
import {Unload} from "unload"

new Unload({
    // config
})
```

## Options 
````js
new Unload({
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