#!/usr/bin/env node
const argv = require('optimist').argv;
const getPrice = require('./src/get_price');

var sum1=0, sum2=0;

function offerToString(offer) {
  let dec = Math.pow(10, 18);
  const pair = offer.pair.split('/');
  sum1 += parseInt(offer.payAmt/dec);
  sum2 += parseInt(offer.buyAmt/dec);
  return `${String((offer.payAmt/dec/(offer.buyAmt/dec)).toFixed(6)).substring(0, 7)}    ${offer.payAmt/dec}`;
}

function orderToString(order) {
  let side = 'BUY ';
  if(order.side == 'SELL') { side = 'SELL'; }
  return `${order.timestamp}     ${side}     ${order.payAmt/order.buyAmt}`;
}

async function f() {
  let _argv = argv._;
  let quote = String(_argv[0]), base = String(_argv[1]), blockLimit = parseInt(_argv[2]);

  if (!base || !quote || !blockLimit) {
    console.log(`Wrong configuration. Please check again.`);
  }
  else {
    let pair = base + '/' + quote;
    let price = await getPrice(pair);

    console.log(`Bids (${quote + '/' + base}):\nPrice      Volume`);
    price.bids.map(o => {
      console.log(offerToString(o));
    });
    console.log('\n');

    console.log(`asks (${quote + '/' + base}):\nPrice      Volume`);
    price.asks.map(o => {
      console.log(offerToString(o));
    });
    console.log('\n');

    let orders = price.bids.concat(price.asks);
    orders.sort(function(a, b) {
      return a.timestamp - b.timestamp;
    }).reverse().slice(0, 10);

    console.log(`Last Trades (${quote + '/' + base}):`);
    console.log(`Timestamp      Action   Price`);
    orders.map(order => {
      console.log(orderToString(order));
    });
  }
}

f();
