module.exports =  class Offer {
  constructor(pair, payAmt, buyAmt, timestamp, side) {
    this.pair = pair;
    this.payAmt = payAmt;
    this.buyAmt = buyAmt;
    this.timestamp = timestamp;
    this.side = side;
  }

  static createFromTakeEvent(pair, event, side) {
    return new Offer(pair, event.returnValues.give_amt, event.returnValues.take_amt, event.returnValues.timestamp, 'BUY');
  }
};