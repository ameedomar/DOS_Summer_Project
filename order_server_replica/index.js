var express = require("express");
const order_controller = require("./controllers/ordersController");
var app = express();
var bodyParser = require('body-parser')

// create application/json parser
var jsonParser = bodyParser.json()


app.listen(4001, () => {
    console.log("Server running on port 4001");
});

app.post("/purchase/:bookId", order_controller.purchaseBook)

app.put("/orders", jsonParser, order_controller.updateOrder)