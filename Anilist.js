const Hyak_Anime = require("../model/Hyak_Anime");
// const Hyak_Anime = require('./data/Hyak_Anime.json')

// Hyakanime status formater
let status_formater = {
    "CURRENT": 1,
    "PLANNING": 2,
    "COMPLETED": 3,
    "FINISHED": 3, // rewatch -> Completed
    "PAUSED": 4,
    "DROPPED": 5,
}

module.exports = async function importAnilist(username, uid) {

    const query = `
        query ($userName: String) {
            MediaListCollection(userName: $userName, type: ANIME) {
                lists {
                    name
                    entries {
                        media {
                            id
                            title {
                                romaji
                                english
                                native
                            }
                            status
                            episodes
                        }
                        status
                        score
                        progress
                    }
                }
            }
        }
    `;

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            query: query,
            variables: { userName: username }
        })
    };

    const response = await fetch('https://graphql.anilist.co', options);
    const data = await response.json();

    if (!data)
        throw new Error('Aucun media trouvé.');

    // Get all information from Anilist progression
    let formated_anilist_progression = []
    data.data.MediaListCollection.lists.forEach((e) => {
        if (['Watching', 'Completed', 'Paused', 'Dropped', 'Planning', 'Rewatching'].includes(e.name)) {
            e.entries.forEach((item) => {
                formated_anilist_progression.push({
                    id: item.media.id,
                    title: item.media.title.english ? item.media.title.english : item.media.title.romaji ? item.media.title.romaji : item.media.title.natif,
                    status: item.status,
                    progression: item.progress,
                    score: item.score
                })
            })
        }
    })

    // Find Hyakanime Anime from Anilist ID (if you use Mongoose)
    let anime_find = await Hyak_Anime.find({ idAnilist: formated_anilist_progression.map(i => { return i.id }) });

    // If you use json file :
    // const anime_find = Hyak_Anime.filter(anime => formated_anilist_progression.map(i => i.id).includes(anime.idAnilist));


    // Create Hyakanime progression and keep title not found
    let finalProgression = [];
    let added_anime = [];
    let missing_anime = [];
    formated_anilist_progression.forEach((e) => {
        if (anime_find.some((element) => element.idAnilist === e.id)) {
            let { id } = anime_find.find((a) => a.idAnilist === e.id);

            finalProgression.push({
                animeID: id,
                progression: e.progression,
                status: status_formater[e.status],
                score: e.score,
                uid: uid
            })
            added_anime.push(e.title)
        }
        else
            missing_anime.push(e.title)
    })

    return { missing_anime, added_anime, finalProgression };
}
