import Song from "../models/Song.js";
import {Router} from "express";
import {faker} from "@faker-js/faker";

const songsRouter = new Router();

songsRouter.get('/', async (req, res) => {
    try {
        let pagination = {};
        let songs = [];
        let page = 1;
        const search = req.query.search ? req.query.search.trim().toLowerCase() : "";
        const filter = {};
        const isFavorites = req.query.favorites === "true"; // Controleer op favorieten

// Voeg favorietenfilter toe

        if (search) {
            filter.$or = [
                { artist: { $regex: search, $options: "i" } },
                { songName: { $regex: search, $options: "i" } }
            ];
        }
        if (isFavorites) {
            filter.favorite = true; // Filter alleen favoriete nummers
        }



        if (req.query.limit) {
            if(req.query.page){
                page = parseInt(req.query.page, 10);
            }
            const limit = parseInt(req.query.limit, 10);

            // Valideren van pagina en limiet
            if (page < 1 || limit < 1) {
                return res.status(400).json({ error: "Pagina en limiet moeten groter zijn dan 0." });
            }

            const totalItems = await Song.countDocuments(filter); // Telt het totale aantal items in de collectie
            const totalPages = Math.ceil(totalItems / limit);

            // Ophalen van de nummers voor de huidige pagina
            songs = await Song.find(filter)
                .skip((page - 1) * limit) // Overslaan van de juiste hoeveelheid items
                .limit(limit); // Beperken van de items tot de limiet

            pagination = {
                currentPage: page,
                currentItems: limit,
                totalPages: totalPages,
                totalItems: totalItems,
                _links: {
                    first: {
                        page: 1,
                        href: `${process.env.SERVICE_URL}?page=1&limit=${limit}&search=${encodeURIComponent(search)}&favorites=${isFavorites}`
                    },
                    last: {
                        page: totalPages,
                        href: `${process.env.SERVICE_URL}?page=${totalPages}&limit=${limit}&search=${encodeURIComponent(search)}&favorites=${isFavorites}`
                    },
                    previous: page > 1 ? {
                        page: page - 1,
                        href: `${process.env.SERVICE_URL}?page=${page - 1}&limit=${limit}&search=${encodeURIComponent(search)}&favorites=${isFavorites}`
                    } : null,
                    next: page < totalPages ? {
                        page: page + 1,
                        href: `${process.env.SERVICE_URL}?page=${page + 1}&limit=${limit}&search=${encodeURIComponent(search)}&favorites=${isFavorites}`
                    } : null
                }
            };
        } else {
            // Als page of limit niet bestaan
            songs = await Song.find(filter);
            const totalItems = songs.length;

            pagination = {
                currentPage: 1,
                currentItems: totalItems,
                totalPages: 1,
                totalItems: totalItems,
                _links: {
                    first: {
                        page: 1,
                        href: process.env.SERVICE_URL
                    },
                    last: {
                        page: 1,
                        href: process.env.SERVICE_URL
                    },
                    previous: null,
                    next: null
                }
            };
        }

        res.json({
            items: songs,
            _links: {
                self: {
                    href: process.env.SERVICE_URL
                },
                collection: {
                    href: process.env.SERVICE_URL
                }
            },
            pagination: pagination
        });
    } catch (e) {
        res.status(500).json({
            error: e.message
        });
    }
});

songsRouter.options('/', (req, res) => {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.status(204).send();
});

// Voeg een OPTIONS-handler toe voor de specifieke ID-route
songsRouter.options('/:id', (req, res) => {
    res.setHeader('Allow', 'GET, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS, PATCH');
    res.status(204).send(); // OK status zonder body
});
songsRouter.get('/:id', async (req, res) => {
    const id = req.params.id;
    const ifModifiedSince = req.headers['if-modified-since'];

    try {
        const song = await Song.findById(id);
        const lastModified = new Date(song.updatedAt).toUTCString();
        if (ifModifiedSince && new Date(lastModified) <= new Date(ifModifiedSince)) {
            return res.status(304).set('Last-Modified', lastModified).send();
        }
        res.status(200).set('Last-Modified', lastModified).json(song);

        if(!song) {
            res.status(404).json({ message: `Song ${id} not found` });
        }
    } catch (error) {
        console.error('Error fetching song:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

songsRouter.delete('/:id', async (req, res) => {
    const id = req.params.id;

    try {
        const song = await Song.findById(id);

        if (!song) {
            return res.status(404).send({ error: 'Song not found' });
        }

        await song.deleteOne();
        res.status(204).send({ message: 'Song successfully deleted' });
    } catch (error) {
        console.error('Error deleting song:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
});

songsRouter.post('/', async (req, res, next) => {
    const METHOD = req.body.METHOD
    if(METHOD === "SEED"){
        const amount = req.body.amount
        const reset = req.body.reset
        if(reset === "true"){
            await Song.deleteMany({});
        }

        for(let i =0; i < amount; i++){
            let song = new Song({
                artist: faker.music.artist(),
                songName: faker.music.songName(),
                album: faker.music.album(),
                genre: faker.music.genre()
            })
            await song.save()
        }
        res.json({message:"Songs seeded"})
    }else{
        next();
    }
});


songsRouter.post('/', async (req, res) => {
    // Toegang tot de ontvangen gegevens
    const { artist,
        songName,
        album,
        genre } = req.body;

    // Controleer of er lege velden zijn
    if (!artist || !songName || !album || !genre) {
        return res.status(400).send({ error: 'All fields are required' });
    }

    try {
        let song = new Song({
            artist,
            songName,
            album,
            genre
        });

        await song.save();
        res.status(201).json(song);
    } catch (error) {
        console.error('Error creating song:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
});
songsRouter.put('/:id', async (req, res) => {
    const id = req.params.id;
    const { artist,
        songName,
        album,
        genre } = req.body;

    // Controleer of er lege velden zijn
    if (!artist || !songName || !album || !genre) {
        return res.status(400).send({ error: 'All fields are required' });
    }

    try {
        const updatedSong = await Song.findByIdAndUpdate(
            id,
            {
                artist,
                songName,
                album,
                genre
            },{ new: true, runValidators: true } // Opties: retourneer het bijgewerkte document en valideer de invoer
        );

        if (!updatedSong) {
            return res.status(404).send({ error: 'Song not found' });
        }

        res.status(200).json(updatedSong);
    } catch (error) {
        console.error('Error updating song:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
});
songsRouter.patch('/:id', async (req, res) => {
    const id = req.params.id;
    const { artist, songName, album, genre, favorite } = req.body;

    if (!artist && !songName && !album && !genre && !favorite) {
        return res.status(400).send({ error: 'At least one field is required to update' });
    }


    try {
        const updatedSong = await Song.findByIdAndUpdate(
            id,
            {
                $set: {
                    ...(artist && { artist }),
                    ...(songName && { songName }),
                    ...(album && { album }),
                    ...(genre && { genre }),
                    ...(favorite && { favorite })
                }
            },
            { new: true, runValidators: true } // Retourneer het bijgewerkte document en valideer de invoer
        );

        if (!updatedSong) {
            return res.status(404).send({ error: 'Song not found' });
        }

        res.status(200).json(updatedSong);
    } catch (error) {
        console.error('Error updating song:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
});

export default songsRouter;