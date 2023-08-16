export default class Unload extends EventTarget {

    constructor(opts = {}) {
        super()
        this.origin = window.location.origin
        this.opts = Object.assign({
            prefetch: true,
            store: true
        }, opts)
        this.init()
    }

    async init() {
        this.isLoaded = true // first load

        await this.loaded()
        this.bind()

        ;(new MutationObserver((mutations, observer) => {
            this.bind()
        })).observe(document.body, {
            childList: true,
            subtree: true
        })

        await this.loadPageContent(window.location.pathname)
    }

    async load() {
        this.isLoaded = false
        const loaded = await this.loaded()
        setTimeout(() => {
            this.dispatchWindowEvent("DOMContentLoaded")
            this.dispatchWindowEvent("load")
        }, 100)
    }

    async loaded() {
        return new Promise(res => {
            const resolve = () => {
                document.removeEventListener('DOMContentLoaded', resolve)
                this.isLoaded = true
                res()
            }
            if (document.body && this.isLoaded) return res()
            else document.addEventListener('DOMContentLoaded', resolve)
        })
    }

    bind(){
        this.bindWindow()
        this.bindLinks()
    }
    bindWindow(){
        if(window._unloadBound) return
        window._unloadBound = true
        window.addEventListener('popstate', (e)=>{
            e.preventDefault()
            this.navigateTo(e.state, false)
        })
    }

    bindLinks() {
        let selfLinks = [...document.querySelectorAll('a')]
            .filter(a => a.href)
            .filter(a => (new URL(a.href)).origin == window.location.origin)
        selfLinks.map(a => this.bindLink(a))
    }

    bindLink(a) {
        if (a.linked) return;
        if (a.target === "_blank") return;
        if (a.href.split('/').pop().indexOf('.') > -1) return; // dont process files

        a.linked = true
        if (this.opts.prefetch) a.addEventListener('mouseenter', () => this.loadPageContent((new URL(a.href)).pathname))
        a.addEventListener('click', (e) => {
            e.preventDefault()
            this.navigateTo(a.href)
        })
    }

    async navigateTo(href, pushState=true) {
        this.dispatchEvent(new UnloadLoadingEvent(this))

        let url = new URL(href)
        this.href = href

        const html = await this.loadPageContent(url.pathname)
        if(pushState) window.history.pushState(this.href, "", this.href)

        let parsed = html.split('</head>')
        let head = parsed[0]
        let body = parsed[1]

        let headElement = document.createElement('div')
        headElement.innerHTML = head
        let bodyElement = document.createElement('div')
        bodyElement.innerHTML = body
        this.newHead = headElement
        this.newBody = bodyElement

        this.dispatchEvent(new UnloadUnloadEvent(this))
        this.dispatchWindowEvent("beforeunload")
        this.dispatchWindowEvent("unload")

        this.replaceHead(headElement)
        this.replaceBody(bodyElement)

        await this.load()
        window.scrollTo({
            top: 0
        })
        this.bindLinks()
        this.dispatchEvent(new UnloadLoadedEvent(this))
    }

    /**
     * Store a page, can be used to lazyload pages on startup
     * @param pathname
     * @param forceReload
     * @returns {Promise<unknown>}
     */
    async loadPageContent(pathname, forceReload = false) {
        let content = this.loadUrl(pathname)
        if(forceReload || !content){
            content = await fetch(pathname).then(res => res.text())
            if(this.opts.store) this.saveUrl(pathname, content)
        }
        return content
    }


    saveUrl(pathname, content){
        localStorage.setItem(`unload_${pathname}`, content)
    }

    loadUrl(pathname){
        return localStorage.getItem(`unload_${pathname}`)
    }

    clearStorage(){
        localStorage.clear()
    }


    replaceHead(newHeaderElement) {
        let settings = {
            link: {
                multiple: true,
                keep: true,
                match: (html) => {
                    let element = this.getElementFromHTML(html)
                    return new URL(html.href).pathname
                }
            }
            ,
            script: {
                multiple: true,
                match: (html) => {
                    let element = this.getElementFromHTML(html)
                    return new URL(html.src).pathname
                }
            },
            meta: {
                multiple: true
            },
            title: {}
        }
        Object
            .keys(settings)
            .map(key => {
                let props = settings[key]
                let selector = props.selector || key
                let newElements = []
                let currentElements = []

                if (props.multiple) {
                    newElements = [...newHeaderElement.querySelectorAll(selector)]
                    currentElements = [...document.head.querySelectorAll(selector)]
                } else {
                    newElements = [newHeaderElement.querySelector(selector)]
                    currentElements = [document.head.querySelector(selector)]
                }

                // TODO : Redo match
                // if (props.match) {
                //     newElements = newElements.map(e => props.match(e))
                //     currentElements = currentElements.map(e => props.match(e))
                // }

                let newElementsHTML = newElements.map(el => el.outerHTML)
                let currentElementsHTML = currentElements.map(el => el.outerHTML)

                let added = []
                newElementsHTML.map((newHTML, i) => {
                    if (props.keep && currentElementsHTML.includes(newHTML)) return;
                    if (!newElements[i]) return;
                    document.head.appendChild(newElements[i])
                    added.push(newHTML)
                })

                let removed = []
                currentElementsHTML.map((currentHTML, i) => {
                    if (props.keep && newElementsHTML.includes(currentHTML)) return;
                    if (!currentElements[i]) return;
                    currentElements[i].remove()
                    removed.push(currentHTML)
                })

            })
    }

    replaceBody(newBodyElement) {
        newBodyElement.getAttributeNames().map(key => {
            let value = newBodyElement.getAttribute(key)
            document.body.setAttribute(key, value)
        })
        document.body.innerHTML = newBodyElement.innerHTML
    }

    dispatchWindowEvent(eventName) {
        window.dispatchEvent(new Event(eventName))
        document.dispatchEvent(new Event(eventName))
    }

    getElementFromHTML(html) {
        let shadow = document.createElement('div')
        shadow.innerHTML = html
        return shadow.children[0]
    }
}


export const UnloadEvents = {
    Loading: "unloadLoading",
    Unload: "unloadUnload",
    Loaded: "unloadLoaded",
}

export class UnloadLoadingEvent extends CustomEvent {
    constructor(unload) {
        super(UnloadEvents.Loading)
        this.unload = unload
    }
}

export class UnloadUnloadEvent extends CustomEvent {
    constructor(unload) {
        super(UnloadEvents.Unload)
        this.unload = unload
    }
}

export class UnloadLoadedEvent extends CustomEvent {
    constructor(unload) {
        super(UnloadEvents.Loaded)
        this.unload = unload
    }
}