module.exports =  class Offer {
  constructor(pair, payAmt, buyAmt, timestamp) {
    this.pair = pair;
    this.payAmt = payAmt;
    this.buyAmt = buyAmt;
    this.timestamp = timestamp;
  }

  static createFromTakeEvent(pair, event) {
    return new Offer(pair, event.returnValues.give_amt, event.returnValues.take_amt, event.returnValues.timestamp);
  }
};