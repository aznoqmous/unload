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
        this.getPageContent(window.location.pathname)
    }

    load(){
        this.isLoaded = false
        let loaded = this.loaded()
        setTimeout(()=>{
            document.dispatchEvent(new Event('DOMContentLoaded'))
            document.dispatchEvent(new Event('load'))
            window.dispatchEvent(new Event('DOMContentLoaded'))
            window.dispatchEvent(new Event('load'))
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
        if(this.opts.prefetch) a.addEventListener('mouseenter', ()=> this.getPageContent((new URL(a.href)).pathname))
        a.addEventListener('click', (e)=> {
            e.preventDefault()
            this.navigateTo(a.href)
        })
    }

    navigateTo(href){
        this.onLoading()

        let url = new URL(href)
        this.href = href

        this.getPageContent(url.pathname)
            .then(html => {
                let parsed = html.split('</head>')
                let head = parsed[0]
                let body = parsed[1]

                let headElement = document.createElement('div')
                headElement.innerHTML = head
                let bodyElement = document.createElement('div')
                bodyElement.innerHTML = body

                this.replaceHead(headElement)
                document.body.innerHTML = bodyElement.innerHTML

                if(!this.opts.store) this.store = {}
                
                this.load()
                    .then(()=> {
                        this.onLoaded()
                    })
            })
    }

    getPageContent(pathname){
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
                multiple: true
            },
            script: {
                multiple: true
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
            let added = 0
            let newElementsHTML = newElements.map(el => el.outerHTML)
            let currentElementsHTML = currentElements.map(el => el.outerHTML)
            newElementsHTML.map((newHTML, i)=>{
                if(currentElementsHTML.includes(newHTML)) return;
                document.head.appendChild(newElements[i])
                added++
            })
            let removed = 0
            currentElementsHTML.map((currentHTML, i)=>{
                if(newElementsHTML.includes(currentHTML)) return;
                currentElements[i-removed].remove()
                removed++
            })
        })
    }

    onLoading(){
        this.dispatchEvent(new Event('loading'))
    }
    onLoaded(){
        window.scrollTo({
            top: 0
        })
        window.history.pushState(this.href, "", this.href)
        this.bind()
        this.dispatchEvent(new Event('loaded'))
    }
}
