const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
	instrument_token: Number,
	timestamp: Date,
	last_trade_time: Date,
	last_price: Number,
	last_quantity: Number,
	buy_quantity: Number,
	sell_quantity: Number,
	volume: Number,
	average_price: Number,
	oi: Number,
	oi_day_high: Number,
	oi_day_low: Number,
	net_change: Number,
	lower_circuit_limit: Number,
	upper_circuit_limit: Number,
	ohlc: {
		open: Number, 
		high: Number, 
		low: Number, 
		close: Number
	}
});

const instrumentSchema = new mongoose.Schema({
	instrument: String,
	data: {
		date: {
			type: Date,
			default: () => new Date().setUTCHours(0, 0, 0, 0)
		},
		quote: [quoteSchema]
	}
});

module.exports = mongoose.model('Instrument', instrumentSchema);