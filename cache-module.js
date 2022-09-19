/**
 * insert this module to nuxt.config.js in modules
 * when caching a nuxt result
 * the cached content should only be content that is distinct from what's in the URL or request headers
 * content that is per user should load in the client side only <no-ssr>
 *     to avoid a situation where one user gets a content that is meant for another user
 */
const url = require('url')

import { getCachedPage, savePageToCache } from '../serverMiddleware/index'
let template = null

module.exports = function cacheRenderer(nuxt, config) {
    nuxt = nuxt && Object.keys(nuxt).length ? nuxt : this.nuxt

    if (!nuxt || !nuxt.renderer) {
        return
    }
    const renderer = nuxt.renderer
    const renderRoute = renderer.renderRoute.bind(renderer)
        /** adding another hook to the nuxt renderer function
         *  in this hook either return a promise with the cached page
         *  or return the original render function with another hook at the end that will save the results to cache
         */

    renderer.renderRoute = async function(route, context) {
        const urlData = url.parse(route, true)

        const requestData = {}
        requestData.Cookies = context.req.headers.cookie
        requestData.Path = urlData.pathname
        requestData.Query = urlData.query

        const cachedContent = await getCachedPage(requestData)

        if (cachedContent && template) {
            const renderedPage = {...template }
            renderedPage.html = cachedContent
            return new Promise(resolve => resolve(renderedPage))
        } else {
            return renderRoute(route, context).then(result => {
                const statusCode = context.res.statusCode
                if (!result.error && !result.redirected && statusCode == 200) {
                    template = {...result }
                    delete template.html
                    savePageToCache(requestData, result)
                }
                return result
            })
        }
    }
}