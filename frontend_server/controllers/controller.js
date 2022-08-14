const ORDER_SERVER_HOST = 'http://localhost:'
const CATALOG_SERVER_HOST = 'http://localhost:'

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const BOOKS_CACHE = new Map(); //stores books that are retrieved by info/bookId
const TOPICS_CACHE = new Map(); //stores books that are retrieved by search/bookId
const MAX_CACHE_SIZE = 3
let CATALOG_SERVER_BALANCER = true, ORDER_SERVER_BALANCER = true

exports.index = function (req, res) {
    res.send('NOT IMPLEMENTED: Site Home Page');
};

exports.purchaseBook = async function (req, res) {

    let response = await fetch(getOrderServerLoadBalancedHost() + 'purchase/' + req.params.bookId, {
        method: 'POST',
    });

    if (response.ok) {
        res.json("The Book's purchased successfully")
    } else {
        let responseBody = await response.json();
        res.status(400).json(responseBody)
    }
};

exports.fetchBookById = async function (req, res) {
    let bookId = req.params.bookId

    let cachedValue = retrieveCachedValue(bookId, "books")

    if (cachedValue) {
        res.send(cachedValue)
    } else {
        let response = await fetch(getCatalogServerLoadBalancedHost() + 'info/' + bookId);

        if (response.ok) {
            let data = await response.json()
            addItemToCache(bookId, data, "books")
            res.send(data)
        } else {
            res.status(400).json('No book was found with this bookId' + bookId)
        }
    }
};

exports.fetchBooksByTopic = async function (req, res) {

    let topicName = req.params.topicName

    let cachedValue = retrieveCachedValue(topicName, "topics")

    if (cachedValue) {
        res.send(cachedValue)
    } else {
        let response = await fetch(getCatalogServerLoadBalancedHost() + 'search/' + topicName);
        if (response.ok) {
            let data = await response.json()
            addItemToCache(topicName, data, "topics")
            res.json(data)
        } else {
            res.status(400).json('Unable to fetch the books that\'re related to the topic')
        }
    }
};

exports.invalidateTopicsCache = async function (req, res) { //the catalog server informs the frontend server of the changes
                                                            // so that the frontend server should delete the topicName from the map if exists
    deleteItemFromCache(req.params.topicName, "topics")
    res.status(200).json('The cache was invalidated successfully')
};

exports.invalidateBooksCache = async function (req, res) {  //the catalog server informs the frontend server of the changes
                                                            // so that the frontend server should delete the bookId from the map if exists
    deleteItemFromCache(req.params.bookId, "books")
    res.status(200).json('The cache was invalidated successfully')
};

function getCacheSource(cacheSource) {
    if(cacheSource === "topics") {
        return TOPICS_CACHE
    }

    return BOOKS_CACHE
}

function retrieveCachedValue (key, cacheSource) {
    let cache = getCacheSource(cacheSource)

    let cacheElement = cache.get(key)

    if(cacheElement) {  //to support  LRU cache technique, we remove the element from its current location
                        // and append it to the end of the map
        cache.delete(key)//remove from current location
        cache.set(key, cacheElement)//append to the end of the map
    }

    return cacheElement
}

function addItemToCache(key, data, cacheSource) {
    let cache = getCacheSource(cacheSource)

    if(cache.size >= MAX_CACHE_SIZE) {  // LRU Cache, we remove the least used entry which will be the first one,
                                        // we ensure this by always removing the element from the map and add it
                                        // to the last of the cache inside retrieveCachedValue
        cache.delete(cache.keys().next().value)//cache.keys().next() retrieves the first element inside the cache
    }

    cache.set(key, data)//we add the new element to the end of the map
}

function deleteItemFromCache(key, cacheSource) {
    let cache = getCacheSource(cacheSource)
    cache.delete(key)
}

function getCatalogServerLoadBalancedHost() {
    let port;

    if(CATALOG_SERVER_BALANCER) {
        port  = "3000/"
    } else {
        port = "3001/"
    }
    console.log(port);
    CATALOG_SERVER_BALANCER = !CATALOG_SERVER_BALANCER;

    return CATALOG_SERVER_HOST + port;
}

function getOrderServerLoadBalancedHost() {
    let port;

    if(ORDER_SERVER_BALANCER) {
        port  = "4000/"
    } else {
        port = "4001/"
    }
    console.log(port);
    ORDER_SERVER_BALANCER = !ORDER_SERVER_BALANCER;

    return ORDER_SERVER_HOST + port;
}