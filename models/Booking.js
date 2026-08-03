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
    carType:{
        type:String,
        enum:['small','large'],
        default:'small'
    },
    fare: {
        type:Number,
        required:true
    },
    status:{
        type:String,
        enum:['Pending','Complete','Cancelled'],
        default:'Pending'
    },
    bookingDate:{
        type:Date,
        default:Date.now
    }

})

module.exports = mongoose.model('Booking',BookingSchema);