const Hyak_Anime = require("../model/Hyak_Anime");
// const Hyak_Anime = require('./data/Hyak_Anime.json')

let status_formater = {
    "Watching": 1,
    "Plan to Watch": 2,
    "Completed": 3,
    "On-Hold": 4,
    "Dropped": 5,
}

module.exports = async function importMAL(file, uid) {

    // Get all information from MAL progression
    let formated_mal_progression = []
    file.forEach(item => {
        formated_mal_progression.push({
            id: Number(item.series_animedb_id._text),
            title: item.series_title._cdata,
            status: item.my_status._text,
            progression: Number(item.my_watched_episodes._text),
            score: Number(item.my_score._text),
            startDate: item.my_start_date._text === "0000-00-00" ? "" : item.my_start_date._text,
            endDate: item.my_finish_date._text === "0000-00-00" ? "" : item.my_finish_date._text,
            rewatch: Number(item.my_times_watched._text)
        })
    });

    // Find Hyakanime Anime from MAL ID
    let anime_find = await Hyak_Anime.find({ idMAL: formated_mal_progression.map(i => { return i.id }) });

    // If you use json file :
    // const anime_find = Hyak_Anime.filter(anime => formated_mal_progression.map(i => i.id).includes(anime.idMAL));

    // Create Hyakanime progression and keep title not found
    let finalProgression = [];
    let added_anime = [];
    let missing_anime = [];
    formated_mal_progression.forEach((e) => {
        if (anime_find.some((element) => element.idMAL === e.id)) {
            let { id } = anime_find.find((a) => a.idMAL === e.id);

            finalProgression.push({
                animeID: id,
                progression: e.progression,
                status: status_formater[e.status],
                score: e.score,
                uid: uid,
                startDate: e.startDate,
                endDate: e.endDate,
                rewatch: e.rewatch
            })
            added_anime.push(e.title)
        }
        else
            missing_anime.push(e.title)
    })


    return { missing_anime, added_anime, finalProgression };
}
