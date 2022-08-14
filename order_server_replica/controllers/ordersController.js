const HOST = 'http://localhost:3000/'
const ORDER_SERVER_REPLICA_HOST = 'http://localhost:4000/'

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));// fetch lib for http calss

var Datastore = require('nedb')
    , ordersDB = new Datastore({filename: 'data/ordersdb/order.db', autoload: true});

exports.index = function (req, res) {
    res.send('NOT IMPLEMENTED: Site Home Page');
};

async function insertTheOrderToDB(bookId, httpFetchBookResponse) {

    httpFetchBookResponse.bookId = bookId;

    return new Promise((resolve, reject) => {
        ordersDB.insert(httpFetchBookResponse, (err, newDoc) => {
            err ? reject(err) : resolve(newDoc);
        });
    });
}

exports.purchaseBook = async function (req, res) {
    let bookId = req.params.bookId;
    let httpFetchBookResponse = await getBookByIdFromCatalogServer(bookId);

    if (isValidBookResponse(httpFetchBookResponse)) {

        if (httpFetchBookResponse.quantity <= 0) {
            res.status(400).json('No available items at the stock for this book were found')
        } else {
            let isPurchased = purchaseBookHttpCall(bookId, httpFetchBookResponse)

            if (isPurchased) {
                await insertTheOrderToDB(bookId, httpFetchBookResponse);
                updateReplica(httpFetchBookResponse)
                res.send("The book was purchased successfully")
            } else {
                res.status(400).json('Failed to purchase the book from the catalog server')
            }
        }
    } else {
        res.status(400).json('Failed to fetch the book from the catalog server')
    }

    res.end();
};

exports.updateOrder = async function (req, res) {
    let bookId = req.body.id;

    let errorMessage = validateReceivedRequestBody(req.body);

    if(!!errorMessage) {
        res.status(400).json(errorMessage)
    } else {
        await insertTheOrderToDB(bookId, req.body);
    }
};

async function getBookByIdFromCatalogServer(id) {
    let response = await fetch(HOST + 'info/' + id);

    if (response.ok) {
        let data = await response.text()
        return JSON.parse(data)
    }

    return undefined
}

async function purchaseBookHttpCall(bookId, book) {

    book.id = bookId;
    book.quantity = book.quantity - 1;

    let response = await fetch(HOST + 'books', {
        method: 'PUT',
        body: JSON.stringify(book),
        headers: {'Content-Type': 'application/json'}
    });

    return response.ok
}

function isValidBookResponse(book) {

    if (!book || !book.title || Number.isNaN(book.quantity) || Number.isNaN(book.price)) {
        return false
    }

    return true;
}

async function updateReplica(order) {
    let response = await fetch(ORDER_SERVER_REPLICA_HOST + 'orders', {
        method: 'PUT',
        body: JSON.stringify(order),
        headers: {'Content-Type': 'application/json', 'is-replica-update': 'true'}
    });

    return response.ok
}

function validateReceivedRequestBody(body) {

    if(!body.id) {
        return 'No book ID was passed in the request\'s body'
    } else if (Number.isNaN(body.quantity) || Number.isNaN(body.price)){
        return 'Invalid type for quantity or price field, should be only number'
    }

    return undefined;
}