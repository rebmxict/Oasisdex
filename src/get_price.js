const Web3 = require('web3')
const bigInt = require("big-integer");
const Offer = require('./offer')
const BigNumber = require('bignumber.js');
const request = require('request');

const web3 = new Web3("https://mainnet.infura.io/v3/908f2e1ab8584432b784572533dd513a");


const erc20Abi = require('./erc20.abi');

const abi = require('./oasisdex.abi');

const contracts = {
  "OW-ETH": "0x0000000000000000000000000000000000000000",
  "W-ETH": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  "DAI": "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359",
  "SAI": "0x59adcf176ed2f6788a41b8ea4c4904518e62b6a4",
  "MKR": "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2",
  "DGD": "0xe0b7927c4af23765cb51314a0e0521a9645f0e2a",
  "GNT": "0xa74476443119a942de498590fe1f2454d7d4ac0d",
  "W-GNT": "0x01afc37f4f85babc47c0e2d0eababc7fb49793c8",
  "REP": "0xe94327d07fc17907b4db788e5adf2ed424addff6",
  "ICN": "0x888666ca69e0f178ded6d75b5726cee99a87d698",
  "1ST": "0xaf30d2a7e90d7dc361c8c4585e9bb7d2f6f15bc7",
  "SNGLS": "0xaec2e87e0a235266d9c5adc9deb4b2e29b54d009",
  "VSL": "0x5c543e7ae0a1104f78406c340e9c64fd9fce5170",
  "PLU": "0xd8912c10681d8b21fd3742244f44658dba12264e",
  "MLN": "0xbeb9ef514a379b997e0798fdcc901ee474b6d9a1",
  "RHOC": "0x168296bb09e24a88805cb9c33356536b980d3fc5",
  "TIME": "0x6531f133e6deebe7f2dce5a0441aa7ef330b4e53",
  "GUP": "0xf7b098298f7c69fc14610bf71d5e02c60792894c",
  "BAT": "0x0d8775f648430679a709e98d2b0cb6250d2887ef",
  "NMR": "0x1776e1f26f98b1a5df9cd347953a26dd3cb46671"
};

const decimals = {
  "DGD": 9
};

const contract = new web3.eth.Contract(abi, '0x14fbca95be7e99c15cc2996c6c9d841e54b79425');

const erc20Contracts = {};
for (const name in contracts) {
  erc20Contracts[name] = new web3.eth.Contract(erc20Abi, contracts[name]);
}

const MAX_OFFER_COUNT = 1000;

const keypairRegexp = /([^\/]*)\/([^\/]*)/im;

async function getPairAndCheck(pair) {
  let match = pair.match(keypairRegexp);
  if (!match) {
    return false;
  }
  const [_, from, to] = match;
  if (!from || !to || !contracts[from] || !contracts[to]) {
    return false;
  }
  if (await contract.methods.isTokenPairWhitelisted(contracts[from], contracts[to])) {
    const [fromDecimals, toDecimals] = await Promise.all([
      decimals[from] || erc20Contracts[from].methods.decimals().call(),
      decimals[to] || erc20Contracts[to].methods.decimals().call(),
    ]);
    return {
      text: pair,
      from: contracts[from],
      fromText: from,
      fromDecimals: parseInt(fromDecimals),
      to: contracts[to],
      toDecimals: parseInt(toDecimals),
      toText: to,
    }
  }
  return false;
}

function _request(url) {
  return new Promise(function (resolve, reject) {
    request.get({url: url}, function (error, res, body) {
      if (!error && res.statusCode == 200) {
        resolve(body);
      } else {
        reject(error);
      }
    });
  });
}

async function logCheck(pair) {
  let fromBlock = parseInt(JSON.parse(await _request('https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apikey=8HKJXBWBUJN3WQ7XC6FPA6STNXYRPABNM9')).result);
  toBlock = fromBlock;
  fromBlock = Math.max(fromBlock - step, 0);

  let logIds = [];
  let sortedEvents = (await contract.getPastEvents('LogSortedOffer', {fromBlock: fromBlock , toBlock: toBlock, filter: {pair: web3.utils.soliditySha3(pair.to, pair.from)}})).reverse();
  let itemUpdates = (await contract.getPastEvents('LogItemUpdate', {fromBlock: fromBlock , toBlock: toBlock, filter: {pair: web3.utils.soliditySha3(pair.to, pair.from)}})).reverse();

  while (sortedEvents.length <= 20 && toBlock > 0) {
    sortedEvents = sortedEvents.concat((await contract.getPastEvents('LogSortedOffer', {fromBlock: fromBlock , toBlock: toBlock, filter: {pair: web3.utils.soliditySha3(pair.to, pair.from)}})).reverse());
    toBlock = fromBlock;
    fromBlock = Math.max(fromBlock - step, 0);
  }
  sortedEvents = sortedEvents.slice(0, 21);

  fromBlock = parseInt(JSON.parse(await _request('https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apikey=8HKJXBWBUJN3WQ7XC6FPA6STNXYRPABNM9')).result);
  toBlock = fromBlock;
  fromBlock = Math.max(fromBlock - step, 0);
  while (itemUpdates.length <= 20 && toBlock > 0) {
    itemUpdates = itemUpdates.concat((await contract.getPastEvents('LogItemUpdate', {fromBlock: fromBlock , toBlock: toBlock, filter: {pair: web3.utils.soliditySha3(pair.to, pair.from)}})).reverse());
    toBlock = fromBlock;
    fromBlock = Math.max(fromBlock - step, 0);
  }
  itemUpdates = itemUpdates.slice(0, 21);

  sortedEvents.map(se => {
    itemUpdates.map(iu => {
      if(se.id == iu.id) { logIds.push(se.id); }
    });
  });

  return logIds;
}

async function getLastTakedOrder(pair) {
  let fromBlock = parseInt(JSON.parse(await _request('https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apikey=8HKJXBWBUJN3WQ7XC6FPA6STNXYRPABNM9')).result);
  let toBlock = 'latest';
  const step = 50000;
  let events = (await contract.getPastEvents('LogTake', {fromBlock: fromBlock , toBlock: toBlock, filter: {pair: web3.utils.soliditySha3(pair.to, pair.from)}})).reverse();

  toBlock = fromBlock;
  fromBlock = Math.max(fromBlock - step, 0);
  while (events.length <= 20 && toBlock > 0) {
    events = events.concat((await contract.getPastEvents('LogTake', {fromBlock: fromBlock , toBlock: toBlock, filter: {pair: web3.utils.soliditySha3(pair.to, pair.from)}})).reverse());
    toBlock = fromBlock;
    fromBlock = Math.max(fromBlock - step, 0);
  }

  return events.slice(0, 21);
}

async function getAllOfferForPair(pair) {
  const offers = [];
  let [getCount, offerId] = await Promise.all(
    [
      contract.methods.getOfferCount(pair.from, pair.to).call(),
      contract.methods.getBestOffer(pair.from, pair.to).call(),
    ]);
  let bestOffer;
  let i = MAX_OFFER_COUNT;
  while (i > 0) {
    [bestOffer, nextOfferId] = await Promise.all([
      contract.methods.getOffer(offerId).call(),
      contract.methods.getWorseOffer(offerId).call(),
    ]);
    if (bestOffer[0] === '0') {
      break;
    }
    offers.push({
      pay_amt: bestOffer[0],
      buy_amt: bestOffer[2],
      id: offerId
    });

    offerId = nextOfferId;
    i--;
  }
  return offers;
}

function offersToWei(offers, fromDecimals, toDecimals) {
  return offers.map(v => {
    v.buy_amt = bigInt(v.buy_amt).multiply(Math.pow(10, 18 - toDecimals));
    v.pay_amt = bigInt(v.pay_amt).multiply(Math.pow(10, 18 - fromDecimals));
    return v;
  })
}

async function getPrice(pairText) {
  const pair = await getPairAndCheck(pairText);
  if (!pair) {
    return false;
  }

  let offersRaw = await getAllOfferForPair(pair);
  offersRaw = offersRaw.slice(0, 21);
  const offers = offersToWei(offersRaw, pair.fromDecimals, pair.toDecimals);

  for(let i = 0; i < offersRaw.length; i ++) {
    let offerId = offersRaw[i].id;
    let offer = await contract.methods.offers(offerId).call();
    offersRaw[i]['timestamp'] = offer.timestamp;
  }

  return {
    asks: offersRaw.map(o => new Offer(pairText, String(o.pay_amt), String(o.buy_amt), o.timestamp, 'SELL')),
    bids: (await getLastTakedOrder(pair)).map((e) => Offer.createFromTakeEvent(pairText, e)),
  }
}

module.exports = getPrice;