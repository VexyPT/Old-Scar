const { Schema, model } = require('mongoose');

const MemberCountSchema = new Schema({
    guildID: { type: String, required: true },
    date: { type: Date, required: true },
    joins: { type: Number, default: 0 },
    leaves: { type: Number, default: 0 }
});

MemberCountSchema.index({ guildID: 1, date: 1 }, { unique: true });

module.exports = model('MemberCount', MemberCountSchema);