const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
    passengerName:{
        type:String,
        required:true
    },
    phoneNumber:{
        type:String,
        required:true
    },
    pickupLocation:{
        type:String,
        required:true
    },
    dropLocation:{
        type:String,
        required:true
    },
    fare: {
        type:Number,
        required:true
    },
    carType: {
        type: String,
        enum: ['small', 'large'],
        default: 'small'
    },
    // The date & time the passenger actually wants to travel.
    // This can be today (immediate ride) or any future date (advance booking).
    rideDateTime: {
        type: Date,
        required: true
    },
    // URL of the passenger's ID photo (stored on Cloudinary) — used by the
    // owner to verify the passenger is real before the ride.
    idPhotoUrl: {
        type: String,
        default: null
    },
    status:{
        type:String,
        enum:['Pending','Complete','Cancelled'],
        default:'Pending'
    },
    // Who cancelled this booking, if it's Cancelled — lets the Owner app
    // hide the status buttons and show a message when the PASSENGER cancels,
    // while leaving buttons intact if the owner cancelled it themselves.
    cancelledBy: {
        type: String,
        enum: ['owner', 'passenger', null],
        default: null
    },
    bookingDate:{
        type:Date,
        default:Date.now
    }

})

module.exports = mongoose.model('Booking',BookingSchema);