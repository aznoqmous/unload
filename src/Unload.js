export default class Unload extends EventTarget {

    constructor(opts={}) {
        super()
        this.opts = Object.assign({
            prefetch: true,
            store: true
        }, opts)
        this.init()
    }

    init(){
        this.isLoaded = true // first load
        this.loaded().then(()=> {
            this.bind()
            ;(new MutationObserver((mutations, observer)=>{
                this.bind()
            })).observe(document.body, {
                childList: true,
                subtree: true
            })
        })

        this.store = {}
        this.loadPageContent(window.location.pathname)
    }

    load(){
        this.isLoaded = false
        let loaded = this.loaded()
        setTimeout(()=>{
            this.dispatchWindowEvent("DOMContentLoaded")
            this.dispatchWindowEvent("load")
        }, 100)
        return loaded
    }

    loaded(){
        return new Promise(res => {
            let resolve = ()=> {
                document.removeEventListener('DOMContentLoaded', resolve)
                this.isLoaded = true
                res()
            }
            if(document.body && this.isLoaded) return res()
            else document.addEventListener('DOMContentLoaded', resolve)
        })
    }

    bind(){
        let selfLinks = [...document.querySelectorAll('a')]
            .filter(a => a.href)
            .filter(a => (new URL(a.href)).origin == window.location.origin)
        selfLinks.map(a => this.bindLink(a))
    }
    bindLink(a){
        if(a.linked) return;
        if(a.target === "_blank") return;
        if(a.href.split('/').pop().indexOf('.') > -1) return; // dont process files

        a.linked = true
        if(this.opts.prefetch) a.addEventListener('mouseenter', ()=> this.loadPageContent((new URL(a.href)).pathname))
        a.addEventListener('click', (e)=> {
            e.preventDefault()
            this.navigateTo(a.href)
        })
    }

    navigateTo(href){
        this.dispatchEvent(new Event('loading'))

        let url = new URL(href)
        this.href = href

        return this.loadPageContent(url.pathname)
            .then(html => {
                window.history.pushState(this.href, "", this.href)

                let parsed = html.split('</head>')
                let head = parsed[0]
                let body = parsed[1]

                let headElement = document.createElement('div')
                headElement.innerHTML = head
                let bodyElement = document.createElement('div')
                bodyElement.innerHTML = body
                this.newHead = headElement
                this.newBody = bodyElement

                this.dispatchEvent(new Event('unload'))
                this.dispatchWindowEvent("beforeunload")
                this.dispatchWindowEvent("unload")

                this.replaceHead(headElement)
                this.replaceBody(bodyElement)

                if(!this.opts.store) this.store = {}

                return this.load()
                    .then(()=> {
                        window.scrollTo({
                            top: 0
                        })
                        this.bind()
                        this.dispatchEvent(new Event('loaded'))
                    })
            })
    }

    /**
     * Store a page, can be used to lazyload pages on startup
     * @param pathname
     * @returns {Promise<unknown>}
     */
    loadPageContent(pathname, forceReload=false){
        if(forceReload) this.store[pathname] = null
        return new Promise(res => {
            if(!this.store[pathname]) this.store[pathname] = fetch(pathname)
                .then(res => res.text())
                .then(html => {
                    this.store[pathname] = new Promise(resolve => resolve(html))
                    return html
                })
            return this.store[pathname].then(html => res(html))
        })
    }

    replaceHead(newHeaderElement){
        let settings = {
            link: {
                multiple: true,
                keep: true,
                match: (html)=>{
                    let element = this.getElementFromHTML(html)
                    return new URL(html.href).pathname
                }
            }
            ,
            script: {
                multiple: true,
                match: (html)=>{
                    let element = this.getElementFromHTML(html)
                    return new URL(html.href).pathname
                }
            },
            meta: {
                multiple: true
            },
            title: {}
        }
        Object.keys(settings).map(key => {
            let props = settings[key]
            let selector = props.selector || key
            let newElements = []
            let currentElements = []
            if(props.multiple) {
                newElements = [...newHeaderElement.querySelectorAll(selector)]
                currentElements = [...document.head.querySelectorAll(selector)]
            }
            else {
                newElements = [newHeaderElement.querySelector(selector)]
                currentElements = [document.head.querySelector(selector)]
            }
            if(props.match){
                newElements = newElements.map(e => props.match(e))
                currentElements = currentElements.map(e => props.match(e))
            }
            let newElementsHTML = newElements.map(el => el.outerHTML)
            let currentElementsHTML = currentElements.map(el => el.outerHTML)

            let added = []
            newElementsHTML.map((newHTML, i)=>{
                if(props.keep && currentElementsHTML.includes(newHTML)) return;
                document.head.appendChild(newElements[i])
                added.push(newHTML)
            })

            let removed = []
            currentElementsHTML.map((currentHTML, i)=>{
                if(props.keep && newElementsHTML.includes(currentHTML)) return;
                currentElements[i].remove()
                removed.push(currentHTML)
            })

        })
    }
    replaceBody(newBodyElement){
        newBodyElement.getAttributeNames().map(key => {
            let value = newBodyElement.getAttribute(key)
            document.body.setAttribute(key, value)
        })
        document.body.innerHTML = newBodyElement.innerHTML
    }

    dispatchWindowEvent(eventName){
        window.dispatchEvent(new Event(eventName))
        document.dispatchEvent(new Event(eventName))
    }

    getElementFromHTML(html){
        let shadow = document.createElement('div')
        shadow.innerHTML = html
        return shadow.children[0]
    }
}
