//jshint esversion:6

require('dotenv').config();
const KiteConnect = require("kiteconnect").KiteConnect;
const KiteTicker = require("kiteconnect").KiteTicker;
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const AccessToken = require("./accessToken");
const Instrument = require("./instrument");
const fs = require("fs");

const app = express();

app.use(bodyParser.urlencoded({extended: true}));

const dbState = [{ value: 0, label: "Disconnected" }, { value: 1, label: "Connected" }, { value: 2, label: "Connecting" }, { value: 3, label: "Disconnecting" }];

mongoose.set("strictQuery", true);
mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true }, function() {
    console.log(dbState.find(f => f.value == Number(mongoose.connection.readyState)).label, "to Database!"); // connected to db
});


// -------------------- Kite Connect --------------------

const kc = new KiteConnect({
	api_key: process.env.API_KEY
});

kc.setSessionExpiryHook(function() {
	console.log("User logged out");
	// process.exit(0);
});

run();

async function run() {
	try {
		const foundAccessToken = await AccessToken.findOne();

		if(!foundAccessToken) {
			const dummyAccessToken = await AccessToken.create({
				access_token: "Dummy"
			});
		}

		if(foundAccessToken && ((foundAccessToken.validTill - Date.now()) > 0)) {
			kc.setAccessToken(foundAccessToken.access_token);
			console.log("Stored Access Token is using!");
		}
		else {
			const response = await kc.generateSession(process.env.REQUEST_TOKEN, process.env.API_SECRET);
			const generatedAccessToken = await AccessToken.updateOne({}, {access_token: response.access_token});
			console.log("New Access Token is generated!");
		}

		kc.setAccessToken("RniylyjWsJFXO1u55248hVyHwxGLfQ51")

		runKite();

	} catch (err) {
		console.log(err.message);
	}
}

async function generate4Expiry() {
	try {
		let newinstruments = [];
		const todayDate = new Date();
		const next4ExpiryDate = new Date().setUTCDate(todayDate.getUTCDate() + 28);
		const nfois = await kc.getInstruments("NFO");
		Object.keys(nfois).forEach(async function(nfoi) {
			if(nfois[nfoi].name === "NIFTY" || nfois[nfoi].name === "BANKNIFTY" || nfois[nfoi].name === "FINNIFTY") {
				if(nfois[nfoi].expiry < next4ExpiryDate) {
					newinstruments.push(nfois[nfoi].tradingsymbol);
					fs.appendFileSync("./reqins.csv", `NFO:${nfois[nfoi].tradingsymbol},`);
				}
			}
		});
		console.log("New Instruments Expiry Updated!");
		return newinstruments;
	} catch (err) {
		console.log(err.message);
		return await generate4Expiry();
	}

	
}

async function runKite() {
	
	try {

		const instruments = await generate4Expiry();
		console.log(`There are totally ${instruments.length} instrument for today`);

		let start = new Date();
		let end = new Date(start).setUTCMinutes(start.getUTCMinutes() + 60);

		let timerID = setInterval(async function() {
			console.log(new Date());

			const quote = await kc.getQuote(instuments);
			Object.keys(quote).forEach(async function(instrument) {

				await Instrument.findOneAndUpdate(
					{ instrument: instrument, "data.date": new Date().setUTCHours(0, 0, 0, 0)},
					{ $push: {"data.quote": [quote[instrument]] } }, 
					{ new: true, upsert: true }
				);

				const csv = `${instrument},${quote[instrument].instrument_token},${new Date().setUTCHours(0, 0, 0, 0)},${quote[instrument].timestamp.getTime()},${quote[instrument].last_trade_time.getTime()},${quote[instrument].last_price},${quote[instrument].last_quantity},${quote[instrument].buy_quantity},${quote[instrument].sell_quantity},${quote[instrument].volume},${quote[instrument].average_price},${quote[instrument].oi},${quote[instrument].oi_day_high},${quote[instrument].oi_day_low},${quote[instrument].net_change},${quote[instrument].lower_circuit_limit},${quote[instrument].upper_circuit_limit},${quote[instrument].ohlc.open},${quote[instrument].ohlc.high},${quote[instrument].ohlc.low},${quote[instrument].ohlc.close}\n`;
				fs.appendFileSync("./data.csv", csv);

			});

			

			if(end - new Date() < 0) {
				clearInterval(timerID);
				console.log("Ended");
			}
		}, 60 * 1000);

		



	} catch (err) {
		console.log(err.message);
	}
}


// -------------------- Kite Ticker --------------------


// var ticker = new KiteTicker({
// 	api_key: process.env.API_KEY,
// 	access_token: accessTokenValue
// });


// ticker.connect();
// ticker.on('ticks', onTicks);
// ticker.on('connect', subscribe);
// ticker.on('disconnect', onDisconnect);
// ticker.on('error', onError);
// ticker.on('close', onClose);
// ticker.on('order_update', onTrade);

// function onTicks(ticks) {
// 	console.log("Ticks", ticks);
// }

// function subscribe() {
// 	var items = [738561];
// 	ticker.subscribe(items);
// 	ticker.setMode(ticker.modeFull, items);
// }

// function onDisconnect(error) {
// 	console.log("Closed connection on disconnect", error);
// }

// function onError(error) {
// 	console.log("Closed connection on error", error);
// }

// function onClose(reason) {
// 	console.log("Closed connection on close", reason);
// }

// function onTrade(order) {
//     console.log("Order update", order);
// }


// -------------------- Express Route --------------------


app.get("/", function(req, res) {

	res.send("Server is Running...");

});

app.listen(process.env.PORT, function() {
    console.log(`Server started on port ${process.env.PORT}!`);
});