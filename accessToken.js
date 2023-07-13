const mongoose = require('mongoose');

const accessTokenSchema = new mongoose.Schema({
	access_token: {
		type: String,
		required: true
	},
	updatedAt: {
		type: Date,
		default: () => new Date()
	},
	validTill: {
		type: Date,
		default: () => new Date().setUTCHours(2, 0, 0, 0) + (3600 * 1000 * 24)
	}
});

accessTokenSchema.pre("save", function (next) {
	this.updatedAt = new Date();
	this.validTill = new Date().setUTCHours(2, 0, 0, 0) + (3600 * 1000 * 24);
	next()
})

accessTokenSchema.pre("updateOne", function () {
	this.set({ updatedAt: new Date() });
	this.set({ validTill: new Date().setUTCHours(2, 0, 0, 0) + (3600 * 1000 * 24) });
})

module.exports = mongoose.model('AccessToken', accessTokenSchema);