var Datastore = require('nedb')
    , booksDB = new Datastore({ filename: 'data/catalogdb/books.db', autoload: true });
const CATALOG_SERVER_REPLICA_HOST = 'http://localhost:3001/'
const FRONTEND_SERVER_REPLICA_HOST = 'http://localhost:5000/'

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

exports.index = function (req, res) {
    res.send('NOT IMPLEMENTED: Site Home Page');
};

exports.fetchBooksByTopic = async function (req, res) {
    let books = await getBooksByTopicFromDB(req.params.topicName)

    if (!Array.isArray(books) || !books.length) {
        books = []
    } else {
        books = books.map(getOutResponseBookFromTopicsResponse);
    }

    res.json(books);
};

exports.fetchBookById = async function (req, res) {
    let book = await getBookByIdFromDB(req.params.bookId);

    if(!book) {
        res.status(404).json('No book was found with the passed ID')
    } else {
        res.status(200);
        res.json(getOutResponseBookFromBookByIdResponse(book));
    }

    res.end();
};

exports.updateBookById = async function (req, res) {
    let bookId = req.body.id;

    let errorMessage = validateReceivedRequestBody(req.body);

    if(!!errorMessage) {   /// what mean
        res.status(400).json(errorMessage)
    } else {
        let book = await getBookByIdFromDB(bookId);

        if (!book) { // If don't send book id when want to update
            res.status(404).json('No book was found with the passed ID')
        } else {

            let response = await updateBookDB(book, req.body, req.headers)

            if(response) {
                invalidateFrontendServer(bookId, book.title);
                res.status(200);
                res.json(response);
            } else {
                res.status(400).json('Couldn\'t update the replica')
            }
        }
    }
};

function getOutResponseBookFromTopicsResponse(oldBook) {
    let book = {};

    book.id = oldBook._id;
    book.title = oldBook.title;

    return book;
}

function getOutResponseBookFromBookByIdResponse(oldBook) {
    let book = {};

    book.title = oldBook.title;
    book.quantity = oldBook.quantity;
    book.price = oldBook.price;

    return book;
}

function getBookByIdFromDB(id){
    return new Promise((resolve, reject) => {
        booksDB.findOne({ _id: parseInt(id) }, (err, doc) => {
            err ? reject(err) : resolve(doc);
        });
    });
}

function getBooksByTopicFromDB(topic){
    return new Promise((resolve, reject) => {
        booksDB.find({ topic: topic }, (err, doc) => {
            err ? reject(err) : resolve(doc);
        });
    });
}

function validateReceivedRequestBody(body) {

    if(!body.id) {
        return 'No book ID was passed in the request\'s body'
    } else if (Number.isNaN(body.quantity) || Number.isNaN(body.price)){
        return 'Invalid type for quantity or price field, should be only number'
    }

    return undefined;
}

async function updateBookDB(book, requestBook, headers) {

    await deleteBook(book);

    if (requestBook.quantity >= 0) {
        book.quantity = parseInt(requestBook.quantity);
    }

    if (requestBook.price >= 0) {
        book.price = parseInt(requestBook.price);
    }

    if(!(headers['is-replica-update'] === 'true')) {//If this isn't a normal update from the order server
                                                    // (which means a replica update request) then we don't
                                                    // update the other replica again
                                                    // (to prevent infinite looping)
        let response = await updateReplica(book)

        if(!response) {
            return null
        }
    }

    return new Promise((resolve, reject) => { // to be sure from response arrived and db update -
                                                     // should wait to maje update/delete ...
        booksDB.insert(book, (err, newDoc) => {
            err ? reject(err) : resolve(newDoc);
        });
    });
}

function deleteBook(book){

    return new Promise((resolve, reject) => {
        booksDB.remove({_id: book._id}, (err, newDoc) => {
            err ? reject(err) : resolve(newDoc);
        });
    });
}

async function updateReplica(book) {
    book.id = book._id
    let response = await fetch(CATALOG_SERVER_REPLICA_HOST + 'books', {
        method: 'PUT',
        body: JSON.stringify(book),
        headers: {'Content-Type': 'application/json', 'is-replica-update': 'true'}
    });

    return response.ok
}

async function invalidateFrontendServer(bookId, title) {//Invalidate the caches of the frontend server

    await fetch(FRONTEND_SERVER_REPLICA_HOST + 'invalidateBook/' + bookId, {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'}
    });

    await fetch(FRONTEND_SERVER_REPLICA_HOST + 'invalidateTopic/' + title, {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'}
    });
}