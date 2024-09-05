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

// Transform format date Anilist to Hyakanime
function formatedDate(date) {
    let final_date = ""
    if (date.year) {
        final_date = `${date.year}-01-01T00:00:00.000Z`
        if (date.month && date.day)
            final_date = `${date.year}-${date.month.toString().padStart(2, '0')}-${date.day.toString().padStart(2, '0')}T00:00:00.000Z`
    }

    return final_date
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
                        startedAt {
                            year
                            month
                            day
                        }
			            completedAt {
                            year
                            month
                            day
                        }
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

    if (!data || !data.data.MediaListCollection)
        throw new Error("Aucun media trouvé pour ce nom d'utilisateur.");

    // Get all information from Anilist progression
    let formated_anilist_progression = []
    data.data.MediaListCollection.lists.forEach((e) => {
        if (['Watching', 'Completed', 'Paused', 'Dropped', 'Planning', 'Rewatching'].includes(e.name)) {
            e.entries.forEach((item) => {

                // Change date format
                let iso8601StartDate = item.startedAt ? formatedDate(item.startedAt) : "";
                let iso8601EndDate = item.completedAt ? formatedDate(item.startedAt) : "";

                formated_anilist_progression.push({
                    id: item.media.id,
                    title: item.media.title.english ? item.media.title.english : item.media.title.romaji ? item.media.title.romaji : item.media.title.natif,
                    status: item.status,
                    progression: item.progress,
                    score: item.score,
                    startDate: iso8601StartDate,
                    endDate: iso8601EndDate
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
                uid: uid,
                startDate: e.startDate,
                endDate: e.endDate
            })
            added_anime.push(e.title)
        }
        else
            missing_anime.push(e.title)
    })

    return { missing_anime, added_anime, finalProgression };
}
