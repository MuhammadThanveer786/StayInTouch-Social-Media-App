import mongoose from 'mongoose';

const connectionRequestSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            required: true
        },

        sender: {
            type: String,
            ref: 'User',
            required: true
        },

        recipient: {
            type: String,
            ref: 'User',
            required: true
        },

        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending'
        }
    },
    {
        timestamps: true
    }
);

const ConnectionRequest = mongoose.model(
    'ConnectionRequest',
    connectionRequestSchema
);

export default ConnectionRequest;