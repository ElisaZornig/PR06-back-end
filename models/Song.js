import mongoose from 'mongoose';


const songsSchema = new mongoose.Schema({
        artist: {type: String},
        songName: {type: String},
        album: {type: String},
        genre: {type: String}
    },
    {
        toJSON: {
            virtuals: true,
            versionKey: false,
            transform: (doc, ret) => {

                ret._links = {
                    self: {
                        href: `${process.env.SERVICE_URL}${ret._id}`
                    },
                    collection: {
                        href: process.env.SERVICE_URL
                    }
                }

                delete ret._id
            }
        }
    });

const Song = mongoose.model('Songs', songsSchema);

export default Song;